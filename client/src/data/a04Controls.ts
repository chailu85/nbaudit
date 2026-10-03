import catalogJson from './a04ControlCatalog.json';
import { defaultA04Profile, type A04ControlDetails, type A04Fact, type A04ProfileFacts } from './a04Types';
import type { Criterion, Profile } from './criteria';

export type A04Basis = { sourceId: string; clause: string; strength: string; pdfPage?: number | null; printedPage?: number | null };
export type A04StructuredRule = {
  type: 'minimum' | 'maximum' | 'conditional_presence' | 'retention' | 'frequency' | 'maximum_gap' | 'deadline';
  field?: string;
  unit?: string;
  operator?: '>=' | '<=';
  threshold?: number;
  thresholdByLevel?: Record<string, number>;
  triggerOperator?: '<' | '<=' | '>' | '>=';
  triggerThreshold?: number;
  ruleByLevel?: Record<string, string>;
  categories?: string[];
  requiredVersion?: string;
  checkLastToAuditTime?: boolean;
  startCounting?: string;
};
export type A04CatalogControl = {
  id: string;
  topic: string;
  title: string;
  module: string;
  applicability: string;
  acceptanceRule: string;
  requiredEvidence: string[];
  accountableOwner: string;
  basis: A04Basis[];
  tests: string[];
  structuredRule: A04StructuredRule | null;
  legacyLinks: string[];
  scoringLane: 'db_current' | 'external_current' | 'practice';
  implementationPriority: 'P1' | 'P2';
  evaluationMode: string;
  remediation: string[];
  closureEvidence: string;
  reviewStatus: string;
  originCategory: 'domestic_control' | 'international_method_supplement';
  uiBadge: string;
  contributesToDomesticScore: boolean;
  requiresDomesticApplicabilityApproval: boolean;
  domesticAnchors: string[];
  supplementOf: string[];
  supplementReason: string;
  extraTargetsMustBeLabeledAsInternalPolicy: boolean;
  acceptanceScope?: string;
};

type A04Catalog = { schemaVersion: string; date: string; sources: { id: string; title: string; kind: string; originCategory: string }[]; controls: A04CatalogControl[] };
const catalog = catalogJson as unknown as A04Catalog;
const sourceById = new Map(catalog.sources.map(source => [source.id, source]));

export const A04_CONTROL_SET_VERSION = catalog.schemaVersion;
export const a04CatalogControls = catalog.controls;
export const a04ControlById = new Map(a04CatalogControls.map(control => [control.id, control]));

const fact = (value: A04Fact) => value !== 'no';
const facts = (profile: Profile) => ({ ...defaultA04Profile, ...profile.a04 });
const levelOrder = { '未确定': 0, '三级': 1, '二级': 2, '一级': 3 } as const;
const atLeast = (profile: Profile, level: '三级' | '二级' | '一级') => profile.keyCandidate && levelOrder[profile.keyProtectionLevel] >= levelOrder[level];
const engineering = (profile: Profile) => facts(profile).engineeringStage !== 'not_applicable';
const gb = (profile: Profile) => fact(facts(profile).gb55029Applicable) || fact(facts(profile).gbHighRiskObject);
const highRisk = (profile: Profile) => fact(facts(profile).gbHighRiskObject);
type A04FactKey = { [K in keyof A04ProfileFacts]: A04ProfileFacts[K] extends A04Fact ? K : never }[keyof A04ProfileFacts];
const has = (profile: Profile, name: A04FactKey) => fact(facts(profile)[name] as A04Fact);

