import { Profile, unitTypes } from '@/data/criteria';
import { Answer, Answers, emptyAnswer, RemediationStatus } from './scoring';

const KEY = 'neibao-audit-v1';
export const SCHEMA_VERSION = 3;
export const MAX_IMPORT_BYTES = 1024 * 1024;
const MAX_PROFILE_TEXT = 300;
const MAX_EVIDENCE_TEXT = 4_000;
const MAX_REMEDIATION_TEXT = 6_000;
const MAX_NOTE_TEXT = 2_000;

export type AuditState = { version: number; profile: Profile; answers: Answers; savedAt: string };
export type StorageResult = { ok: true } | { ok: false; message: string };
export type LoadAuditResult = { state: AuditState | null; issue?: { message: string; raw?: string } };

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const statuses = new Set(['unreviewed', 'compliant', 'partial', 'noncompliant', 'na']);
const remediationStatuses = new Set(['pending', 'in_progress', 'review', 'closed']);
const keyProtectionLevels = new Set(['未确定', '三级', '二级', '一级']);
const forbiddenKeys = new Set(['__proto__', 'constructor', 'prototype']);
const profileStringKeys = ['name', 'region', 'industry', 'reviewer'] as const;
const profileBooleanKeys = ['multiSite', 'keyCandidate', 'secret', 'dangerous', 'crowded', 'dataStorage'] as const;
const unitTypeSet = new Set<string>(unitTypes);

const asBoundedString = (value: unknown, label: string, maxLength: number, optional = false) => {
  if (value === undefined && optional) return '';
  if (typeof value !== 'string') throw new Error(`${label}格式无效`);
  if (value.length > maxLength) throw new Error(`${label}超过允许长度`);
  return value;
};

const requiredBoolean = (record: Record<string, unknown>, key: string) => {
  if (typeof record[key] !== 'boolean') throw new Error(`单位画像字段“${key}”缺失或格式无效`);
  return record[key] as boolean;
};

const isIsoInstant = (value: string) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)
  && !Number.isNaN(Date.parse(value))
  && new Date(value).toISOString() === value;
const isIsoDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
};

const failStorage = () => ({ ok: false as const, message: '本机浏览器存储不可用或空间不足；当前页面草稿仍在内存中，请立即导出JSON备份。' });
const cloneDefaultAnswers = (defaultAnswers: Answers) => {
  const answers = Object.create(null) as Answers;
  for (const [id, answer] of Object.entries(defaultAnswers)) answers[id] = { ...answer };
  return answers;
};

function normalizeProfile(raw: Record<string, unknown>, version: number, defaultProfile: Profile): Profile {
  for (const key of profileStringKeys) asBoundedString(raw[key], `单位画像字段“${key}”`, MAX_PROFILE_TEXT);
  for (const key of profileBooleanKeys) requiredBoolean(raw, key);

  const reviewDate = asBoundedString(raw.reviewDate, '审核日期', 10);
  if (!isIsoDate(reviewDate)) throw new Error('审核日期必须是有效的YYYY-MM-DD日期');
  const unitType = asBoundedString(raw.unitType, '单位类型', MAX_PROFILE_TEXT);
  if (!unitTypeSet.has(unitType)) throw new Error('单位类型无效');

  const rawLevel = raw.keyProtectionLevel;
  const keyProtectionLevel = rawLevel === undefined && version === 1
    ? '未确定'
    : asBoundedString(rawLevel, '重点单位防范级别', 10);
  if (!keyProtectionLevels.has(keyProtectionLevel)) throw new Error('重点单位防范级别无效');

  return {
    ...defaultProfile,
    name: asBoundedString(raw.name, '单位名称', MAX_PROFILE_TEXT),
    region: asBoundedString(raw.region, '所属地区', MAX_PROFILE_TEXT),
    unitType: unitType as Profile['unitType'],
    industry: asBoundedString(raw.industry, '所属行业', MAX_PROFILE_TEXT),
    reviewer: asBoundedString(raw.reviewer, '审核人', MAX_PROFILE_TEXT),
    reviewDate,
    multiSite: requiredBoolean(raw, 'multiSite'),
    keyCandidate: requiredBoolean(raw, 'keyCandidate'),
    keyProtectionLevel: keyProtectionLevel as Profile['keyProtectionLevel'],
    secret: requiredBoolean(raw, 'secret'),
    dangerous: requiredBoolean(raw, 'dangerous'),
    crowded: requiredBoolean(raw, 'crowded'),
    dataStorage: requiredBoolean(raw, 'dataStorage'),
  };
}

