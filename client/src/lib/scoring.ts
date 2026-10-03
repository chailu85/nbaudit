import { Criterion, Profile, Status } from '@/data/criteria';
import { a04ScopePending, evaluateA04Rule } from '@/data/a04Controls';
import { emptyA04Details, type A04ControlDetails } from '@/data/a04Types';

export type RemediationStatus = 'pending' | 'in_progress' | 'review' | 'closed';
export type Answer = { status: Status; evidence: string; owner: string; due: string; action: string; note: string; remediationStatus: RemediationStatus; a04: A04ControlDetails };
export type Answers = Record<string, Answer>;
export type ReviewReasonCode = 'key_unit_review' | 'key_level_unconfirmed' | 'special_risk' | 'missing_na_reason' | 'a04_scope_pending' | 'a04_atomic_review' | 'invalid_na' | 'invalid_remediation_close';
export type ReviewReason = { code: ReviewReasonCode; title: string; detail: string; criterionIds?: string[] };

export const emptyAnswer = (a04NeedsReview = false): Answer => ({ status: 'unreviewed', evidence: '', owner: '', due: '', action: '', note: '', remediationStatus: 'pending', a04: emptyA04Details(a04NeedsReview) });
export const applicable = (criterion: Criterion, profile: Profile) => !criterion.applies || criterion.applies(profile);
export const activeCriteria = (items: Criterion[], profile: Profile) => items.filter(item => applicable(item, profile));
const answerOf = (answers: Answers, id: string) => answers[id] ?? emptyAnswer();
const specialRiskLabels = (profile: Profile) => [profile.secret ? '涉密载体/国家秘密' : '', profile.dangerous ? '危险物品/菌种/武器弹药' : '', profile.crowded ? '人员密集或大型活动场所' : '', profile.dataStorage ? '重要数据存储或重要高科技/互联网业务' : ''].filter(Boolean);
export const reviewReasonText = (reason: ReviewReason) => `${reason.title}：${reason.detail}`;

const naRationale = (answer: Answer) => answer.note.trim() || answer.a04.naBasis.trim();
const isPlaceholderNa = (value: string) => /^(未安装|没有安装|未设置|无平台|无此设备|无设备|未配备)[。；;，,\s]*$/.test(value.trim());
const sourceStatus = (criterion: Criterion, answer: Answer) => criterion.controlMeta?.sourceRequirements.map(requirement => answer.a04.sourceAssessments.find(item => item.sourceId === requirement.sourceId && item.clause === requirement.clause)) ?? [];

/** Returns the status actually used for score, findings and export. A parent click cannot override failed measurement, failed child assertion, mandatory source review, or prohibited NA. */
export function effectiveStatus(criterion: Criterion, answer: Answer, profile: Profile): Status {
  const meta = criterion.controlMeta;
  if (!meta) return answer.status;
  if (answer.status === 'na') {
    if (meta.cannotBeNaWhenActive || !naRationale(answer) || isPlaceholderNa(naRationale(answer))) return 'noncompliant';
    return 'na';
  }
  const rule = evaluateA04Rule(criterion, profile, answer.a04);
  if (rule?.state === 'fail') return 'noncompliant';
  const children = answer.a04.subAssertions;
  if (children.length) {
    if (children.some(item => item.status === 'noncompliant')) return 'noncompliant';
    if (children.some(item => item.status === 'partial' || item.status === 'unreviewed')) return answer.status === 'compliant' ? 'partial' : answer.status;
  }
  if (rule?.state === 'pending' && !('ruleByLevel' in (meta.structuredRule ?? {})) && answer.status === 'compliant') return 'partial';
  if (rule?.state === 'triggered' && !children.length && answer.status === 'compliant') return 'partial';
  const requirements = meta.sourceRequirements;
  if (requirements.length && criterion.scoreContribution !== 'supplemental' && answer.status === 'compliant') {
    const statuses = sourceStatus(criterion, answer);
    if (statuses.some(item => !item || item.applicability === 'unknown' || (item.applicability === 'excluded' && !item.rationale.trim()))) return 'partial';
    const applicableSources = statuses.filter(item => item?.applicability === 'applicable');
    if (!applicableSources.length) return 'partial';
    if (statuses.some(item => item?.applicability === 'applicable' && item.conclusion === 'noncompliant')) return 'noncompliant';
    if (statuses.some(item => item?.applicability === 'applicable' && ['partial', 'unreviewed', 'na'].includes(item.conclusion))) return 'partial';
  }
  return answer.status;
}

