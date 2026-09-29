import { describe, expect, it } from 'vitest';
import { criteria, Profile } from '@/data/criteria';
import { emptyAnswer, score } from './scoring';
import { reportDetailRows, wordDetailHeaders } from './reportExport';

const profile: Profile = {
  name: '测试重点单位', region: '北京市', unitType: '企业', industry: '测试', multiSite: false,
  keyCandidate: true, keyProtectionLevel: '一级', secret: false, dangerous: false,
  crowded: false, dataStorage: false, reviewer: '测试员', reviewDate: '2026-09-29',
};

const answers = Object.fromEntries(criteria.map(c => [c.id, emptyAnswer()]));
answers['KF-23'] = { ...answers['KF-23'], status: 'noncompliant', evidence: '安防点位图-F23', owner: '保卫部', due: '2026-10-31', action: '补充重要部位建筑周边入侵探测装置', remediationStatus: 'in_progress' };

describe('报告导出数据', () => {
  it('将一级附录F逐行矩阵带入报告行和整改字段', () => {
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
    expect(wordDetailHeaders).toContain('模块');
  });
});
