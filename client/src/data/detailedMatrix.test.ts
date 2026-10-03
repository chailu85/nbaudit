import { describe, expect, it } from 'vitest';
import { criteria, modules, Profile } from './criteria';
import { activeCriteria, emptyAnswer, score } from '@/lib/scoring';

const base: Profile = {
  name: '', region: '', unitType: '企业', industry: '', multiSite: false,
  keyCandidate: true, keyProtectionLevel: '未确定', secret: false, dangerous: false,
  crowded: false, dataStorage: false, reviewer: '', reviewDate: '2026-09-29',
};
const ids = (profile: Profile) => new Set(activeCriteria(criteria, profile).map(c => c.id));
const byId = (id: string) => criteria.find(c => c.id === id);

describe('DB11/T 2552—2026 第5章与第6章审核矩阵', () => {
  it('删除自定义出入/防范导航，按标准章节聚合项目', () => {
    expect(modules.some(m => m.id === 'access' || m.id === 'defense')).toBe(false);
    expect(modules.find(m => m.id === 'general')?.label).toContain('第5章');
    expect(modules.find(m => m.id === 'key')?.label).toContain('第6章');
    expect(byId('AC-01')?.module).toBe('general');
    expect(byId('AC-02')?.module).toBe('general');
    expect(byId('RM-05')?.module).toBe('general');
    expect(byId('RM-06')?.module).toBe('general');
    expect(byId('GD-01')?.module).toBe('general');
    ['RM-07', 'RM-08', 'RM-09', 'AC-03', 'AC-11', 'KF-01', 'KF-23', 'KF-58'].forEach(id => expect(byId(id)?.module).toBe('key'));
  });

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

  it('非重点单位模式保留第6.1资格判定入口，而不是显示0项', () => {
    const keyItems = activeCriteria(criteria, { ...base, keyCandidate: false }).filter(c => c.module === 'key');
    expect(keyItems.map(c => c.id)).toEqual(['KU-00']);
  });

  it('未确定重点单位防范级别时，显示第6章资格、部位和一般要求，隐藏等级专属项目', () => {
    const active = ids(base);
    ['KU-01', 'KU-02', 'KU-03', 'KU-04', 'KU-05', 'RM-07', 'AC-03'].forEach(id => expect(active.has(id)).toBe(true));
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

  it('按已确认政策将附录F“应”计入强制分母、“宜”单列建议分', () => {
    const answers = Object.fromEntries(criteria.map(c => [c.id, emptyAnswer()]));
    // A04原子控制上线后，旧KF父项仅作为总览，不与子控制混合计分。
    // 本用例专门保护既有附录F“应/宜”规则本身。
    const legacyCriteria = criteria.filter(c => !c.controlMeta);
    const level3 = score(legacyCriteria, answers, { ...base, keyProtectionLevel: '三级' }, false);
    expect(level3.recommended.map(c => c.id)).toEqual(expect.arrayContaining(['KF-02', 'KF-05', 'KF-06', 'KF-10']));
    expect(level3.counted.map(c => c.id)).not.toContain('KF-02');
    expect(level3.counted.map(c => c.id)).toContain('KF-01');

    const level2 = score(legacyCriteria, answers, { ...base, keyProtectionLevel: '二级' }, false);
    expect(level2.recommended.map(c => c.id)).toContain('KF-02');
    expect(level2.recommended.map(c => c.id)).not.toContain('KF-05');
    expect(level2.counted.map(c => c.id)).toContain('KF-05');

    ['KF-05', 'KF-06', 'KF-10', 'KF-42', 'KF-43'].forEach(id => {
      expect(level3.recommended.map(c => c.id)).toContain(id);
      expect(level2.counted.map(c => c.id)).toContain(id);
    });
    expect(level2.recommended.map(c => c.id)).toContain('KF-29');
    const level1 = score(legacyCriteria, answers, { ...base, keyProtectionLevel: '一级' }, false);
    expect(level1.counted.map(c => c.id)).toEqual(expect.arrayContaining(['KF-05', 'KF-06', 'KF-10', 'KF-29', 'KF-42', 'KF-43']));
  });

  it('区分表F.1第17、29、43项的空间层级，且不改变既有项目编号', () => {
    expect(byId('KF-17')?.title).toContain('周界主要出入口');
    expect(byId('KF-17')?.prompt).toContain('门卫室、重要部位出入口或其他区域');
    expect(byId('KF-29')?.title).toContain('重要部位所在建（构）筑物');
    expect(byId('KF-29')?.prompt).toContain('周界、楼层出入口或重要部位本身出入口');
    expect(byId('KF-43')?.title).toContain('重要部位本身');
    expect(byId('KF-43')?.prompt).toContain('重要部位所在建（构）筑物出入口');
  });

  it('不适用但未填写理由时触发人工复核', () => {
    const answers = Object.fromEntries(criteria.map(c => [c.id, emptyAnswer()]));
    answers['KF-23'] = { ...answers['KF-23'], status: 'na', note: '' };
    const result = score(criteria, answers, { ...base, keyProtectionLevel: '一级' }, false);
    expect(result.missingNaReason.map(c => c.id)).toContain('KF-23');
    expect(result.manualReview).toBe(true);
  });
});
