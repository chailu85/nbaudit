import { describe, expect, it } from 'vitest';
import { criteria, type Profile } from '@/data/criteria';
import { emptyAnswer, score, type Answers } from './scoring';

const base: Profile = {
  name: '', region: '', unitType: '企业', industry: '', multiSite: false,
  keyCandidate: false, keyProtectionLevel: '未确定', secret: false, dangerous: false,
  crowded: false, dataStorage: false, reviewer: '', reviewDate: '2026-10-03',
};
const answers = () => Object.fromEntries(criteria.map(criterion => [criterion.id, emptyAnswer()])) as Answers;

describe('评分、复核与整改状态', () => {
  it('特殊场景触发资格复核但不把非重点画像改为重点模式', () => {
    const result = score(criteria, answers(), { ...base, secret: true }, false);
    expect(result.active.filter(criterion => criterion.module === 'key').map(criterion => criterion.id)).toEqual(['KU-00']);
    expect(result.active.some(criterion => criterion.id === 'GD-04')).toBe(true);
    expect(result.reviewReasons.map(reason => reason.code)).toContain('special_risk');
    expect(result.reviewReasons.map(reason => reason.code)).not.toContain('key_unit_review');
  });

  it('将空不适用理由和未确认等级作为可追溯复核原因', () => {
    const next = answers();
    next['KU-01'] = { ...next['KU-01'], status: 'na', note: '' };
    const result = score(criteria, next, { ...base, keyCandidate: true, keyProtectionLevel: '未确定' }, false);
    expect(result.reviewReasons.map(reason => reason.code)).toEqual(expect.arrayContaining(['key_level_unconfirmed', 'missing_na_reason']));
    expect(result.reviewReasons.find(reason => reason.code === 'missing_na_reason')?.criterionIds).toContain('KU-01');
  });

  it('已关闭整改仍是合规缺口；关闭证据不足时仍计入待办', () => {
    const next = answers();
    next['GD-04'] = { ...next['GD-04'], status: 'noncompliant', remediationStatus: 'closed' };
    const result = score(criteria, next, base, false);
    expect(result.findings.map(criterion => criterion.id)).toContain('GD-04');
    expect(result.remediationOpen.map(criterion => criterion.id)).toContain('GD-04');
    next['GD-04'] = { ...next['GD-04'], owner: '保卫部', due: '2026-10-31', action: '完成整改', a04: { ...next['GD-04'].a04, temporaryProtection: '整改期间加强值守', verificationEvidence: '复核记录', verifier: '审核员', verifiedAt: '2026-10-03' } };
    const closed = score(criteria, next, base, false);
    expect(closed.remediationOpen.map(criterion => criterion.id)).not.toContain('GD-04');
  });
});
