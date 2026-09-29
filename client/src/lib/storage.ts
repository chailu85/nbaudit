import { Profile } from '@/data/criteria';
import { Answer, Answers, emptyAnswer, RemediationStatus } from './scoring';

const KEY = 'neibao-audit-v1';
export const SCHEMA_VERSION = 1;
export type AuditState = { version: number; profile: Profile; answers: Answers; savedAt: string };
const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const statuses = new Set(['unreviewed', 'compliant', 'partial', 'noncompliant', 'na']);
const remediationStatuses = new Set(['pending', 'in_progress', 'review', 'closed']);
const asString = (value: unknown, fallback = '') => typeof value === 'string' ? value : fallback;

export function normalizeAuditState(raw: unknown, defaultProfile: Profile, defaultAnswers: Answers): AuditState | null {
  if (!isRecord(raw) || !isRecord(raw.profile) || !isRecord(raw.answers)) return null;
  const p = raw.profile;
  const profile: Profile = {
    ...defaultProfile,
    name: asString(p.name), region: asString(p.region), unitType: asString(p.unitType, defaultProfile.unitType), industry: asString(p.industry),
    multiSite: p.multiSite === true, keyCandidate: p.keyCandidate === true, secret: p.secret === true, dangerous: p.dangerous === true, crowded: p.crowded === true, dataStorage: p.dataStorage === true,
    reviewer: asString(p.reviewer), reviewDate: asString(p.reviewDate, defaultProfile.reviewDate),
  };
  const answers: Answers = { ...defaultAnswers };
  for (const [id, rawAnswer] of Object.entries(raw.answers)) {
    if (!isRecord(rawAnswer) || !statuses.has(String(rawAnswer.status))) continue;
    const base = emptyAnswer();
    const remediationStatus = remediationStatuses.has(String(rawAnswer.remediationStatus)) ? String(rawAnswer.remediationStatus) as RemediationStatus : base.remediationStatus;
    answers[id] = { status: String(rawAnswer.status) as Answer['status'], evidence: asString(rawAnswer.evidence), owner: asString(rawAnswer.owner), due: asString(rawAnswer.due), action: asString(rawAnswer.action), note: asString(rawAnswer.note), remediationStatus };
  }
  return { version: SCHEMA_VERSION, profile, answers, savedAt: asString(raw.savedAt, new Date().toISOString()) };
}

export const saveAudit = (state: AuditState) => localStorage.setItem(KEY, JSON.stringify({ ...state, version: SCHEMA_VERSION }));
export const loadAudit = (defaultProfile: Profile, defaultAnswers: Answers): AuditState | null => { try { const raw = localStorage.getItem(KEY); return raw ? normalizeAuditState(JSON.parse(raw), defaultProfile, defaultAnswers) : null; } catch { return null; } };
export const clearAudit = () => localStorage.removeItem(KEY);
export const downloadJson = (state: AuditState) => { const blob = new Blob([JSON.stringify({ ...state, version: SCHEMA_VERSION }, null, 2)], { type: 'application/json;charset=utf-8' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${state.profile.name || '单位'}-内保审核.json`; a.click(); URL.revokeObjectURL(a.href); };
export const readJsonFile = (file: File, defaultProfile: Profile, defaultAnswers: Answers) => new Promise<AuditState>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => { try { const state = normalizeAuditState(JSON.parse(String(reader.result)), defaultProfile, defaultAnswers); if (!state) throw new Error('JSON档案缺少有效的单位画像或审核答案'); resolve(state); } catch (error) { reject(error instanceof Error ? error : new Error('JSON文件格式无效')); } }; reader.onerror = () => reject(new Error('读取文件失败')); reader.readAsText(file); });