export const closureMissingFields = (answer: Answer) => {
  const fields: string[] = [];
  if (!answer.owner.trim()) fields.push('整改负责人');
  if (!answer.due) fields.push('整改期限');
  if (!answer.action.trim()) fields.push('整改措施');
  if (!answer.a04.temporaryProtection.trim()) fields.push('整改期间临时防范');
  if (!answer.a04.verificationEvidence.trim()) fields.push('复核证据');
  if (!answer.a04.verifier.trim()) fields.push('复核人员');
  if (!answer.a04.verifiedAt) fields.push('复核日期');
  return fields;
};
export const canCloseRemediation = (answer: Answer) => closureMissingFields(answer).length === 0;

const deDuplicateParents = (items: Criterion[]) => { const expandedParents = new Set(items.flatMap(item => item.controlMeta?.legacyLinks ?? [])); return items.filter(item => !expandedParents.has(item.id)); };
const weightedCompletion = (items: Criterion[], answers: Answers, profile: Profile) => {
  const max = items.reduce((total, item) => total + item.weight, 0);
  const earned = items.reduce((total, item) => { const status = effectiveStatus(item, answerOf(answers, item.id), profile); return total + (status === 'compliant' ? item.weight : status === 'partial' ? item.weight * 0.5 : 0); }, 0);
  return { max, earned, completion: max ? Math.round((earned / max) * 100) : 0 };
};

