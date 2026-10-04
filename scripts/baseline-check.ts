import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { criteria, modules } from '../client/src/data/criteria.ts';
import { createAuditProfile } from '../client/src/lib/profile.ts';
import { canCloseRemediation, effectiveStatus, emptyAnswer, score } from '../client/src/lib/scoring.ts';
import {
  createBlankAnswers,
  downloadJson,
  normalizeAuditState,
  type AuditState,
} from '../client/src/lib/storage.ts';
import { exportExcelReport, exportWordReport, reportDetailRows } from '../client/src/lib/reportExport.ts';

type Download = { filename: string; blob: Blob };
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const samplePath = resolve(projectRoot, 'baseline/sample.json');
const expectedPath = resolve(projectRoot, 'baseline/expected.json');
const reviewedStatuses = new Set(['compliant', 'partial', 'noncompliant', 'na']);

const canonical = (value: unknown) => JSON.parse(JSON.stringify(value));
const keys = (value: object) => Object.keys(value).sort();
const sha256 = (text: string) => createHash('sha256').update(text).digest('hex');

async function captureDownloads(action: () => Promise<void> | void): Promise<Download[]> {
  const downloads: Download[] = [];
  const blobs = new Map<string, Blob>();
  const urlApi = URL as unknown as {
    createObjectURL: (blob: Blob) => string;
    revokeObjectURL: (url: string) => void;
  };
  const originalCreate = urlApi.createObjectURL;
  const originalRevoke = urlApi.revokeObjectURL;
  const globalRecord = globalThis as unknown as Record<string, unknown>;
  const originalDocument = globalRecord.document;
  const originalWindow = globalRecord.window;
  let sequence = 0;

  urlApi.createObjectURL = (blob: Blob) => {
    const url = `blob:baseline-${++sequence}`;
    blobs.set(url, blob);
    return url;
  };
  urlApi.revokeObjectURL = () => undefined;
  globalRecord.document = {
    createElement: (tag: string) => {
      assert.equal(tag, 'a', '导出实现应通过 a 元素触发下载');
      const anchor: { href: string; download: string; click: () => void } = {
        href: '',
        download: '',
        click: () => {
          const blob = blobs.get(anchor.href);
          assert.ok(blob, `未捕获下载 Blob：${anchor.href}`);
          downloads.push({ filename: anchor.download, blob });
        },
      };
      return anchor;
    },
  };
  globalRecord.window = { setTimeout: () => 0 };

  try {
    await action();
    return downloads;
  } finally {
    urlApi.createObjectURL = originalCreate;
    urlApi.revokeObjectURL = originalRevoke;
    if (originalDocument === undefined) delete globalRecord.document;
    else globalRecord.document = originalDocument;
    if (originalWindow === undefined) delete globalRecord.window;
    else globalRecord.window = originalWindow;
  }
}

const zipSignature = async (blob: Blob) => {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  return bytes.length > 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
};