/** Conditions are explicit, conservative and never execute catalog prose. Unknown facts stay visible for review; only a recorded “no” removes an asset-specific control. */
export function a04Applies(control: A04CatalogControl, profile: Profile) {
  const id = control.id;
  const f = facts(profile);
  // 补充控制始终保留在档案、整改与导出范围；界面开关仅决定是否在审核列表中展开。
  if (control.scoringLane === 'practice') return true;

  if (id === 'A04-BAR-01') return !profile.keyCandidate;
  if (['A04-BAR-02', 'A04-BAR-03', 'A04-BAR-04'].includes(id)) return profile.keyCandidate;
  if (id === 'A04-BAR-05') return profile.keyCandidate && has(profile, 'undergroundCrossing');
  if (['A04-BAR-06', 'A04-BAR-07', 'A04-BAR-08'].includes(id)) return gb(profile) && (id !== 'A04-BAR-07' || highRisk(profile));
  if (id === 'A04-BAR-09') return atLeast(profile, '二级') && has(profile, 'lowAirIntake');

  if (id === 'A04-DOOR-01') return atLeast(profile, '二级') && has(profile, 'guardhouseExteriorDoor');
  if (id === 'A04-DOOR-02') return gb(profile) && has(profile, 'securityDoorInstalled');
  if (id === 'A04-DOOR-03') return gb(profile) && has(profile, 'specialDoorOrStorage');
  if (id === 'A04-DOOR-04') return gb(profile) && has(profile, 'accessControlSystem');

  if (id.startsWith('A04-L1-')) {
    if (!atLeast(profile, '一级')) return false;
    // 一级平台、主出入口、重要建筑周边/入口/执勤岗控制本身是应核验对象；
    // “未设置”是缺口，不是通过资产字段把控制从分母移除。仅L1-15以共用建筑为条件。
    if (id === 'A04-L1-15') return has(profile, 'sharedImportantBuilding');
    return true;
  }

  if (id === 'A04-REC-01') return true;
  if (id === 'A04-REC-02' || id === 'A04-REC-04' || id === 'A04-REC-14' || id === 'A04-REC-15') return profile.keyCandidate;
  if (id === 'A04-REC-03') return has(profile, 'patrolSystem');
  if (id === 'A04-REC-05') return has(profile, 'alarmSystem');
  if (id === 'A04-REC-06') return has(profile, 'accessControlSystem');
  if (id === 'A04-REC-07') return has(profile, 'patrolSystem');
  if (id === 'A04-REC-08') return has(profile, 'videoSystem');
  if (id === 'A04-REC-09' || id === 'A04-REC-16') return engineering(profile);
  if (id === 'A04-REC-10') return gb(profile) && ['construction', 'commissioning'].includes(f.engineeringStage);
  if (id === 'A04-REC-11' || id === 'A04-REC-13') return has(profile, 'personalDataProcessing');
  if (id === 'A04-REC-12') return has(profile, 'networkOperator');

  if (id === 'A04-FRQ-01' || id === 'A04-FRQ-04' || id === 'A04-FRQ-17') return true;
  if (['A04-FRQ-02', 'A04-FRQ-03', 'A04-FRQ-05', 'A04-FRQ-06', 'A04-FRQ-07', 'A04-FRQ-09', 'A04-FRQ-10', 'A04-FRQ-11', 'A04-FRQ-16'].includes(id)) return profile.keyCandidate;
  if (id === 'A04-FRQ-08') return !profile.keyCandidate;
  if (id === 'A04-FRQ-12') return atLeast(profile, '二级') && has(profile, 'controlCenter');
  if (['A04-FRQ-13', 'A04-FRQ-14', 'A04-FRQ-15'].includes(id)) return engineering(profile);

  if (id.startsWith('A04-PRI-')) {
    if (id === 'A04-PRI-04') return has(profile, 'secretAdjacentUnit');
    if (['A04-PRI-10', 'A04-PRI-11', 'A04-PRI-13'].includes(id)) return has(profile, 'faceRecognition');
    if (id === 'A04-PRI-08' || id === 'A04-PRI-12') return f.publicVideoContext === 'article7' || f.publicVideoContext === 'unknown';
    if (id === 'A04-PRI-03' || id === 'A04-PRI-14') return has(profile, 'videoSystem');
    return has(profile, 'personalDataProcessing') || has(profile, 'videoSystem') || has(profile, 'accessControlSystem');
  }

  if (id.startsWith('A04-GB-')) {
    if (!gb(profile)) return false;
    const number = Number(id.slice(-2));
    if (number >= 1 && number <= 9) return highRisk(profile) && engineering(profile);
    if (number >= 10 && number <= 12) return engineering(profile);
    if (number >= 13 && number <= 19) return has(profile, 'alarmSystem');
    if (number >= 20 && number <= 21) return has(profile, 'videoSystem');
    if (number >= 22 && number <= 24) return has(profile, 'accessControlSystem');
    if (number >= 25 && number <= 26) return has(profile, 'parkingSystem');
    if (number >= 27 && number <= 29) return has(profile, 'securityCheckSystem');
    if (number === 30) return has(profile, 'patrolSystem');
    if (number >= 31 && number <= 33) return engineering(profile);
    return f.engineeringStage === 'operation' || f.engineeringStage === 'unknown';
  }
  return true;
}

const isRecommendation = (control: A04CatalogControl) => control.scoringLane !== 'practice'
  && control.basis.length > 0
  && control.basis.every(basis => basis.strength.includes('宜'));
const toModule = (module: string) => module === 'personnel' ? 'people' : module;
const basis = (control: A04CatalogControl) => control.basis.map(item => {
  const source = sourceById.get(item.sourceId);
  return { kind: 'current' as const, source: source?.title ?? item.sourceId, clause: item.clause, note: `${item.strength}｜${source?.kind ?? '来源待核'}` };
});