export function score(items: Criterion[], answers: Answers, profile: Profile, includeForward = false) {
  const active = activeCriteria(items, profile).filter(item => includeForward || item.basis.some(basis => basis.kind !== 'forward'));
  const supplemental = active.filter(item => item.scoreContribution === 'supplemental');
  const domestic = active.filter(item => item.scoreContribution !== 'supplemental');
  const recommended = domestic.filter(item => item.recommendation?.(profile));
  const mandatory = domestic.filter(item => !item.recommendation?.(profile));
  const counted = deDuplicateParents(mandatory.filter(item => effectiveStatus(item, answerOf(answers, item.id), profile) !== 'na'));
  const suggestedCounted = deDuplicateParents(recommended.filter(item => effectiveStatus(item, answerOf(answers, item.id), profile) !== 'na'));
  const { max, earned, completion } = weightedCompletion(counted, answers, profile);
  const { max: suggestedMax, earned: suggestedEarned, completion: suggestedCompletion } = weightedCompletion(suggestedCounted, answers, profile);
  const statusOf = (item: Criterion) => effectiveStatus(item, answerOf(answers, item.id), profile);
  const criticalGaps = counted.filter(item => item.critical && statusOf(item) === 'noncompliant');
  const hardGaps = counted.filter(item => item.hardRequirement && ['partial', 'noncompliant'].includes(statusOf(item)));
  const findings = counted.filter(item => ['partial', 'noncompliant'].includes(statusOf(item)));
  const suggestedFindings = suggestedCounted.filter(item => ['partial', 'noncompliant'].includes(statusOf(item)));
  const supplementalFindings = supplemental.filter(item => ['partial', 'noncompliant'].includes(statusOf(item)));
  const allFindings = [...findings, ...suggestedFindings, ...supplementalFindings];
  const remediationOpen = allFindings.filter(item => { const answer = answerOf(answers, item.id); return answer.remediationStatus !== 'closed' || !canCloseRemediation(answer); });
  const missingNaReason = active.filter(item => { const answer = answerOf(answers, item.id); return answer.status === 'na' && !naRationale(answer); });
  const invalidNa = active.filter(item => { const answer = answerOf(answers, item.id); return answer.status === 'na' && effectiveStatus(item, answer, profile) !== 'na'; });
  const invalidClose = allFindings.filter(item => { const answer = answerOf(answers, item.id); return answer.remediationStatus === 'closed' && !canCloseRemediation(answer); });
  const keyLevelUnconfirmed = profile.keyCandidate && profile.keyProtectionLevel === '未确定';
  const reviewReasons: ReviewReason[] = [];
  if (keyLevelUnconfirmed) reviewReasons.push({ code: 'key_level_unconfirmed', title: '重点单位防范级别未确认', detail: '当前画像按重点单位模式审核，但防范级别尚未确认；任何低等级控制结论均不能视为满足全部要求。', criterionIds: ['KU-02', 'KU-03'] });
  else if (profile.keyCandidate) reviewReasons.push({ code: 'key_unit_review', title: '重点单位审核需人工复核', detail: '重点单位资格、等级和适用控制需由业务或主管部门要求进一步确认，系统不作行政认定。', criterionIds: ['KU-01', 'KU-02'] });
  const risks = specialRiskLabels(profile);
  if (risks.length) reviewReasons.push({ code: 'special_risk', title: '特殊风险场景需资格复核', detail: `当前画像包含${risks.join('、')}；该信息只触发专项适用性与资格复核，不会自动改变重点单位审核模式。` });
  if (missingNaReason.length) reviewReasons.push({ code: 'missing_na_reason', title: '不适用理由缺失', detail: `${missingNaReason.length}个“不适用”项目未填写理由，需补充后再解释计分分母。`, criterionIds: missingNaReason.map(item => item.id) });
  if (invalidNa.length) reviewReasons.push({ code: 'invalid_na', title: '不适用结论无效', detail: `${invalidNa.length}项控制使用了禁止的“未安装/未设置”式不适用，或该控制在适用状态下不得标为不适用；已按不符合计入。`, criterionIds: invalidNa.map(item => item.id) });
  if (a04ScopePending(profile, domestic)) reviewReasons.push({ code: 'a04_scope_pending', title: 'A04扩展控制适用范围待核准', detail: 'A04国内控制已显示以便逐项核验，但工程/系统/法律适用范围尚未由业务、法务或专业人员确认；不得将当前完成率称为完整合规证明。', criterionIds: domestic.filter(item => item.controlMeta?.requiresDomesticApplicabilityApproval).map(item => item.id) });
  const atomicPending = domestic.filter(item => item.controlMeta && (answerOf(answers, item.id).status === 'unreviewed' || answerOf(answers, item.id).a04.needsReview));
  if (atomicPending.length) reviewReasons.push({ code: 'a04_atomic_review', title: '原子控制待逐项复核', detail: `${atomicPending.length}项A04原子控制尚无独立结论或由旧档案迁入，旧父项答案不会自动证明新增高度、等级、期限或子断言符合。`, criterionIds: atomicPending.map(item => item.id) });
  if (invalidClose.length) reviewReasons.push({ code: 'invalid_remediation_close', title: '整改关闭证据不完整', detail: `${invalidClose.length}项整改虽标为已关闭，但缺少复核/临时防范等必要字段，仍作为待整改项保留。`, criterionIds: invalidClose.map(item => item.id) });
  const manualReview = reviewReasons.length > 0;
  const level = criticalGaps.length || completion < 60 ? '高风险' : completion < 80 || counted.filter(item => item.weight >= 2 && statusOf(item) === 'partial').length >= 3 ? '中风险' : '低风险';
  return { active, domestic, supplemental, mandatory, recommended, counted, max, earned, completion, suggestedCounted, suggestedMax, suggestedEarned, suggestedCompletion, criticalGaps, hardGaps, findings, suggestedFindings, supplementalFindings, remediationOpen, level, manualReview, missingNaReason, invalidNa, invalidClose, keyLevelUnconfirmed, reviewReasons };
}

export const statusLabel: Record<Status, string> = { unreviewed: '未审核', compliant: '符合', partial: '部分符合', noncompliant: '不符合', na: '不适用' };
export const remediationLabel: Record<RemediationStatus, string> = { pending: '待整改', in_progress: '整改中', review: '待复核', closed: '已关闭' };
export const statusColor: Record<Status, string> = { unreviewed: 'bg-slate-100 text-slate-500', compliant: 'bg-emerald-50 text-emerald-700', partial: 'bg-amber-50 text-amber-700', noncompliant: 'bg-red-50 text-red-700', na: 'bg-slate-100 text-slate-500' };
export const priority = (criterion: Criterion, answer: Answer) => criterion.critical && answer.status === 'noncompliant' ? '立即' : criterion.hardRequirement && answer.status === 'noncompliant' ? '高' : answer.status === 'noncompliant' ? '高' : answer.status === 'partial' ? '中' : '—';
