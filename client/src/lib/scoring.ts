import { Criterion, Profile, Status } from '@/data/criteria';

export type RemediationStatus = 'pending' | 'in_progress' | 'review' | 'closed';
export type Answer = { status: Status; evidence: string; owner: string; due: string; action: string; note: string; remediationStatus: RemediationStatus };
export type Answers = Record<string, Answer>;

export const emptyAnswer = (): Answer => ({ status: 'unreviewed', evidence: '', owner: '', due: '', action: '', note: '', remediationStatus: 'pending' });
export const applicable = (c: Criterion, profile: Profile) => !c.applies || c.applies(profile);
export const activeCriteria = (items: Criterion[], profile: Profile) => items.filter(c => applicable(c, profile));

export function score(items: Criterion[], answers: Answers, profile: Profile, includeForward = false) {
  const active = activeCriteria(items, profile).filter(c => includeForward || c.basis.some(b => b.kind !== 'forward'));
  const counted = active.filter(c => answers[c.id]?.status !== 'na');
  const max = counted.reduce((n, c) => n + c.weight, 0);
  const earned = counted.reduce((n, c) => {
    const a = answers[c.id]?.status;
    return n + (a === 'compliant' ? c.weight : a === 'partial' ? c.weight * 0.5 : 0);
  }, 0);
  const completion = max ? Math.round((earned / max) * 100) : 0;
  const criticalGaps = counted.filter(c => c.critical && answers[c.id]?.status === 'noncompliant');
  const open = counted.filter(c => ['unreviewed', 'partial', 'noncompliant'].includes(answers[c.id]?.status ?? 'unreviewed'));
  const missingNaReason = active.filter(c => answers[c.id]?.status === 'na' && !answers[c.id]?.note.trim());
  const keyLevelUnconfirmed = profile.keyCandidate && profile.keyProtectionLevel === '未确定';
  const manualReview = profile.keyCandidate || profile.secret || profile.dangerous || profile.crowded || profile.dataStorage || missingNaReason.length > 0;
  const level = criticalGaps.length || completion < 60 ? '高风险' : completion < 80 || counted.filter(c => c.weight >= 2 && answers[c.id]?.status === 'partial').length >= 3 ? '中风险' : '低风险';
  return { active, counted, max, earned, completion, criticalGaps, open, level, manualReview, missingNaReason, keyLevelUnconfirmed };
}

export const statusLabel: Record<Status, string> = { unreviewed: '未审核', compliant: '符合', partial: '部分符合', noncompliant: '不符合', na: '不适用' };
export const remediationLabel: Record<RemediationStatus, string> = { pending: '待整改', in_progress: '整改中', review: '待复核', closed: '已关闭' };
export const statusColor: Record<Status, string> = { unreviewed: 'bg-slate-100 text-slate-500', compliant: 'bg-emerald-50 text-emerald-700', partial: 'bg-amber-50 text-amber-700', noncompliant: 'bg-red-50 text-red-700', na: 'bg-slate-100 text-slate-500' };
export const priority = (c: Criterion, a: Answer) => c.critical && a.status === 'noncompliant' ? '立即' : a.status === 'noncompliant' ? '高' : a.status === 'partial' ? '中' : '—';
