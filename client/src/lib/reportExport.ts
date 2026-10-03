import { modules } from '@/data/criteria';
import type { Criterion, Profile } from '@/data/criteria';
import type { Answers, Answer, ReviewReason } from '@/lib/scoring';
import { effectiveStatus, remediationLabel, reviewReasonText, statusLabel } from '@/lib/scoring';
import { businessDate } from './businessDate';
import { A04_CONTROL_SET_VERSION, evaluateA04Rule } from '@/data/a04Controls';
import { emptyA04Details } from '@/data/a04Types';

export type ScoreSnapshot = {
  active: Criterion[];
  domestic: Criterion[];
  supplemental: Criterion[];
  recommended: Criterion[];
  counted: Criterion[];
  completion: number;
  suggestedCompletion: number;
  level: string;
  criticalGaps: Criterion[];
  hardGaps: Criterion[];
  findings: Criterion[];
  suggestedFindings: Criterion[];
  supplementalFindings: Criterion[];
  remediationOpen: Criterion[];
  reviewReasons: ReviewReason[];
};

export type ReportExportInput = { profile: Profile; current: ScoreSnapshot; forward: ScoreSnapshot; answers: Answers };
export const wordDetailHeaders = ['条款', '模块/口径', '来源与强度', '对象、适用与要求', '实测、依据与证据/子断言', '结论/复核', '整改与关闭'];
const cleanFilePart = (value: string) => (value || '未命名单位').replace(/[\\/:*?"<>|\s]+/g, '-').slice(0, 45);
const fileBase = (profile: Profile) => `内保合规审核报告-${cleanFilePart(profile.name)}-${profile.reviewDate || businessDate()}`;
const answerOf = (answers: Answers, id: string): Answer => answers[id] ?? { status: 'unreviewed', evidence: '', owner: '', due: '', action: '', note: '', remediationStatus: 'pending', a04: emptyA04Details() };
const basisText = (criterion: Criterion) => criterion.basis.map(basis => `${basis.source} ${basis.clause}${basis.note ? `（${basis.note}）` : ''}`).join('；');
const sourceType = (criterion: Criterion) => criterion.controlMeta?.originCategory === 'international_method_supplement' ? '国际方法补充｜非中国法定义务' : criterion.controlMeta ? '中国法规/标准依据' : '既有标准审核项';
const controlStrength = (criterion: Criterion, profile: Profile) => criterion.scoreContribution === 'supplemental' ? '不计国内合规分' : criterion.recommendation?.(profile) ? '建议项（宜）' : '强制合规项（应/其他）';
const assertionText = (answer: Answer) => answer.a04.subAssertions.length ? answer.a04.subAssertions.map(item => `${item.label || item.id}：${statusLabel[item.status]}；证据=${item.evidence || '未填'}；整改=${item.remediation || '未填'}`).join('\n') : '未设置子断言';
const sourceAssessmentText = (answer: Answer) => answer.a04.sourceAssessments.length ? answer.a04.sourceAssessments.map(item => `${item.sourceId} ${item.clause}：${item.applicability}；结论=${statusLabel[item.conclusion]}；理由=${item.rationale || '未填'}；证据=${item.evidence || '未填'}`).join('\n') : '未逐来源确认';
export const reviewSummary = (reasons: ReviewReason[]) => reasons.length ? reasons.map(reviewReasonText).join('\n') : '无';
export const reviewReasonRows = (reasons: ReviewReason[]) => reasons.map(reason => ({ 复核代码: reason.code, 复核主题: reason.title, 复核说明: reason.detail, 相关审核项: reason.criterionIds?.join('、') ?? '—' }));

export const reportDetailRows = ({ profile, current, forward, answers }: ReportExportInput) => {
  const currentIds = new Set(current.active.map(criterion => criterion.id));
  return forward.active.map(criterion => {
    const answer = answerOf(answers, criterion.id);
    const rule = evaluateA04Rule(criterion, profile, answer.a04);
    const meta = criterion.controlMeta;
    const conclusion = effectiveStatus(criterion, answer, profile);
    return {
      条款编号: criterion.id,
      控制集版本: meta?.controlSetVersion ?? '既有标准库',
      模块: modules.find(module => module.id === criterion.module)?.label ?? criterion.module,
      口径: criterion.scoreContribution === 'supplemental' ? '国际补充/效能观察' : currentIds.has(criterion.id) ? (meta ? '国内现行基线' : '现行基线') : '前瞻参考',
      来源类别: sourceType(criterion),
      来源标签: meta?.uiBadge ?? '标准审核项',
      评分属性: controlStrength(criterion, profile),
      审核项目: criterion.title,
      审核要求: criterion.prompt,
      适用条件: meta?.applicability ?? '按单位画像和条款适用范围核验',
      对象或空间点位: answer.a04.objectLocation,
      适用或排除理由: answer.a04.applicabilityReason,
      来源适用说明: answer.a04.sourceApplicability,
      逐来源适用性: sourceAssessmentText(answer),
      依据: basisText(criterion),
      结构化规则: meta?.structuredRule ? JSON.stringify(meta.structuredRule) : '—',
      实测值: answer.a04.measuredValue,
      实测单位: answer.a04.measuredUnit,
      结构化判定: rule?.message ?? '人工证据与子断言核验',
      权重: criterion.weight,
      关键项: criterion.critical ? '是' : '否',
      结论: statusLabel[conclusion],
      证据编号或位置: answer.evidence,
      子断言: assertionText(answer),
      不适用理由: answer.note || answer.a04.naBasis,
      待专家或人工复核原因: answer.a04.reviewReason,
      整改负责人: answer.owner,
      整改期限: answer.due,
      整改期限来源: answer.a04.deadlineSource,
      整改期间临时防范: answer.a04.temporaryProtection,
      整改状态: remediationLabel[answer.remediationStatus],
      整改措施: answer.action,
      复核证据: answer.a04.verificationEvidence,
      复核人员: answer.a04.verifier,
      复核日期: answer.a04.verifiedAt,
      关闭日期: answer.a04.closedAt,
      国内关联控制: meta?.domesticAnchors.join('、') ?? '',
      补充原因: meta?.supplementReason ?? '',
    };
  });
};

export const wordDetailCells = (row: ReturnType<typeof reportDetailRows>[number]) => [
  row.条款编号,
  `${row.模块}\n${row.口径}\n${row.控制集版本}`,
  `${row.来源类别}\n${row.来源标签}\n${row.评分属性}\n依据：${row.依据}`,
  `${row.审核项目}\n要求：${row.审核要求}\n适用条件：${row.适用条件}\n点位：${row.对象或空间点位 || '未填写'}\n适用理由：${row.适用或排除理由 || '未填写'}\n来源适用：${row.来源适用说明 || '未填写'}\n逐来源：${row.逐来源适用性}`,
  `规则：${row.结构化判定}\n实测：${row.实测值 || '未填'} ${row.实测单位 || ''}\n证据：${row.证据编号或位置 || '未填写'}\n子断言：${row.子断言}`,
  `${row.结论}\n不适用：${row.不适用理由 || '—'}\n待复核：${row.待专家或人工复核原因 || '—'}\n复核：${row.复核人员 || '未填'} ${row.复核日期 || ''}\n复核证据：${row.复核证据 || '未填'}`,
  `负责人：${row.整改负责人 || '待指定'}\n期限：${row.整改期限 || '待定'}\n期限来源：${row.整改期限来源 || '未填'}\n临时防范：${row.整改期间临时防范 || '未填写'}\n状态：${row.整改状态}\n措施：${row.整改措施 || '未填写'}\n关闭日期：${row.关闭日期 || '—'}`,
];
const saveBlob = (blob: Blob, filename: string) => { const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; anchor.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000); };

export async function exportExcelReport(input: ReportExportInput) {
  const XLSX = await import('xlsx');
  const { profile, current, forward } = input;
  const scope = profile.a04?.scopeApproved ? '已确认' : '待业务/法务/专业确认';
  const summary = [
    ['单位内部治安保卫合规审核报告'], ['控制集版本', A04_CONTROL_SET_VERSION], ['单位名称', profile.name || '未命名单位'], ['所属地区', profile.region || '未填写'], ['单位类型', profile.unitType], ['所属行业', profile.industry || '未填写'], ['重点单位审核采用的防范级别', profile.keyCandidate ? profile.keyProtectionLevel : '不适用（非重点单位画像）'], ['A04国内控制适用范围', scope], ['审核日期', profile.reviewDate || '未填写'], ['审核人', profile.reviewer || '未填写'], [], ['国内现行基线完成率', `${current.completion}%`], ['建议项（宜）得分', `${current.suggestedCompletion}%`], ['风险等级', current.level], ['国内适用项目', current.counted.length], ['独立硬性缺口', current.hardGaps.length], ['现行关键缺口', current.criticalGaps.length], ['建议改进', current.suggestedFindings.length], ['国际补充效能问题', current.supplementalFindings.length], ['待整改项目（未关闭）', current.remediationOpen.length], ['需人工复核', current.reviewReasons.length ? '是' : '否'], ['人工复核原因概览', reviewSummary(current.reviewReasons)], [], ['说明', '本报告为内部自查辅助，不等同于法定合格证明。国际方法补充不计国内合规分；范围待核、等级待定、未审核原子控制或未覆盖细则时，不得表述为完整合规。'],
  ];
  const workbook = XLSX.utils.book_new();
  const summarySheet = XLSX.utils.aoa_to_sheet(summary); summarySheet['!cols'] = [{ wch: 28 }, { wch: 108 }];
  const detailSheet = XLSX.utils.json_to_sheet(reportDetailRows(input));
  detailSheet['!cols'] = Array.from({ length: 34 }, (_, index) => ({ wch: [14, 17, 22, 26, 30, 25, 21, 28, 45, 40, 26, 28, 30, 48, 26, 14, 42, 8, 8, 12, 34, 50, 30, 22, 14, 25, 15, 36, 24, 20, 15, 15, 28, 36][index] ?? 24 }));
  const reviewSheet = XLSX.utils.json_to_sheet(reviewReasonRows(current.reviewReasons));
  XLSX.utils.book_append_sheet(workbook, summarySheet, '报告摘要'); XLSX.utils.book_append_sheet(workbook, detailSheet, '逐项检查结果'); XLSX.utils.book_append_sheet(workbook, reviewSheet, '人工复核明细');
  const binary = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  saveBlob(new Blob([binary], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${fileBase(profile)}.xlsx`);
}

export async function exportWordReport(input: ReportExportInput) {
  const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, HeadingLevel, WidthType, AlignmentType } = await import('docx');
  const { profile, current, forward } = input;
  const rows = reportDetailRows(input);
  const cell = (text: string, bold = false) => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(text || '—'), bold, size: 16 })] })] });
  const header = (label: string) => new TableCell({ shading: { fill: '173A5B' }, children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, color: 'FFFFFF', size: 16 })] })] });
  const detailTable = new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [new TableRow({ children: wordDetailHeaders.map(header) }), ...rows.map(row => new TableRow({ children: wordDetailCells(row).map(value => cell(value)) }))] });
  const reviewParagraphs = current.reviewReasons.length ? current.reviewReasons.map(reason => new Paragraph({ text: `• ${reviewReasonText(reason)}${reason.criterionIds?.length ? `（相关项目：${reason.criterionIds.join('、')}）` : ''}` })) : [new Paragraph({ text: '无。' })];
  const doc = new Document({ sections: [{ children: [
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '单位内部治安保卫合规审核报告', bold: true, size: 32, color: '173A5B' })] }), new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `DB11/T 2552—2026 全标准审核工作台｜A04控制集 ${A04_CONTROL_SET_VERSION}`, size: 20, color: '718096' })] }), new Paragraph({ text: '' }),
    new Paragraph({ heading: HeadingLevel.HEADING_1, text: '一、单位画像与审核范围' }), new Paragraph({ children: [new TextRun({ text: `单位名称：${profile.name || '未命名单位'}\n` }), new TextRun({ text: `地区：${profile.region || '未填写'}　单位类型：${profile.unitType}\n` }), new TextRun({ text: `行业：${profile.industry || '未填写'}　重点单位审核采用的防范级别：${profile.keyCandidate ? profile.keyProtectionLevel : '不适用'}\n` }), new TextRun({ text: `A04国内控制适用范围：${profile.a04?.scopeApproved ? '已确认' : '待业务/法务/专业确认'}　审核日期：${profile.reviewDate || '未填写'}　审核人：${profile.reviewer || '未填写'}` })] }),
    new Paragraph({ heading: HeadingLevel.HEADING_1, text: '二、审核摘要' }), new Paragraph({ children: [new TextRun({ text: `国内现行基线完成率：${current.completion}%　建议项（宜）得分：${current.suggestedCompletion}%　风险等级：${current.level}\n` }), new TextRun({ text: `国内适用项目：${current.counted.length}　独立硬性缺口：${current.hardGaps.length}　关键缺口：${current.criticalGaps.length}　建议改进：${current.suggestedFindings.length}　国际补充问题：${current.supplementalFindings.length}　待整改：${current.remediationOpen.length}` })] }),
    new Paragraph({ heading: HeadingLevel.HEADING_1, text: '三、人工复核与使用限制' }), ...reviewParagraphs,
    new Paragraph({ heading: HeadingLevel.HEADING_1, text: '四、逐项审核与整改明细' }), detailTable, new Paragraph({ text: '' }),
    new Paragraph({ heading: HeadingLevel.HEADING_1, text: '五、依据与说明' }), new Paragraph({ text: '本报告以中国法律、行政法规、规章和标准为国内合规主线。国际方法补充明确标注为“国际方法补充｜非中国法定义务”，其问题不计入国内合规分、分母、关键缺口或国内风险结论。未覆盖的外部标准细则、范围待核与专家待确认事项均不构成完整合规证明。' }), new Paragraph({ text: '本报告为内部自查辅助，不等同于公安机关、主管部门或其他监管机构的法定合格证明。证据索引、对象点位、实测值、子断言、负责人、期限、整改状态、复核和关闭信息均来自本机审核档案。' }),
  ] }] });
  const blob = await Packer.toBlob(doc); saveBlob(blob, `${fileBase(profile)}.docx`);
}
