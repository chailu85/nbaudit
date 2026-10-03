import { criteria, Profile, unitTypes, type Criterion } from '@/data/criteria';
import { A04_CONTROL_SET_VERSION, a04ControlById, type A04StructuredRule } from '@/data/a04Controls';
import { defaultA04Profile, emptyA04Details, type A04ControlDetails, type A04ProfileFacts } from '@/data/a04Types';
import { Answer, Answers, closureMissingFields, emptyAnswer, RemediationStatus } from './scoring';

const KEY = 'neibao-audit-v1';
export const SCHEMA_VERSION = 5;
export const MAX_IMPORT_BYTES = 1024 * 1024;
const MAX_PROFILE_TEXT = 300;
const MAX_EVIDENCE_TEXT = 4_000;
const MAX_REMEDIATION_TEXT = 6_000;
const MAX_NOTE_TEXT = 2_000;
const MAX_A04_ASSERTIONS = 40;

export type AuditState = { version: number; controlSetVersion: string; profile: Profile; answers: Answers; savedAt: string };
export type A04ControlExportMetadata = { id: string; originCategory: string; uiBadge: string; contributesToDomesticScore: boolean; domesticAnchors: string[]; sourceRequirements: { sourceId: string; source: string; clause: string; strength: string }[] };
export type StorageResult = { ok: true } | { ok: false; message: string };
export type LoadAuditResult = { state: AuditState | null; issue?: { message: string; raw?: string } };

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const statuses = new Set(['unreviewed', 'compliant', 'partial', 'noncompliant', 'na']);
const remediationStatuses = new Set(['pending', 'in_progress', 'review', 'closed']);
const keyProtectionLevels = new Set(['未确定', '三级', '二级', '一级']);
const a04FactValues = new Set(['unknown', 'yes', 'no']);
const a04Stages = new Set(['unknown', 'not_applicable', 'design', 'construction', 'commissioning', 'operation']);
const publicVideoContexts = new Set(['unknown', 'none', 'article7', 'article9_exception']);
const forbiddenKeys = new Set(['__proto__', 'constructor', 'prototype']);
const profileStringKeys = ['name', 'region', 'industry', 'reviewer'] as const;
const profileBooleanKeys = ['multiSite', 'keyCandidate', 'secret', 'dangerous', 'crowded', 'dataStorage'] as const;
const unitTypeSet = new Set<string>(unitTypes);
const a04FactKeys = ['gb55029Applicable', 'gbHighRiskObject', 'alarmSystem', 'videoSystem', 'accessControlSystem', 'patrolSystem', 'parkingSystem', 'securityCheckSystem', 'faceRecognition', 'personalDataProcessing', 'secretAdjacentUnit', 'undergroundCrossing', 'lowAirIntake', 'guardhouseExteriorDoor', 'securityDoorInstalled', 'specialDoorOrStorage', 'sharedImportantBuilding', 'controlCenter', 'networkOperator'] as const;

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
  && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString() === value;
const isIsoDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
};
const optionalIsoDate = (value: string, label: string) => {
  if (value && !isIsoDate(value)) throw new Error(`${label}必须是有效的YYYY-MM-DD日期`);
  return value;
};

const failStorage = () => ({ ok: false as const, message: '本机浏览器存储不可用或空间不足；当前页面草稿仍在内存中，请立即导出JSON备份。' });
const cloneDetails = (details: A04ControlDetails) => ({ ...details, subAssertions: details.subAssertions.map(assertion => ({ ...assertion })), sourceAssessments: details.sourceAssessments.map(source => ({ ...source })) });
const cloneDefaultAnswers = (defaultAnswers: Answers) => {
  const answers = Object.create(null) as Answers;
  for (const [id, answer] of Object.entries(defaultAnswers)) answers[id] = { ...answer, a04: cloneDetails(answer.a04) };
  return answers;
};

