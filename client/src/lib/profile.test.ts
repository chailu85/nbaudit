import { describe, expect, it } from 'vitest';
import type { Profile } from '@/data/criteria';
import { hasSpecialRisk, normalizeProfileDraft } from './profile';

const profile: Profile = {
  name: '', region: '', unitType: '企业', industry: '', multiSite: false,
  keyCandidate: false, keyProtectionLevel: '三级', secret: false, dangerous: false,
  crowded: false, dataStorage: false, reviewer: '', reviewDate: '2026-10-03',
};

describe('单位画像审核模式', () => {
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
