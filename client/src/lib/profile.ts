import type { Profile } from '@/data/criteria';
import { defaultA04Profile } from '@/data/a04Types';
import { businessDate } from './businessDate';

/** Creates a new local audit profile using the Beijing business date at creation time. */
export const createAuditProfile = (now = new Date()): Profile => ({
  name: '',
  region: '',
  unitType: '企业',
  industry: '',
  multiSite: false,
  keyCandidate: false,
  keyProtectionLevel: '未确定',
  secret: false,
  dangerous: false,
  crowded: false,
  dataStorage: false,
  reviewer: '',
  reviewDate: businessDate(now),
  a04: { ...defaultA04Profile },
});

/** A new audit gets today's Beijing business date; an existing audit retains its recorded date. */
export const prepareAuditProfileDraft = (profile: Profile, isNewAudit: boolean, now = new Date()): Profile => (
  isNewAudit ? { ...profile, reviewDate: businessDate(now) } : profile
);

export const hasSpecialRisk = (profile: Profile) => profile.secret || profile.dangerous || profile.crowded || profile.dataStorage;

/** Keeps the user's selected audit mode independent from risk flags. */
export const normalizeProfileDraft = (profile: Profile): Profile => ({
  ...profile,
  keyProtectionLevel: profile.keyCandidate ? profile.keyProtectionLevel : '未确定',
});