export const a04Criteria: Criterion[] = a04CatalogControls.map(control => {
  const supplemental = control.scoringLane === 'practice';
  const recommendation = isRecommendation(control);
  return {
    id: control.id,
    module: toModule(control.module),
    title: control.title,
    prompt: control.acceptanceRule,
    evidence: control.requiredEvidence.join('；'),
    weight: supplemental ? 1 : control.scoringLane === 'external_current' ? 3 : 2,
    applies: profile => a04Applies(control, profile),
    recommendation: recommendation ? () => true : undefined,
    scoreContribution: supplemental ? 'supplemental' : 'domestic',
    hardRequirement: !supplemental && !recommendation,
    basis: basis(control),
    controlMeta: {
      controlSetVersion: A04_CONTROL_SET_VERSION,
      originCategory: control.originCategory,
      uiBadge: control.uiBadge,
      scoringLane: control.scoringLane,
      applicability: control.applicability,
      acceptanceRule: control.acceptanceRule,
      requiredEvidence: control.requiredEvidence,
      sourceRequirements: control.basis.map(item => ({ sourceId: item.sourceId, source: sourceById.get(item.sourceId)?.title ?? item.sourceId, clause: item.clause, strength: item.strength })),
      accountableOwner: control.accountableOwner,
      legacyLinks: control.legacyLinks,
      structuredRule: control.structuredRule ?? undefined,
      remediation: control.remediation,
      closureEvidence: control.closureEvidence,
      reviewStatus: control.reviewStatus,
      domesticAnchors: control.domesticAnchors,
      supplementOf: control.supplementOf,
      supplementReason: control.supplementReason,
      requiresDomesticApplicabilityApproval: control.requiresDomesticApplicabilityApproval,
      cannotBeNaWhenActive: control.id === 'A04-L1-08',
    },
  };
});

export type A04RuleEvaluation = { state: 'pending' | 'pass' | 'fail' | 'triggered'; message: string; threshold?: number; unit?: string };
export function evaluateA04Rule(criterion: Criterion, profile: Profile, details?: A04ControlDetails): A04RuleEvaluation | null {
  const rule = criterion.controlMeta?.structuredRule as A04StructuredRule | undefined;
  if (!rule) return null;
  if (rule.ruleByLevel) return { state: 'pending', message: `按当前防范级别：${rule.ruleByLevel[{ '未确定': 'unknown', '三级': 'level3', '二级': 'level2', '一级': 'level1' }[profile.keyProtectionLevel]] ?? '需人工核验'}` };
  const valueText = details?.measuredValue?.trim();
  if (!valueText) return { state: 'pending', message: `填写实测值后按${rule.type}规则核验${rule.unit ? `（单位：${rule.unit}）` : ''}` };
  const value = Number(valueText);
  if (!Number.isFinite(value) || value < 0) return { state: 'fail', message: '实测值必须为非负有限数值。' };
  if (rule.unit && details?.measuredUnit && details.measuredUnit !== rule.unit) return { state: 'fail', message: `单位应为${rule.unit}，当前为${details.measuredUnit}。`, unit: rule.unit };
  const levelKey = ({ '未确定': 'unknown', '三级': 'level3', '二级': 'level2', '一级': 'level1' } as const)[profile.keyProtectionLevel];
  const threshold = rule.thresholdByLevel?.[levelKey] ?? rule.threshold;
  if (rule.type === 'conditional_presence') {
    const triggered = rule.triggerOperator === '<' ? value < (rule.triggerThreshold ?? 0) : value <= (rule.triggerThreshold ?? 0);
    return triggered
      ? { state: 'triggered', message: `触发条件成立：需另行核验隔离/防护设置。`, threshold: rule.triggerThreshold, unit: rule.unit }
      : { state: 'pass', message: '未触发本项条件。', threshold: rule.triggerThreshold, unit: rule.unit };
  }
  if (threshold === undefined || !rule.operator) return { state: 'pending', message: '该结构化规则需要人工核验。' };
  const pass = rule.operator === '>=' ? value >= threshold : value <= threshold;
  return { state: pass ? 'pass' : 'fail', message: `${value}${rule.unit ?? ''} ${rule.operator} ${threshold}${rule.unit ?? ''}：${pass ? '满足' : '不满足'}。`, threshold, unit: rule.unit };
}

export const a04ScopePending = (profile: Profile, active: Criterion[]) => !facts(profile).scopeApproved
  && active.some(criterion => criterion.controlMeta?.requiresDomesticApplicabilityApproval && criterion.scoreContribution !== 'supplemental');
