import { describe, expect, it } from 'vitest';
import { criteria, type Profile } from '@/data/criteria';
import { defaultA04Profile, emptyA04Details } from '@/data/a04Types';
import { emptyAnswer, type Answers } from './scoring';
import { normalizeAuditState, SCHEMA_VERSION } from './storage';

const profile: Profile = {
  name: '测试单位', region: '北京市', unitType: '企业', industry: '测试', multiSite: false,
  keyCandidate: false, keyProtectionLevel: '未确定', secret: false, dangerous: false,
  crowded: false, dataStorage: false, reviewer: '测试员', reviewDate: '2026-10-03', a04: { ...defaultA04Profile },
};
const defaults = Object.fromEntries(criteria.map(criterion => [criterion.id, emptyAnswer()])) as Answers;
const valid = () => ({
  version: 2,
  profile: { ...profile },
  answers: { 'GD-04': { ...emptyAnswer(), status: 'compliant' } },
  savedAt: '2026-10-03T00:00:00.000Z',
});

describe('审核档案导入校验', () => {
  it('仅接受已知ID并创建无原型答案字典', () => {
    const normalized = normalizeAuditState(valid(), profile, defaults);
    expect(normalized.version).toBe(SCHEMA_VERSION);
    expect(normalized.answers['GD-04'].status).toBe('compliant');
    expect(Object.getPrototypeOf(normalized.answers)).toBeNull();
  });

  it('拒绝空画像、未来版本、无效状态和无效日期', () => {
    expect(() => normalizeAuditState({ ...valid(), profile: {} }, profile, defaults)).toThrow('单位画像字段');
    expect(() => normalizeAuditState({ ...valid(), version: 999 }, profile, defaults)).toThrow('版本不受支持');
    expect(() => normalizeAuditState({ ...valid(), answers: { 'GD-04': { ...emptyAnswer(), status: 'unknown' } } }, profile, defaults)).toThrow('审核状态无效');
    expect(() => normalizeAuditState({ ...valid(), profile: { ...profile, reviewDate: 'not-a-date' } }, profile, defaults)).toThrow('审核日期');
    expect(() => normalizeAuditState({ ...valid(), profile: { ...profile, unitType: '伪造单位类型' } }, profile, defaults)).toThrow('单位类型无效');
    expect(() => normalizeAuditState({ ...valid(), savedAt: '2026/10/03 00:00:00' }, profile, defaults)).toThrow('档案保存时间无效');
  });

  it('拒绝原型控制键、未知答案ID和超出标准库的答案数量', () => {
    const prototypePayload = JSON.parse(JSON.stringify(valid()).replace('GD-04', '__proto__'));
    expect(() => normalizeAuditState(prototypePayload, profile, defaults)).toThrow('不受支持的审核项编号');
    expect(() => normalizeAuditState({ ...valid(), answers: { 'FAKE-ID': { ...emptyAnswer(), status: 'compliant' } } }, profile, defaults)).toThrow('不受支持的审核项编号');
    const excess = Object.fromEntries(Array.from({ length: criteria.length + 1 }, (_, index) => [`X-${index}`, { ...emptyAnswer(), status: 'compliant' }]));
    expect(() => normalizeAuditState({ ...valid(), answers: excess }, profile, defaults)).toThrow('数量超过');
  });

  it('仅对明确的v1形态执行无损等级字段迁移', () => {
    const legacy = valid();
    legacy.version = 1;
    delete (legacy.profile as Partial<Profile>).keyProtectionLevel;
    delete (legacy.answers['GD-04'] as Partial<ReturnType<typeof emptyAnswer>>).remediationStatus;
    const normalized = normalizeAuditState(legacy, profile, defaults);
    expect(normalized.profile.keyProtectionLevel).toBe('未确定');
    expect(normalized.answers['GD-04'].remediationStatus).toBe('pending');
  });

  it('拒绝A04负数、非有限数值与不匹配的结构化单位', () => {
    const a04 = () => ({ ...valid(), version: 4, profile: { ...profile, a04: { ...defaultA04Profile } }, answers: { 'A04-BAR-02': { ...emptyAnswer(), a04: { ...emptyA04Details(), measuredValue: '-0.1', measuredUnit: 'm' } } } });
    expect(() => normalizeAuditState(a04(), profile, defaults)).toThrow('非负有限数值');
    const unit = a04();
    (unit.answers['A04-BAR-02'] as ReturnType<typeof emptyAnswer>).a04 = { ...emptyA04Details(), measuredValue: '2', measuredUnit: 'hour' };
    expect(() => normalizeAuditState(unit, profile, defaults)).toThrow('实测单位应为m');
    const finite = a04();
    (finite.answers['A04-BAR-02'] as ReturnType<typeof emptyAnswer>).a04 = { ...emptyA04Details(), measuredValue: 'Infinity', measuredUnit: 'm' };
    expect(() => normalizeAuditState(finite, profile, defaults)).toThrow('非负有限数值');
  });
});


it('导入时将缺少关闭证据的已关闭整改降级为待整改', () => {
  const raw = valid();
  raw.answers['GD-04'] = { ...emptyAnswer(), status: 'noncompliant', remediationStatus: 'closed' };
  const normalized = normalizeAuditState(raw, profile, defaults);
  expect(normalized.answers['GD-04'].remediationStatus).toBe('pending');
  expect(normalized.answers['GD-04'].a04.reviewReason).toContain('已降级为待整改');
});