async function main() {
  const [sampleText, expectedText] = await Promise.all([readFile(samplePath, 'utf8'), readFile(expectedPath, 'utf8')]);
  const rawSample = JSON.parse(sampleText);
  const expected = JSON.parse(expectedText);
  assert.equal(sha256(sampleText), expected.sampleSha256, 'sample.json 哈希与改版前预期不一致');

  // 导入：调用产品现有的规范化/兼容迁移入口，不另建解析器。
  const state = normalizeAuditState(rawSample, createAuditProfile(), createBlankAnswers(criteria));
  const current = score(criteria, state.answers, state.profile, false);
  const forward = score(criteria, state.answers, state.profile, true);
  const assessment = forward.active.filter(criterion => state.profile.a04?.showSupplemental || criterion.scoreContribution !== 'supplemental');
  const moduleProgress = Object.fromEntries(modules.map(module => {
    const items = current.domestic.filter(criterion => criterion.module === module.id);
    const reviewed = items.filter(criterion => reviewedStatuses.has(state.answers[criterion.id]?.status)).length;
    return [module.id, { total: items.length, reviewed, percent: items.length ? Math.round(reviewed / items.length * 100) : 0 }];
  }));
  const remediationFindings = forward.active.filter(criterion => ['partial', 'noncompliant'].includes(effectiveStatus(criterion, state.answers[criterion.id] ?? emptyAnswer(), state.profile)));
  const remediationOutstanding = remediationFindings.filter(criterion => {
    const answer = state.answers[criterion.id] ?? emptyAnswer();
    return answer.remediationStatus !== 'closed' || !canCloseRemediation(answer);
  });
  const reportRows = reportDetailRows({ profile: state.profile, current, forward, answers: state.answers });

  const metrics = {
    schemaVersion: state.version,
    controlSetVersion: state.controlSetVersion,
    dashboard: {
      completion: current.completion,
      level: current.level,
      domesticApplicable: current.domestic.length,
      scoreApplicable: current.counted.length,
      reviewed: current.counted.filter(criterion => reviewedStatuses.has(state.answers[criterion.id]?.status)).length,
      criticalGaps: current.criticalGaps.length,
      remediationBadge: current.remediationOpen.length,
      suggestedCompletion: current.suggestedCompletion,
      recommended: current.recommended.length,
      moduleProgress,
    },
    assessment: {
      applicable: assessment.length,
      modules: Object.fromEntries(modules.map(module => [module.id, assessment.filter(criterion => criterion.module === module.id).length])),
    },
    remediation: {
      findings: remediationFindings.length,
      outstanding: remediationOutstanding.length,
      sidebarBadge: current.remediationOpen.length,
    },
    report: {
      domesticApplicable: current.counted.length,
      completion: current.completion,
      criticalGaps: current.criticalGaps.length,
      remediationOpen: current.remediationOpen.length,
      exceptions: reportRows.filter(row => ['部分符合', '不符合', '不适用'].includes(row.结论)).length,
      reviewCodes: current.reviewReasons.map(reason => reason.code),
    },
    sample: {
      answers: Object.keys(state.answers).length,
      statusCounts: Object.values(state.answers).reduce<Record<string, number>>((counts, answer) => {
        counts[answer.status] = (counts[answer.status] ?? 0) + 1;
        return counts;
      }, {}),
      missingNaReasonIds: current.missingNaReason.map(criterion => criterion.id),
      remediationIds: current.remediationOpen.map(criterion => criterion.id),
    },
  };
  const expectedMetrics = { ...expected };
  delete expectedMetrics.sampleSha256;
  delete expectedMetrics.jsonExport;
  assert.deepEqual(metrics, expectedMetrics, '页面关键数值或审核统计与改版前基线不一致');

  // 导出：用产品原下载函数捕获内存 Blob，确认 JSON 精确往返及 Word/Excel 实际可生成。
  let exportedJson: unknown;
  const downloads = await captureDownloads(async () => {
    downloadJson(state as AuditState);
    await exportWordReport({ profile: state.profile, current, forward, answers: state.answers });
    await exportExcelReport({ profile: state.profile, current, forward, answers: state.answers });
  });
  assert.equal(downloads.length, 3, '应产生 JSON、Word、Excel 三个导出文件');
  const jsonDownload = downloads.find(download => download.filename.endsWith('.json'));
  const wordDownload = downloads.find(download => download.filename.endsWith('.docx'));
  const excelDownload = downloads.find(download => download.filename.endsWith('.xlsx'));
  assert.ok(jsonDownload && wordDownload && excelDownload, 'JSON、Word、Excel 导出文件必须齐全');
  exportedJson = JSON.parse(await jsonDownload.blob.text());
  assert.deepEqual(canonical(exportedJson), canonical(rawSample), '导出的 JSON 未与改版前 sample.json 精确往返');

  const jsonRecord = exportedJson as Record<string, unknown>;
  const answers = jsonRecord.answers as Record<string, Record<string, unknown>>;
  const firstAnswer = answers['G-01'];
  const controlMetadata = jsonRecord.controlMetadata as Record<string, unknown>[];
  const jsonShape = {
    rootKeys: keys(jsonRecord),
    profileKeys: keys(jsonRecord.profile as object),
    a04ProfileKeys: keys((jsonRecord.profile as { a04: object }).a04),
    answerCount: Object.keys(answers).length,
    answerKeys: keys(firstAnswer),
    a04AnswerKeys: keys(firstAnswer.a04 as object),
    controlMetadataCount: controlMetadata.length,
    controlMetadataKeys: keys(controlMetadata[0]),
    sourceRequirementKeys: keys((controlMetadata[0].sourceRequirements as object[])[0]),
  };
  assert.deepEqual(jsonShape, expected.jsonExport, 'JSON 导出结构与改版前基线不一致');
  assert.ok(wordDownload.blob.size > 1024 && await zipSignature(wordDownload.blob), 'Word 导出未生成有效 DOCX 文件');
  assert.ok(excelDownload.blob.size > 1024 && await zipSignature(excelDownload.blob), 'Excel 导出未生成有效 XLSX 文件');

  console.log('基线回归通过');
  console.log(`- 总览：完成率 ${metrics.dashboard.completion}%；国内适用 ${metrics.dashboard.domesticApplicable}；计分分母 ${metrics.dashboard.scoreApplicable}；关键缺口 ${metrics.dashboard.criticalGaps}；整改角标 ${metrics.dashboard.remediationBadge}`);
  console.log(`- 审核页：${metrics.assessment.applicable} 个适用项目；责任制 ${metrics.assessment.modules.governance} 项`);
  console.log(`- 报告：国内适用 ${metrics.report.domesticApplicable}；异常行 ${metrics.report.exceptions}；人工复核 ${metrics.report.reviewCodes.join('、')}`);
  console.log(`- 导出：JSON 精确往返；Word ${wordDownload.blob.size} bytes；Excel ${excelDownload.blob.size} bytes`);
}

void main().catch(error => {
  console.error('基线回归失败');
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});