function normalizeA04Profile(raw: unknown, version: number, defaultProfile: Profile): A04ProfileFacts {
  if (raw === undefined && version < 4) return { ...defaultA04Profile, ...(defaultProfile.a04 ?? {}) };
  if (!isRecord(raw)) throw new Error('A04适用性画像格式无效');
  const next = { ...defaultA04Profile };
  if (typeof raw.scopeApproved !== 'boolean' || typeof raw.showSupplemental !== 'boolean') throw new Error('A04适用性确认字段无效');
  next.scopeApproved = raw.scopeApproved;
  next.showSupplemental = raw.showSupplemental;
  for (const key of a04FactKeys) {
    if (typeof raw[key] !== 'string' || !a04FactValues.has(raw[key] as string)) throw new Error(`A04适用性字段“${key}”无效`);
    next[key] = raw[key] as A04ProfileFacts[typeof key];
  }
  if (typeof raw.engineeringStage !== 'string' || !a04Stages.has(raw.engineeringStage)) throw new Error('A04工程阶段无效');
  next.engineeringStage = raw.engineeringStage as A04ProfileFacts['engineeringStage'];
  if (typeof raw.publicVideoContext !== 'string' || !publicVideoContexts.has(raw.publicVideoContext)) throw new Error('公共视频场所类型无效');
  next.publicVideoContext = raw.publicVideoContext as A04ProfileFacts['publicVideoContext'];
  return next;
}

function normalizeProfile(raw: Record<string, unknown>, version: number, defaultProfile: Profile): Profile {
  for (const key of profileStringKeys) asBoundedString(raw[key], `单位画像字段“${key}”`, MAX_PROFILE_TEXT);
  for (const key of profileBooleanKeys) requiredBoolean(raw, key);
  const reviewDate = asBoundedString(raw.reviewDate, '审核日期', 10);
  if (!isIsoDate(reviewDate)) throw new Error('审核日期必须是有效的YYYY-MM-DD日期');
  const unitType = asBoundedString(raw.unitType, '单位类型', MAX_PROFILE_TEXT);
  if (!unitTypeSet.has(unitType)) throw new Error('单位类型无效');
  const rawLevel = raw.keyProtectionLevel;
  const keyProtectionLevel = rawLevel === undefined && version === 1 ? '未确定' : asBoundedString(rawLevel, '重点单位防范级别', 10);
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
    a04: normalizeA04Profile(raw.a04, version, defaultProfile),
  };
}

