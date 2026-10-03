import { Criterion, Profile, Status } from '@/data/criteria';

export type RemediationStatus = 'pending' | 'in_progress' | 'review' | 'closed';
export type Answer = { status: Status; evidence: string; owner: string; due: string; action: string; note: string; remediationStatus: RemediationStatus };
export type Answers = Record<string, Answer>;
export type ReviewReasonCode = 'key_unit_review' | 'key_level_unconfirmed' | 'special_risk' | 'missing_na_reason';
export type ReviewReason = { code: ReviewReasonCode; title: string; detail: string; criterionIds?: string[] };

export const emptyAnswer = (): Answer => ({ status: 'unreviewed', evidence: '', owner: '', due: '', action: '', note: '', remediationStatus: 'pending' });
export const applicable = (c: Criterion, profile: Profile) => !c.applies || c.applies(profile);
export const activeCriteria = (items: Criterion[], profile: Profile) => items.filter(c => applicable(c, profile));

const specialRiskLabels = (profile: Profile) => [
  profile.secret ? '涉密载体/国家秘密' : '',
  profile.dangerous ? '危险物品/菌种/武器弹药' : '',
  profile.crowded ? '人员密集或大型活动场所' : '',
  profile.dataStorage ? '重要数据存储或重要高科技/互联网业务' : '',
].filter(Boolean);

export const reviewReasonText = (reason: ReviewReason) => `${reason.title}：${reason.detail}`;

export function score(items: Criterion[], answers: Answers, profile: Profile, includeForward = false) {
  const active = activeCriteria(items, profile).filter(c => includeForward || c.basis.some(b => b.kind !== 'forward'));
  const recommended = active.filter(c => c.recommendation?.(profile));
  const mandatory = active.filter(c => !c.recommendation?.(profile));
  const counted = mandatory.filter(c => answers[c.id]?.status !== 'na');
  const suggestedCounted = recommended.filter(c => answers[c.id]?.status !== 'na');
  const max = counted.reduce((n, c) => n + c.weight, 0);
  const earned = counted.reduce((n, c) => {
    const status = answers[c.id]?.status;
    return n + (status === 'compliant' ? c.weight : status === 'partial' ? c.weight * 0.5 : 0);
  }, 0);
  const completion = max ? Math.round((earned / max) * 100) : 0;
  const suggestedMax = suggestedCounted.reduce((n, c) => n + c.weight, 0);
  const suggestedEarned = suggestedCounted.reduce((n, c) => {
    const status = answers[c.id]?.status;
    return n + (status === 'compliant' ? c.weight : status === 'partial' ? c.weight * 0.5 : 0);
  }, 0);
  const suggestedCompletion = suggestedMax ? Math.round((suggestedEarned / suggestedMax) * 100) : 0;
  const criticalGaps = counted.filter(c => c.critical && answers[c.id]?.status === 'noncompliant');
  const findings = counted.filter(c => ['partial', 'noncompliant'].includes(answers[c.id]?.status ?? 'unreviewed'));
  const remediationOpen = findings.filter(c => answers[c.id]?.remediationStatus !== 'closed');
  const missingNaReason = active.filter(c => answers[c.id]?.status === 'na' && !answers[c.id]?.note?.trim());
  const keyLevelUnconfirmed = profile.keyCandidate && profile.keyProtectionLevel === '未确定';
  const reviewReasons: ReviewReason[] = [];

  if (keyLevelUnconfirmed) {
    reviewReasons.push({
      code: 'key_level_unconfirmed',
      title: '重点单位防范级别未确认',
      detail: '当前画像按重点单位模式审核，但防范级别尚未确认；任何低等级控制结论均不能视为满足全部要求。',
      criterionIds: ['KU-02', 'KU-03'],
    });
  } else if (profile.keyCandidate) {
    reviewReasons.push({
      code: 'key_unit_review',
      title: '重点单位审核需人工复核',
      detail: '重点单位资格、等级和适用控制需由业务或主管部门要求进一步确认，系统不作行政认定。',
      criterionIds: ['KU-01', 'KU-02'],
    });
  }

  const risks = specialRiskLabels(profile);
  if (risks.length) {
    reviewReasons.push({
      code: 'special_risk',
      title: '特殊风险场景需资格复核',
      detail: `当前画像包含${risks.join('、')}；该信息只触发专项适用性与资格复核，不会自动改变重点单位审核模式。`,
    });
  }

  if (missingNaReason.length) {
    reviewReasons.push({
      code: 'missing_na_reason',
      title: '不适用理由缺失',
      detail: `${missingNaReason.length}个“不适用”项目未填写理由，需补充后再解释计分分母。`,
      criterionIds: missingNaReason.map(item => item.id),
    });
  }

  const manualReview = reviewReasons.length > 0;
  const level = criticalGaps.length || completion < 60
    ? '高风险'
    : completion < 80 || counted.filter(c => c.weight >= 2 && answers[c.id]?.status === 'partial').length >= 3
      ? '中风险'
      : '低风险';

  return { active, mandatory, recommended, counted, max, earned, completion, suggestedCounted, suggestedMax, suggestedEarned, suggestedCompletion, criticalGaps, findings, remediationOpen, level, manualReview, missingNaReason, keyLevelUnconfirmed, reviewReasons };
}

export const statusLabel: Record<Status, string> = { unreviewed: '未审核', compliant: '符合', partial: '部分符合', noncompliant: '不符合', na: '不适用' };
export const remediationLabel: Record<RemediationStatus, string> = { pending: '待整改', in_progress: '整改中', review: '待复核', closed: '已关闭' };
export const statusColor: Record<Status, string> = { unreviewed: 'bg-slate-100 text-slate-500', compliant: 'bg-emerald-50 text-emerald-700', partial: 'bg-amber-50 text-amber-700', noncompliant: 'bg-red-50 text-red-700', na: 'bg-slate-100 text-slate-500' };
export const priority = (c: Criterion, answer: Answer) => c.critical && answer.status === 'noncompliant' ? '立即' : answer.status === 'noncompliant' ? '高' : answer.status === 'partial' ? '中' : '—';
