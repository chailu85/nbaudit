import { describe, expect, it } from 'vitest';
import type { Profile } from '@/data/criteria';
import { createAuditProfile, hasSpecialRisk, normalizeProfileDraft, prepareAuditProfileDraft } from './profile';

const profile: Profile = {
  name: '', region: '', unitType: '企业', industry: '', multiSite: false,
  keyCandidate: false, keyProtectionLevel: '三级', secret: false, dangerous: false,
  crowded: false, dataStorage: false, reviewer: '', reviewDate: '2026-10-03',
};

describe('单位画像审核模式', () => {
  it('新审核按北京时间默认审核创建日期，并采用一般单位模式', () => {
    const created = createAuditProfile(new Date('2026-10-02T16:30:00.000Z'));
    expect(created.reviewDate).toBe('2026-10-03');
    expect(created.keyCandidate).toBe(false);
    expect(created.keyProtectionLevel).toBe('未确定');
  });

  it('编辑既有无名称审核时保留原审核创建日期', () => {
    const existing = { ...profile, reviewDate: '2026-10-02' };
    expect(prepareAuditProfileDraft(existing, false, new Date('2026-10-02T16:30:00.000Z')).reviewDate).toBe('2026-10-02');
    expect(prepareAuditProfileDraft(existing, true, new Date('2026-10-02T16:30:00.000Z')).reviewDate).toBe('2026-10-03');
  });

  it.each(['secret', 'dangerous', 'crowded', 'dataStorage'] as const)('特殊标志%s不会自动改写非重点审核模式', flag => {
    const next = normalizeProfileDraft({ ...profile, [flag]: true });
    expect(next.keyCandidate).toBe(false);
    expect(next.keyProtectionLevel).toBe('未确定');
    expect(hasSpecialRisk(next)).toBe(true);
  });

  it('重点单位画像保留用户选择的防范级别', () => {
    expect(normalizeProfileDraft({ ...profile, keyCandidate: true, keyProtectionLevel: '一级' }).keyProtectionLevel).toBe('一级');
  });
});