function normalizeA04Details(raw: unknown, version: number, id: string): A04ControlDetails {
  if (raw === undefined && version < 4) return emptyA04Details(true);
  if (!isRecord(raw)) throw new Error(`审核项“${id}”的A04明细格式无效`);
  const detail = emptyA04Details();
  const stringFields: (keyof Omit<A04ControlDetails, 'needsReview' | 'subAssertions' | 'sourceAssessments'>)[] = ['objectLocation', 'applicabilityReason', 'sourceApplicability', 'measuredValue', 'measuredUnit', 'naBasis', 'reviewReason', 'deadlineSource', 'temporaryProtection', 'verificationEvidence', 'verifier', 'verifiedAt', 'closedAt'];
  for (const key of stringFields) detail[key] = asBoundedString(raw[key], `审核项“${id}”的${key}`, key === 'verificationEvidence' ? MAX_EVIDENCE_TEXT : MAX_NOTE_TEXT, true) as never;
  optionalIsoDate(detail.verifiedAt, `审核项“${id}”复核日期`);
  optionalIsoDate(detail.closedAt, `审核项“${id}”关闭日期`);
  if (typeof raw.needsReview !== 'boolean') throw new Error(`审核项“${id}”的待复核标记无效`);
  detail.needsReview = raw.needsReview;
  if (!Array.isArray(raw.subAssertions) || raw.subAssertions.length > MAX_A04_ASSERTIONS) throw new Error(`审核项“${id}”的子断言数量无效`);
  detail.subAssertions = raw.subAssertions.map((item, index) => {
    if (!isRecord(item) || forbiddenKeys.has(String(item.id))) throw new Error(`审核项“${id}”的子断言${index + 1}格式无效`);
    const status = asBoundedString(item.status, '子断言状态', 20);
    if (!statuses.has(status)) throw new Error(`审核项“${id}”的子断言状态无效`);
    return {
      id: asBoundedString(item.id, '子断言编号', 80),
      label: asBoundedString(item.label, '子断言名称', MAX_PROFILE_TEXT),
      status: status as A04ControlDetails['subAssertions'][number]['status'],
      evidence: asBoundedString(item.evidence, '子断言证据', MAX_EVIDENCE_TEXT, true),
      remediation: asBoundedString(item.remediation, '子断言整改', MAX_REMEDIATION_TEXT, true),
    };
  });
  const rawSourceAssessments = raw.sourceAssessments === undefined && version < 5 ? [] : raw.sourceAssessments;
  if (!Array.isArray(rawSourceAssessments) || rawSourceAssessments.length > MAX_A04_ASSERTIONS) throw new Error(`审核项“${id}”的逐来源适用性数量无效`);
  detail.sourceAssessments = rawSourceAssessments.map((item, index) => {
    if (!isRecord(item) || forbiddenKeys.has(String(item.sourceId))) throw new Error(`审核项“${id}”的逐来源适用性${index + 1}格式无效`);
    const applicability = asBoundedString(item.applicability, '逐来源适用性状态', 20);
    if (!['unknown', 'applicable', 'excluded'].includes(applicability)) throw new Error(`审核项“${id}”的逐来源适用性状态无效`);
    const conclusion = asBoundedString(item.conclusion, '逐来源结论', 20);
    if (!statuses.has(conclusion)) throw new Error(`审核项“${id}”的逐来源结论无效`);
    return {
      sourceId: asBoundedString(item.sourceId, '逐来源编号', 80),
      clause: asBoundedString(item.clause, '逐来源条款', MAX_PROFILE_TEXT),
      applicability: applicability as A04ControlDetails['sourceAssessments'][number]['applicability'],
      rationale: asBoundedString(item.rationale, '逐来源适用理由', MAX_NOTE_TEXT, true),
      evidence: asBoundedString(item.evidence, '逐来源证据', MAX_EVIDENCE_TEXT, true),
      conclusion: conclusion as A04ControlDetails['sourceAssessments'][number]['conclusion'],
    };
  });
  if (detail.measuredValue) {
    const value = Number(detail.measuredValue);
    if (!Number.isFinite(value) || value < 0) throw new Error(`审核项“${id}”实测值必须为非负有限数值`);
    const rule = a04ControlById.get(id)?.structuredRule as A04StructuredRule | null | undefined;
    if (rule?.unit && detail.measuredUnit && detail.measuredUnit !== rule.unit) throw new Error(`审核项“${id}”实测单位应为${rule.unit}`);
  }
  return detail;
}

function normalizeAnswer(raw: Record<string, unknown>, version: number, id: string): Answer {
  const status = raw.status;
  if (typeof status !== 'string' || !statuses.has(status)) throw new Error('审核状态无效');
  const remediationStatus = raw.remediationStatus === undefined && version === 1 ? 'pending' : asBoundedString(raw.remediationStatus, '整改状态', 20);
  if (!remediationStatuses.has(remediationStatus)) throw new Error('整改状态无效');
  const due = asBoundedString(raw.due, '整改期限', 10, true);
  if (due && !isIsoDate(due)) throw new Error('整改期限必须是有效的YYYY-MM-DD日期');
  const answer: Answer = {
    status: status as Answer['status'],
    evidence: asBoundedString(raw.evidence, '证据编号或位置', MAX_EVIDENCE_TEXT, true),
    owner: asBoundedString(raw.owner, '整改负责人', MAX_PROFILE_TEXT, true),
    due,
    action: asBoundedString(raw.action, '整改措施', MAX_REMEDIATION_TEXT, true),
    note: asBoundedString(raw.note, '不适用理由', MAX_NOTE_TEXT, true),
    remediationStatus: remediationStatus as RemediationStatus,
    a04: normalizeA04Details(raw.a04, version, id),
  };
  if (answer.remediationStatus === 'closed') {
    const missing = closureMissingFields(answer);
    if (missing.length) {
      answer.remediationStatus = 'pending';
      answer.a04.reviewReason = [answer.a04.reviewReason, `导入档案原“已关闭”状态因缺少${missing.join('、')}已降级为待整改`].filter(Boolean).join('；');
    }
  }
  return answer;
}

