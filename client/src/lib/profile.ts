import type { Profile } from '@/data/criteria';

export const hasSpecialRisk = (profile: Profile) => profile.secret || profile.dangerous || profile.crowded || profile.dataStorage;

/** Keeps the user's selected audit mode independent from risk flags. */
export const normalizeProfileDraft = (profile: Profile): Profile => ({
  ...profile,
  keyProtectionLevel: profile.keyCandidate ? profile.keyProtectionLevel : '未确定',
});
