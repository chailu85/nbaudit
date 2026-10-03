import { describe, expect, it } from 'vitest';
import { criteria, type Profile } from './criteria';
import { A04_CONTROL_SET_VERSION, a04CatalogControls, a04ControlById, evaluateA04Rule } from './a04Controls';
import { defaultA04Profile, emptyA04Details } from './a04Types';
import { activeCriteria, effectiveStatus, emptyAnswer, score, type Answers } from '@/lib/scoring';
import { a04ControlExportMetadata, createBlankAnswers, normalizeAuditState } from '@/lib/storage';

const base: Profile = {
  name: 'A04测试单位', region: '北京市', unitType: '企业', industry: '测试', multiSite: false,
  keyCandidate: false, keyProtectionLevel: '未确定', secret: false, dangerous: false, crowded: false, dataStorage: false,
  reviewer: '审核员', reviewDate: '2026-10-03',
  a04: { ...defaultA04Profile, scopeApproved: true, gb55029Applicable: 'no', gbHighRiskObject: 'no', engineeringStage: 'not_applicable', alarmSystem: 'no', videoSystem: 'no', accessControlSystem: 'no', patrolSystem: 'no', parkingSystem: 'no', securityCheckSystem: 'no', personalDataProcessing: 'no', secretAdjacentUnit: 'no', faceRecognition: 'no', undergroundCrossing: 'no', lowAirIntake: 'no', guardhouseExteriorDoor: 'no', securityDoorInstalled: 'no', specialDoorOrStorage: 'no', sharedImportantBuilding: 'no', controlCenter: 'no', networkOperator: 'no', publicVideoContext: 'none' },
};
const answers = () => Object.fromEntries(criteria.map(item => [item.id, emptyAnswer()])) as Answers;
const ids = (profile: Profile) => new Set(activeCriteria(criteria, profile).map(item => item.id));

function detail(value: string, unit: string) {
  return { ...emptyA04Details(), measuredValue: value, measuredUnit: unit };
}

describe('A04原子控制集', () => {
  it('完整加载118项目录并隔离六项国际方法补充', () => {
    expect(A04_CONTROL_SET_VERSION).toBe('a04-design-v1.1');
    expect(a04CatalogControls).toHaveLength(118);
    expect(criteria.filter(item => item.id.startsWith('A04-'))).toHaveLength(118);
    expect(a04CatalogControls.filter(item => item.contributesToDomesticScore)).toHaveLength(112);
    expect(a04CatalogControls.filter(item => item.scoringLane === 'practice')).toHaveLength(6);
  });

  it('按非重点、未定级、三级、二级、一级保持递进，并保留重点判定入口', () => {
    expect(ids(base).has('A04-BAR-01')).toBe(true);
    expect(ids(base).has('A04-BAR-02')).toBe(false);
    const unclassified = { ...base, keyCandidate: true, keyProtectionLevel: '未确定' as const };
    expect(ids(unclassified).has('A04-BAR-02')).toBe(true);
    expect(ids(unclassified).has('A04-L1-01')).toBe(false);
    const level3 = { ...unclassified, keyProtectionLevel: '三级' as const };
    const level2 = { ...unclassified, keyProtectionLevel: '二级' as const, a04: { ...unclassified.a04!, lowAirIntake: 'yes' as const } };
    const level1 = { ...unclassified, keyProtectionLevel: '一级' as const };
    expect(ids(level3).has('A04-BAR-09')).toBe(false);
    expect(ids(level2).has('A04-BAR-09')).toBe(true);
    expect(ids(level1).has('A04-L1-01')).toBe(true);
  });

  it('GB高风险工程独立于DB重点单位资格触发', () => {
    const profile: Profile = { ...base, a04: { ...base.a04!, gb55029Applicable: 'yes', gbHighRiskObject: 'yes', engineeringStage: 'design' } };
    expect(profile.keyCandidate).toBe(false);
    expect(ids(profile).has('A04-GB-01')).toBe(true);
    expect(ids(profile).has('A04-GB-02')).toBe(true);
  });

  it('结构化阈值不提前舍入，并区分秒与小时指标', () => {
    const barrier = criteria.find(item => item.id === 'A04-BAR-02')!;
    const level1 = { ...base, keyCandidate: true, keyProtectionLevel: '一级' as const };
    expect(evaluateA04Rule(barrier, level1, detail('2.499', 'm'))?.state).toBe('fail');
    expect(evaluateA04Rule(barrier, level1, detail('2.5', 'm'))?.state).toBe('pass');
    const gb18 = criteria.find(item => item.id === 'A04-GB-18')!;
    const gbProfile: Profile = { ...base, a04: { ...base.a04!, gb55029Applicable: 'yes', alarmSystem: 'yes', engineeringStage: 'operation' } };
    expect(evaluateA04Rule(gb18, gbProfile, detail('2', 'second'))?.state).toBe('pass');
    expect(evaluateA04Rule(gb18, gbProfile, detail('2.001', 'second'))?.state).toBe('fail');
  });

  it('父项不与A04原子子控制双重计入分母', () => {
    const profile = { ...base, keyCandidate: true, keyProtectionLevel: '三级' as const };
    const snapshot = score(criteria, answers(), profile, false);
    expect(snapshot.counted.map(item => item.id)).toContain('A04-BAR-02');
    expect(snapshot.counted.map(item => item.id)).not.toContain('KF-01');
  });

  it('国际方法补充的结论不改变国内合规分和分母', () => {
    const profile = { ...base, a04: { ...base.a04!, showSupplemental: true } };
    const allCompliant = answers();
    Object.keys(allCompliant).forEach(id => { allCompliant[id] = { ...allCompliant[id], status: 'compliant' }; });
    const first = score(criteria, allCompliant, profile, false);
    const pspId = a04CatalogControls.find(item => item.scoringLane === 'practice')!.id;
    allCompliant[pspId] = { ...allCompliant[pspId], status: 'noncompliant' };
    const second = score(criteria, allCompliant, profile, false);
    expect(second.completion).toBe(first.completion);
    expect(second.counted.length).toBe(first.counted.length);
    expect(second.supplementalFindings.map(item => item.id)).toContain(pspId);
  });

  it('旧档案保留父项答案且新增A04原子控制不自动迁为符合', () => {
    const defaults = createBlankAnswers(criteria);
    const legacy = {
      version: 3,
      profile: { ...base, a04: undefined },
      answers: { 'GD-04': { status: 'compliant', evidence: '旧证据', owner: '', due: '', action: '', note: '', remediationStatus: 'pending' } },
      savedAt: '2026-10-03T00:00:00.000Z',
    };
    const migrated = normalizeAuditState(legacy, base, defaults);
    expect(migrated.version).toBe(5);
    expect(migrated.controlSetVersion).toBe(A04_CONTROL_SET_VERSION);
    expect(migrated.answers['GD-04'].evidence).toBe('旧证据');
    expect(migrated.answers['GD-04'].a04.needsReview).toBe(true);
    expect(migrated.answers['A04-BAR-02'].status).toBe('unreviewed');
  });

  it('每一目录控制均可由ID回溯元数据', () => {
    for (const control of a04CatalogControls) expect(a04ControlById.get(control.id)?.title).toBe(control.title);
  });
});


