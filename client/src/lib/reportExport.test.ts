import { describe, expect, it } from 'vitest';
import { criteria, type Profile } from '@/data/criteria';
import { emptyAnswer, score, type Answers } from './scoring';
import { reportDetailRows, reviewReasonRows, reviewSummary, wordDetailCells, wordDetailHeaders } from './reportExport';

const profile: Profile = {
  name: '测试重点单位', region: '北京市', unitType: '企业', industry: '测试', multiSite: false,
  keyCandidate: true, keyProtectionLevel: '一级', secret: false, dangerous: false,
  crowded: false, dataStorage: false, reviewer: '测试员', reviewDate: '2026-10-03',
};

const answers = Object.fromEntries(criteria.map(criterion => [criterion.id, emptyAnswer()])) as Answers;
answers['KF-23'] = { ...answers['KF-23'], status: 'noncompliant', evidence: '安防点位图-F23', owner: '保卫部', due: '2026-10-31', action: '补充重要部位建筑周边入侵探测装置', remediationStatus: 'in_progress' };
answers['KF-28'] = { ...answers['KF-28'], status: 'na', note: '当前无此出入口控制场景' };

describe('报告导出数据', () => {
  it('将设施项、整改字段、证据和不适用理由投影到共同报告模型', () => {
    const current = score(criteria, answers, profile, false);
    const forward = score(criteria, answers, profile, true);
    const row = reportDetailRows({ profile, current, forward, answers }).find(item => item.条款编号 === 'KF-23');
    expect(row).toMatchObject({
      条款编号: 'KF-23',
      模块: '重点单位常态防范（第6章）',
      口径: '现行基线',
      结论: '不符合',
      证据编号或位置: '安防点位图-F23',
      整改负责人: '保卫部',
      整改期限: '2026-10-31',
      整改状态: '整改中',
    });
    expect(row?.依据).toContain('表F.1 序号23');
    expect(wordDetailHeaders.join(' ')).toContain('依据与证据');
    expect(wordDetailCells(row!).join('\n')).toContain('安防点位图-F23');

    const naRow = reportDetailRows({ profile, current, forward, answers }).find(item => item.条款编号 === 'KF-28');
    expect(wordDetailCells(naRow!).join('\n')).toContain('当前无此出入口控制场景');
  });

  it('在摘要中输出结构化人工复核原因', () => {
    const reviewAnswers = { ...answers, 'KU-01': { ...answers['KU-01'], status: 'na' as const, note: '' } };
    const current = score(criteria, reviewAnswers, { ...profile, keyProtectionLevel: '未确定', secret: true }, false);
    expect(reviewSummary(current.reviewReasons)).toContain('重点单位防范级别未确认');
    expect(reviewReasonRows(current.reviewReasons)).toEqual(expect.arrayContaining([
      expect.objectContaining({ 复核代码: 'key_level_unconfirmed', 相关审核项: expect.stringContaining('KU-02') }),
      expect.objectContaining({ 复核代码: 'special_risk' }),
      expect.objectContaining({ 复核代码: 'missing_na_reason', 相关审核项: expect.stringContaining('KU-01') }),
    ]));
  });
});