function normalizeAnswer(raw: Record<string, unknown>, version: number): Answer {
  const status = raw.status;
  if (typeof status !== 'string' || !statuses.has(status)) throw new Error('审核状态无效');

  const remediationStatus = raw.remediationStatus === undefined && version === 1
    ? 'pending'
    : asBoundedString(raw.remediationStatus, '整改状态', 20);
  if (!remediationStatuses.has(remediationStatus)) throw new Error('整改状态无效');

  const due = asBoundedString(raw.due, '整改期限', 10, true);
  if (due && !isIsoDate(due)) throw new Error('整改期限必须是有效的YYYY-MM-DD日期');

  return {
    status: status as Answer['status'],
    evidence: asBoundedString(raw.evidence, '证据编号或位置', MAX_EVIDENCE_TEXT, true),
    owner: asBoundedString(raw.owner, '整改负责人', MAX_PROFILE_TEXT, true),
    due,
    action: asBoundedString(raw.action, '整改措施', MAX_REMEDIATION_TEXT, true),
    note: asBoundedString(raw.note, '不适用理由', MAX_NOTE_TEXT, true),
    remediationStatus: remediationStatus as RemediationStatus,
  };
}

/**
 * Accepts only explicitly supported archive versions and known answer IDs.
 * Throws on any lossy or unsafe input so callers can preserve their current draft.
 */
export function normalizeAuditState(raw: unknown, defaultProfile: Profile, defaultAnswers: Answers): AuditState {
  if (!isRecord(raw) || !isRecord(raw.profile) || !isRecord(raw.answers)) {
    throw new Error('JSON档案缺少有效的单位画像或审核答案');
  }

  const version = raw.version;
  if (!Number.isInteger(version) || typeof version !== 'number' || version < 1 || version > SCHEMA_VERSION) {
    throw new Error('JSON档案版本不受支持；请使用本工具导出的兼容版本。');
  }

  const savedAt = asBoundedString(raw.savedAt, '档案保存时间', 40);
  if (!isIsoInstant(savedAt)) throw new Error('档案保存时间无效');

  const allowedIds = new Set(Object.keys(defaultAnswers));
  const incomingIds = Object.keys(raw.answers);
  if (incomingIds.length > allowedIds.size) throw new Error('审核答案数量超过当前标准库允许范围');

  const answers = cloneDefaultAnswers(defaultAnswers);
  for (const id of incomingIds) {
    if (forbiddenKeys.has(id) || !allowedIds.has(id)) throw new Error(`发现不受支持的审核项编号：${id}`);
    const rawAnswer = raw.answers[id];
    if (!isRecord(rawAnswer)) throw new Error(`审核项“${id}”格式无效`);
    answers[id] = normalizeAnswer(rawAnswer, version);
  }

  return {
    version: SCHEMA_VERSION,
    profile: normalizeProfile(raw.profile, version, defaultProfile),
    answers,
    savedAt,
  };
}

export const saveAudit = (state: AuditState): StorageResult => {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...state, version: SCHEMA_VERSION }));
    return { ok: true };
  } catch {
    return failStorage();
  }
};

export const loadAudit = (defaultProfile: Profile, defaultAnswers: Answers): LoadAuditResult => {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
    if (!raw) return { state: null };
    return { state: normalizeAuditState(JSON.parse(raw), defaultProfile, defaultAnswers) };
  } catch (error) {
    return {
      state: null,
      issue: {
        message: error instanceof Error ? `未恢复本机草稿：${error.message}` : '未恢复本机草稿：浏览器存储不可用。',
        raw: raw ?? undefined,
      },
    };
  }
};

export const clearAudit = (): StorageResult => {
  try {
    localStorage.removeItem(KEY);
    return { ok: true };
  } catch {
    return failStorage();
  }
};

const saveBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const downloadJson = (state: AuditState) => saveBlob(
  new Blob([JSON.stringify({ ...state, version: SCHEMA_VERSION }, null, 2)], { type: 'application/json;charset=utf-8' }),
  `${state.profile.name || '单位'}-内保审核.json`,
);

export const downloadRawAudit = (raw: string) => saveBlob(
  new Blob([raw], { type: 'application/json;charset=utf-8' }),
  `内保审核-原始草稿-待恢复.json`,
);

export const readJsonFile = (file: File, defaultProfile: Profile, defaultAnswers: Answers) => new Promise<AuditState>((resolve, reject) => {
  if (file.size > MAX_IMPORT_BYTES) {
    reject(new Error(`JSON档案超过${MAX_IMPORT_BYTES / 1024 / 1024}MiB限制；请拆分或精简证据文本后重试。`));
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    try {
      resolve(normalizeAuditState(JSON.parse(String(reader.result)), defaultProfile, defaultAnswers));
    } catch (error) {
      reject(error instanceof Error ? error : new Error('JSON文件格式无效'));
    }
  };
  reader.onerror = () => reject(new Error('读取文件失败'));
  reader.readAsText(file, 'utf-8');
});

export const createBlankAnswers = (ids: string[]) => {
  const answers = Object.create(null) as Answers;
  for (const id of ids) answers[id] = emptyAnswer();
  return answers;
};