describe('A04审查阻断问题回归', () => {
  it('一级必设平台和重要建筑控制不会因未安装或非共用而被排除', () => {
    const profile: Profile = { ...base, keyCandidate: true, keyProtectionLevel: '一级', a04: { ...base.a04!, accessControlSystem: 'no', controlCenter: 'no', sharedImportantBuilding: 'no' } };
    const active = ids(profile);
    ['A04-L1-08', 'A04-L1-09', 'A04-L1-10', 'A04-L1-12', 'A04-L1-13', 'A04-L1-14', 'A04-L1-17'].forEach(id => expect(active.has(id)).toBe(true));
    expect(active.has('A04-L1-15')).toBe(false);
  });

  it('失败数值、失败子断言和禁止的未安装NA会覆盖父项符合结论', () => {
    const level1: Profile = { ...base, keyCandidate: true, keyProtectionLevel: '一级' };
    const barrier = criteria.find(item => item.id === 'A04-BAR-02')!;
    const badMeasurement = { ...emptyAnswer(), status: 'compliant' as const, a04: { ...detail('1.999', 'm'), sourceAssessments: [] } };
    expect(effectiveStatus(barrier, badMeasurement, level1)).toBe('noncompliant');
    const childFailure = { ...emptyAnswer(), status: 'compliant' as const, a04: { ...emptyA04Details(), subAssertions: [{ id: 's1', label: '连续性', status: 'noncompliant' as const, evidence: '', remediation: '' }] } };
    expect(effectiveStatus(barrier, childFailure, level1)).toBe('noncompliant');
    const platform = criteria.find(item => item.id === 'A04-L1-08')!;
    const invalidNa = { ...emptyAnswer(), status: 'na' as const, note: '未安装', a04: { ...emptyA04Details(), naBasis: '未安装' } };
    expect(effectiveStatus(platform, invalidNa, level1)).toBe('noncompliant');
    const snapshot = score([platform], { [platform.id]: invalidNa }, level1, false);
    expect(snapshot.counted.map(item => item.id)).toContain('A04-L1-08');
    expect(snapshot.hardGaps.map(item => item.id)).toContain('A04-L1-08');
  });

  it('JSON导出保留国际补充分类、国内计分标志和逐来源依据', () => {
    const metadata = a04ControlExportMetadata();
    expect(metadata).toHaveLength(118);
    const supplemental = metadata.find(item => item.id === 'A04-PSP-01')!;
    expect(supplemental.originCategory).toBe('international_method_supplement');
    expect(supplemental.contributesToDomesticScore).toBe(false);
    expect(supplemental.domesticAnchors.length).toBeGreaterThan(0);
    expect(supplemental.sourceRequirements.length).toBeGreaterThan(0);
  });
});


  it('多来源控制必须逐来源确认后才能形成符合结论', () => {
    const multiSource = criteria.find(item => (item.controlMeta?.sourceRequirements.length ?? 0) > 1 && !item.controlMeta?.structuredRule)!;
    const incomplete = { ...emptyAnswer(), status: 'compliant' as const };
    expect(effectiveStatus(multiSource, incomplete, base)).toBe('partial');
    const complete = { ...incomplete, a04: { ...emptyA04Details(), sourceAssessments: multiSource.controlMeta!.sourceRequirements.map(source => ({ sourceId: source.sourceId, clause: source.clause, applicability: 'applicable' as const, rationale: '经核适用', evidence: '证据索引', conclusion: 'compliant' as const })) } };
    expect(effectiveStatus(multiSource, complete, base)).toBe('compliant');
  });


it('适用来源标为NA时不能形成国内父项符合', () => {
  const multiSource = criteria.find(item => (item.controlMeta?.sourceRequirements.length ?? 0) > 1 && !item.controlMeta?.structuredRule)!;
  const answer = { ...emptyAnswer(), status: 'compliant' as const, a04: { ...emptyA04Details(), sourceAssessments: multiSource.controlMeta!.sourceRequirements.map((source, index) => ({ sourceId: source.sourceId, clause: source.clause, applicability: 'applicable' as const, rationale: '经核适用', evidence: '证据索引', conclusion: index === 0 ? 'na' as const : 'compliant' as const })) } };
  expect(effectiveStatus(multiSource, answer, base)).toBe('partial');
});