/** Accepts explicitly supported archives only. Legacy answers survive; new A04 atomics are intentionally never inferred as compliant. */
export function normalizeAuditState(raw: unknown, defaultProfile: Profile, defaultAnswers: Answers): AuditState {
  if (!isRecord(raw) || !isRecord(raw.profile) || !isRecord(raw.answers)) throw new Error('JSON档案缺少有效的单位画像或审核答案');
  const version = raw.version;
  if (!Number.isInteger(version) || typeof version !== 'number' || version < 1 || version > SCHEMA_VERSION) throw new Error('JSON档案版本不受支持；请使用本工具导出的兼容版本。');
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
    answers[id] = normalizeAnswer(rawAnswer, version, id);
  }
  return { version: SCHEMA_VERSION, controlSetVersion: A04_CONTROL_SET_VERSION, profile: normalizeProfile(raw.profile, version, defaultProfile), answers, savedAt };
}

export const saveAudit = (state: AuditState): StorageResult => {
  try { localStorage.setItem(KEY, JSON.stringify({ ...state, version: SCHEMA_VERSION, controlSetVersion: A04_CONTROL_SET_VERSION })); return { ok: true }; } catch { return failStorage(); }
};
export const loadAudit = (defaultProfile: Profile, defaultAnswers: Answers): LoadAuditResult => {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
    if (!raw) return { state: null };
    return { state: normalizeAuditState(JSON.parse(raw), defaultProfile, defaultAnswers) };
  } catch (error) {
    return { state: null, issue: { message: error instanceof Error ? `未恢复本机草稿：${error.message}` : '未恢复本机草稿：浏览器存储不可用。', raw: raw ?? undefined } };
  }
};
export const clearAudit = (): StorageResult => { try { localStorage.removeItem(KEY); return { ok: true }; } catch { return failStorage(); } };
const saveBlob = (blob: Blob, filename: string) => { const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; anchor.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000); };
export const a04ControlExportMetadata = (): A04ControlExportMetadata[] => criteria.filter(item => item.controlMeta).map(item => ({ id: item.id, originCategory: item.controlMeta!.originCategory, uiBadge: item.controlMeta!.uiBadge, contributesToDomesticScore: item.scoreContribution !== 'supplemental', domesticAnchors: item.controlMeta!.domesticAnchors, sourceRequirements: item.controlMeta!.sourceRequirements }));
export const downloadJson = (state: AuditState) => saveBlob(new Blob([JSON.stringify({ ...state, version: SCHEMA_VERSION, controlSetVersion: A04_CONTROL_SET_VERSION, controlMetadata: a04ControlExportMetadata() }, null, 2)], { type: 'application/json;charset=utf-8' }), `${state.profile.name || '单位'}-内保审核.json`);
export const downloadRawAudit = (raw: string) => saveBlob(new Blob([raw], { type: 'application/json;charset=utf-8' }), '内保审核-原始草稿-待恢复.json');
export const readJsonFile = (file: File, defaultProfile: Profile, defaultAnswers: Answers) => new Promise<AuditState>((resolve, reject) => {
  if (file.size > MAX_IMPORT_BYTES) { reject(new Error(`JSON档案超过${MAX_IMPORT_BYTES / 1024 / 1024}MiB限制；请拆分或精简证据文本后重试。`)); return; }
  const reader = new FileReader();
  reader.onload = () => { try { resolve(normalizeAuditState(JSON.parse(String(reader.result)), defaultProfile, defaultAnswers)); } catch (error) { reject(error instanceof Error ? error : new Error('JSON文件格式无效')); } };
  reader.onerror = () => reject(new Error('读取文件失败'));
  reader.readAsText(file, 'utf-8');
});
export const createBlankAnswers = (items: string[] | Criterion[]) => {
  const answers = Object.create(null) as Answers;
  for (const item of items) {
    const id = typeof item === 'string' ? item : item.id;
    answers[id] = emptyAnswer(false);
  }
  return answers;
};
