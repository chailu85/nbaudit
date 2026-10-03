import { modules } from '@/data/criteria';
import type { Criterion, Profile } from '@/data/criteria';
import type { Answers, Answer, ReviewReason } from '@/lib/scoring';
import { remediationLabel, reviewReasonText, statusLabel } from '@/lib/scoring';
import { businessDate } from './businessDate';

type ScoreSnapshot = {
  active: Criterion[];
  recommended: Criterion[];
  counted: Criterion[];
  completion: number;
  suggestedCompletion: number;
  level: string;
  criticalGaps: Criterion[];
  findings: Criterion[];
  remediationOpen: Criterion[];
  reviewReasons: ReviewReason[];
};

export type ReportExportInput = {
  profile: Profile;
  current: ScoreSnapshot;
  forward: ScoreSnapshot;
  answers: Answers;
};

export const wordDetailHeaders = ['条款', '模块', '口径', '审核项目、要求、依据与证据', '结论/整改状态', '负责人/期限', '整改措施与不适用理由'];

const cleanFilePart = (value: string) => (value || '未命名单位').replace(/[\\/:*?"<>|\s]+/g, '-').slice(0, 45);
const fileBase = (profile: Profile) => `内保合规审核报告-${cleanFilePart(profile.name)}-${profile.reviewDate || businessDate()}`;
const answerOf = (answers: Answers, id: string): Answer => answers[id] ?? { status: 'unreviewed', evidence: '', owner: '', due: '', action: '', note: '', remediationStatus: 'pending' };
const basisText = (criterion: Criterion) => criterion.basis.map(basis => `${basis.source} ${basis.clause}`).join('；');
export const reviewSummary = (reasons: ReviewReason[]) => reasons.length ? reasons.map(reviewReasonText).join('\n') : '无';
export const reviewReasonRows = (reasons: ReviewReason[]) => reasons.map(reason => ({
  复核代码: reason.code,
  复核主题: reason.title,
  复核说明: reason.detail,
  相关审核项: reason.criterionIds?.join('、') ?? '—',
}));

export const reportDetailRows = ({ current, forward, answers }: ReportExportInput) => {
  const currentIds = new Set(current.active.map(criterion => criterion.id));
  const recommendedIds = new Set(current.recommended.map(criterion => criterion.id));
  return forward.active.map(criterion => {
    const answer = answerOf(answers, criterion.id);
    return {
      条款编号: criterion.id,
      模块: modules.find(module => module.id === criterion.module)?.label ?? criterion.module,
      审核项目: criterion.title,
      审核要求: criterion.prompt,
      口径: currentIds.has(criterion.id) ? '现行基线' : '前瞻参考',
      评分属性: recommendedIds.has(criterion.id) ? '建议项（宜）' : '强制合规项（应/其他）',
      依据: basisText(criterion),
      权重: criterion.weight,
      关键项: criterion.critical ? '是' : '否',
      结论: statusLabel[answer.status],
      证据编号或位置: answer.evidence,
      整改负责人: answer.owner,
      整改期限: answer.due,
      整改状态: remediationLabel[answer.remediationStatus],
      整改措施: answer.action,
      不适用理由: answer.note,
    };
  });
};

export const wordDetailCells = (row: ReturnType<typeof reportDetailRows>[number]) => [
  row.条款编号,
  row.模块,
  row.口径,
  `${row.审核项目}\n评分：${row.评分属性}\n要求：${row.审核要求}\n依据：${row.依据}\n证据：${row.证据编号或位置 || '未填写'}`,
  `${row.结论}\n整改状态：${row.整改状态}`,
  `${row.整改负责人 || '待指定'} / ${row.整改期限 || '待定'}`,
  `措施：${row.整改措施 || '未填写'}\n不适用理由：${row.不适用理由 || '—'}`,
];

const saveBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export async function exportExcelReport(input: ReportExportInput) {
  const XLSX = await import('xlsx');
  const { profile, current, forward } = input;
  const summary = [
    ['单位内部治安保卫合规审核报告'],
    ['单位名称', profile.name || '未命名单位'],
    ['所属地区', profile.region || '未填写'],
    ['单位类型', profile.unitType],
    ['所属行业', profile.industry || '未填写'],
    ['重点单位审核采用的防范级别', profile.keyCandidate ? profile.keyProtectionLevel : '不适用（非重点单位画像）'],
    ['审核日期', profile.reviewDate || '未填写'],
    ['审核人', profile.reviewer || '未填写'],
    [],
    ['现行基线完成率', `${current.completion}%`],
    ['附录F建议项得分', `${current.suggestedCompletion}%`],
    ['风险等级', current.level],
    ['现行适用项目', current.counted.length],
    ['现行关键缺口', current.criticalGaps.length],
    ['现行待整改项目（未关闭）', current.remediationOpen.length],
    ['现行合规缺口（含已关闭整改）', current.findings.length],
    ['前瞻差距项目', forward.active.filter(criterion => !current.active.some(currentCriterion => currentCriterion.id === criterion.id)).length],
    ['需人工复核', current.reviewReasons.length ? '是' : '否'],
    ['人工复核原因概览', reviewSummary(current.reviewReasons)],
    [],
    ['说明', '本报告为内部自查辅助，不等同于公安机关、主管部门或其他监管机构的法定合格证明。征求意见稿项目仅作前瞻性参考。'],
  ];
  const workbook = XLSX.utils.book_new();
  const summarySheet = XLSX.utils.aoa_to_sheet(summary);
  summarySheet['!cols'] = [{ wch: 28 }, { wch: 90 }];
  const detailSheet = XLSX.utils.json_to_sheet(reportDetailRows(input));
  const reviewSheet = XLSX.utils.json_to_sheet(reviewReasonRows(current.reviewReasons));
  detailSheet['!cols'] = [
    { wch: 12 }, { wch: 28 }, { wch: 46 }, { wch: 48 }, { wch: 12 }, { wch: 48 }, { wch: 8 }, { wch: 9 }, { wch: 12 },
    { wch: 24 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 34 }, { wch: 28 },
  ];
  XLSX.utils.book_append_sheet(workbook, summarySheet, '报告摘要');
  XLSX.utils.book_append_sheet(workbook, detailSheet, '逐项检查结果');
  XLSX.utils.book_append_sheet(workbook, reviewSheet, '人工复核明细');
  const binary = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  saveBlob(new Blob([binary], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${fileBase(profile)}.xlsx`);
}

export async function exportWordReport(input: ReportExportInput) {
  const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, HeadingLevel, WidthType, AlignmentType } = await import('docx');
  const { profile, current, forward } = input;
  const rows = reportDetailRows(input);
  const cell = (text: string, bold = false) => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(text || '—'), bold, size: 18 })] })] });
  const header = (label: string) => new TableCell({ shading: { fill: '173A5B' }, children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, color: 'FFFFFF', size: 18 })] })] });
  const detailTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: wordDetailHeaders.map(header) }),
      ...rows.map(row => new TableRow({ children: wordDetailCells(row).map(value => cell(value)) })),
    ],
  });
  const reviewParagraphs = current.reviewReasons.length
    ? current.reviewReasons.map(reason => new Paragraph({ text: `• ${reviewReasonText(reason)}${reason.criterionIds?.length ? `（相关项目：${reason.criterionIds.join('、')}）` : ''}` }))
    : [new Paragraph({ text: '无。' })];
  const doc = new Document({ sections: [{ children: [
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '单位内部治安保卫合规审核报告', bold: true, size: 32, color: '173A5B' })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'DB11/T 2552—2026 全标准审核工作台', size: 20, color: '718096' })] }),
    new Paragraph({ text: '' }),
    new Paragraph({ heading: HeadingLevel.HEADING_1, text: '一、单位画像' }),
    new Paragraph({ children: [new TextRun({ text: `单位名称：${profile.name || '未命名单位'}\n` }), new TextRun({ text: `地区：${profile.region || '未填写'}　单位类型：${profile.unitType}\n` }), new TextRun({ text: `行业：${profile.industry || '未填写'}　重点单位审核采用的防范级别：${profile.keyCandidate ? profile.keyProtectionLevel : '不适用'}\n` }), new TextRun({ text: `审核日期：${profile.reviewDate || '未填写'}　审核人：${profile.reviewer || '未填写'}` })] }),
    new Paragraph({ heading: HeadingLevel.HEADING_1, text: '二、审核摘要' }),
    new Paragraph({ children: [new TextRun({ text: `现行基线完成率：${current.completion}%　附录F建议项得分：${current.suggestedCompletion}%　风险等级：${current.level}\n` }), new TextRun({ text: `现行适用项目：${current.counted.length}　关键缺口：${current.criticalGaps.length}　待整改（未关闭）：${current.remediationOpen.length}　前瞻差距项目：${forward.active.filter(criterion => !current.active.some(currentCriterion => currentCriterion.id === criterion.id)).length}` })] }),
    new Paragraph({ heading: HeadingLevel.HEADING_1, text: '三、人工复核与使用限制' }),
    ...reviewParagraphs,
    new Paragraph({ heading: HeadingLevel.HEADING_1, text: '四、逐项审核与整改明细' }),
    detailTable,
    new Paragraph({ text: '' }),
    new Paragraph({ heading: HeadingLevel.HEADING_1, text: '五、依据与说明' }),
    new Paragraph({ text: '现行依据：DB11/T 2552—2026（第1—9章及附录A—H）、2004版《企业事业单位内部治安保卫条例》。征求意见稿项目仅作前瞻性参考，不改变现行基线分数。' }),
    new Paragraph({ text: '本报告为内部自查辅助，不等同于公安机关、主管部门或其他监管机构的法定合格证明。证据索引、负责人、期限、整改状态、整改措施和不适用理由来自本机审核档案。' }),
  ] }] });
  const blob = await Packer.toBlob(doc);
  saveBlob(blob, `${fileBase(profile)}.docx`);
}
