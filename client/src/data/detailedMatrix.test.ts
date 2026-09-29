import { describe, expect, it } from 'vitest';
import { criteria, Profile } from './criteria';
import { activeCriteria, emptyAnswer, score } from '@/lib/scoring';

const base: Profile = {
  name: '', region: '', unitType: '企业', industry: '', multiSite: false,
  keyCandidate: true, keyProtectionLevel: '未确定', secret: false, dangerous: false,
  crowded: false, dataStorage: false, reviewer: '', reviewDate: '2026-09-29',
};
const ids = (profile: Profile) => new Set(activeCriteria(criteria, profile).map(c => c.id));

describe('DB11/T 2552—2026 四模块逐条矩阵', () => {
  it('移除了早期泛化审核项，并完整建立附录D/F行项目', () => {
    const obsolete = ['K-01', 'K-02', 'K-03', 'K-04', 'K-05', 'X-01', 'X-02', 'X-03', 'D-01', 'D-02', 'D-03', 'A-02', 'A-03', 'A-04', 'T-02'];
    const all = new Set(criteria.map(c => c.id));
    obsolete.forEach(id => expect(all.has(id)).toBe(false));
    expect(criteria.filter(c => c.id.startsWith('GD-'))).toHaveLength(20);
    expect(criteria.filter(c => c.id.startsWith('KF-'))).toHaveLength(58);
    for (let number = 1; number <= 58; number += 1) expect(all.has(`KF-${String(number).padStart(2, '0')}`)).toBe(true);
    expect(all.has('ST-01')).toBe(true);
    expect(all.has('ST-07')).toBe(true);
  });

  it('未确定重点单位防范级别时，仅显示确认和人工复核事项', () => {
    const active = ids(base);
    expect(active.has('KU-01')).toBe(true);
    expect(active.has('KU-02')).toBe(true);
    expect(active.has('KU-03')).toBe(true);
    expect(active.has('AC-06')).toBe(false);
    expect(active.has('KF-01')).toBe(false);
  });

  it('按三级、二级、一级递进显示第6章人员与附录F设施行', () => {
    const level3 = ids({ ...base, keyProtectionLevel: '三级' });
    expect(level3.has('AC-06')).toBe(true);
    expect(level3.has('KF-01')).toBe(true);
    expect(level3.has('KF-09')).toBe(false);
    expect(level3.has('KF-23')).toBe(false);

    const level2 = ids({ ...base, keyProtectionLevel: '二级' });
    expect(level2.has('AC-06')).toBe(true);
    expect(level2.has('AC-09')).toBe(true);
    expect(level2.has('KF-09')).toBe(true);
    expect(level2.has('KF-23')).toBe(false);

    const level1 = ids({ ...base, keyProtectionLevel: '一级' });
    expect(level1.has('AC-11')).toBe(true);
    expect(level1.has('KF-21')).toBe(true);
    expect(level1.has('KF-23')).toBe(true);
    expect(level1.has('KF-58')).toBe(true);
  });

  it('不适用但未填写理由时触发人工复核', () => {
    const answers = Object.fromEntries(criteria.map(c => [c.id, emptyAnswer()]));
    answers['KF-23'] = { ...answers['KF-23'], status: 'na', note: '' };
    const result = score(criteria, answers, { ...base, keyProtectionLevel: '一级' }, false);
    expect(result.missingNaReason.map(c => c.id)).toContain('KF-23');
    expect(result.manualReview).toBe(true);
  });
});
