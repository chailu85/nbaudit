import type { Criterion, Profile } from '@/data/criteria';
import type { Answers, Answer } from '@/lib/scoring';
import { remediationLabel, statusLabel } from '@/lib/scoring';

type ScoreSnapshot = {
  active: Criterion[];
  counted: Criterion[];
  completion: number;
  level: string;
  criticalGaps: Criterion[];
  open: Criterion[];
};

export type ReportExportInput = {
  profile: Profile;
  current: ScoreSnapshot;
  forward: ScoreSnapshot;
  answers: Answers;
};

const cleanFilePart = (value: string) => (value || '未命名单位').replace(/[\\/:*?"<>|\s]+/g, '-').slice(0, 45);
const fileBase = (profile: Profile) => `内保合规审核报告-${cleanFilePart(profile.name)}-${profile.reviewDate || new Date().toISOString().slice(0, 10)}`;
const answerOf = (answers: Answers, id: string): Answer => answers[id] ?? { status: 'unreviewed', evidence: '', owner: '', due: '', action: '', note: '', remediationStatus: 'pending' };
const basisText = (c: Criterion) => c.basis.map(b => `${b.source} ${b.clause}`).join('；');
export const reportDetailRows = ({ current, forward, answers }: ReportExportInput) => {
  const currentIds = new Set(current.active.map(c => c.id));
  return forward.active.map(c => {
    const a = answerOf(answers, c.id);
    return {
      条款编号: c.id,
      模块: c.module,
      审核项目: c.title,
      审核要求: c.prompt,
      口径: currentIds.has(c.id) ? '现行基线' : '前瞻参考',
      依据: basisText(c),
      权重: c.weight,
      关键项: c.critical ? '是' : '否',
      结论: statusLabel[a.status],
      证据编号或位置: a.evidence,
      整改负责人: a.owner,
      整改期限: a.due,
      整改状态: remediationLabel[a.remediationStatus],
      整改措施: a.action,
      不适用理由: a.note,
    };
  });
};

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
    ['风险等级', current.level],
    ['现行适用项目', current.counted.length],
    ['现行关键缺口', current.criticalGaps.length],
    ['现行待整改项目', current.open.filter(c => ['partial', 'noncompliant'].includes(answerOf(input.answers, c.id).status)).length],
    ['前瞻差距项目', forward.active.filter(c => !current.active.some(x => x.id === c.id)).length],
    [],
    ['说明', '本报告为内部自查辅助，不等同于公安机关、主管部门或其他监管机构的法定合格证明。征求意见稿项目仅作前瞻性参考。'],
  ];
  const workbook = XLSX.utils.book_new();
  const summarySheet = XLSX.utils.aoa_to_sheet(summary);
  summarySheet['!cols'] = [{ wch: 24 }, { wch: 72 }];
  const detailSheet = XLSX.utils.json_to_sheet(reportDetailRows(input));
  detailSheet['!cols'] = [
    { wch: 12 }, { wch: 14 }, { wch: 28 }, { wch: 46 }, { wch: 12 }, { wch: 42 }, { wch: 8 }, { wch: 9 }, { wch: 12 },
    { wch: 24 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 34 }, { wch: 24 },
  ];
  XLSX.utils.book_append_sheet(workbook, summarySheet, '报告摘要');
  XLSX.utils.book_append_sheet(workbook, detailSheet, '逐项检查结果');
  const binary = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  saveBlob(new Blob([binary], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${fileBase(profile)}.xlsx`);
}

export async function exportWordReport(input: ReportExportInput) {
  const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, HeadingLevel, WidthType, AlignmentType } = await import('docx');
  const { profile, current, forward } = input;
  const rows = reportDetailRows(input).filter(row => row.结论 !== '未审核' || row.口径 === '现行基线');
  const cell = (text: string, bold = false) => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(text || '—'), bold, size: 18 })] })] });
  const header = (label: string) => new TableCell({ shading: { fill: '173A5B' }, children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, color: 'FFFFFF', size: 18 })] })] });
  const detailTable = new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [
    new TableRow({ children: ['条款', '口径', '审核项目', '结论', '负责人/期限', '整改措施'].map(header) }),
    ...rows.map(row => new TableRow({ children: [
      cell(row.条款编号), cell(row.口径), cell(row.审核项目), cell(row.结论), cell(`${row.整改负责人 || '待指定'} / ${row.整改期限 || '待定'}`), cell(row.整改措施 || '未填写'),
    ] })),
  ] });
  const doc = new Document({ sections: [{ children: [
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '单位内部治安保卫合规审核报告', bold: true, size: 32, color: '173A5B' })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'DB11/T 2552—2026 全标准审核工作台', size: 20, color: '718096' })] }),
    new Paragraph({ text: '' }),
    new Paragraph({ heading: HeadingLevel.HEADING_1, text: '一、单位画像' }),
    new Paragraph({ children: [new TextRun({ text: `单位名称：${profile.name || '未命名单位'}\n` }), new TextRun({ text: `地区：${profile.region || '未填写'}　单位类型：${profile.unitType}\n` }), new TextRun({ text: `行业：${profile.industry || '未填写'}　重点单位审核采用的防范级别：${profile.keyCandidate ? profile.keyProtectionLevel : '不适用'}\n` }), new TextRun({ text: `审核日期：${profile.reviewDate || '未填写'}　审核人：${profile.reviewer || '未填写'}` })] }),
    new Paragraph({ heading: HeadingLevel.HEADING_1, text: '二、审核摘要' }),
    new Paragraph({ children: [new TextRun({ text: `现行基线完成率：${current.completion}%　风险等级：${current.level}\n` }), new TextRun({ text: `现行适用项目：${current.counted.length}　关键缺口：${current.criticalGaps.length}　前瞻差距项目：${forward.active.filter(c => !current.active.some(x => x.id === c.id)).length}` })] }),
    new Paragraph({ heading: HeadingLevel.HEADING_1, text: '三、重点缺口与整改明细' }),
    detailTable,
    new Paragraph({ text: '' }),
    new Paragraph({ heading: HeadingLevel.HEADING_1, text: '四、依据与说明' }),
    new Paragraph({ text: '现行依据：DB11/T 2552—2026（第1—9章及附录A—H）、2004版《企业事业单位内部治安保卫条例》。征求意见稿项目仅作前瞻性参考，不改变现行基线分数。' }),
    new Paragraph({ text: '本报告为内部自查辅助，不等同于公安机关、主管部门或其他监管机构的法定合格证明。证据索引、负责人、期限和整改措施来自本机审核档案。' }),
  ] }] });
  const blob = await Packer.toBlob(doc);
  saveBlob(blob, `${fileBase(profile)}.docx`);
}
