import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AssessmentItem, assessmentFieldVisibility, assessmentIndexAfter, assessmentStatusForKey, assessmentStatusPatch } from './App';
import { criteria, type Profile } from './data/criteria';
import { defaultA04Profile } from './data/a04Types';
import { emptyAnswer } from './lib/scoring';

const profile: Profile = {
  name: '基线样例单位', region: '北京市', unitType: '企业', industry: '技术服务', reviewer: '测试人', reviewDate: '2026-10-04', multiSite: false, keyCandidate: false, keyProtectionLevel: '未确定', secret: false, dangerous: false, crowded: false, dataStorage: false, a04: { ...defaultA04Profile },
};
const criterion = criteria.find(item => !item.controlMeta)!;

const renderItem = (status: ReturnType<typeof emptyAnswer>['status']) => renderToStaticMarkup(createElement(AssessmentItem, {
  criterion,
  answer: { ...emptyAnswer(), status, evidence: '证据-01', owner: '张三', due: '2026-10-31', action: '完成整改' },
  profile,
  update: () => undefined,
}));

describe('审核页单条款工作流', () => {
  it('按四种结论保留既有字段写入并控制显示', () => {
    const original = { ...emptyAnswer(), evidence: '证据-01', owner: '张三', due: '2026-10-31', action: '完成整改' };
    for (const status of ['compliant', 'partial', 'noncompliant', 'na'] as const) {
      const merged = { ...original, ...assessmentStatusPatch(original, status) };
      expect(merged.status).toBe(status);
      expect(merged.evidence).toBe('证据-01');
      expect(merged.owner).toBe('张三');
      expect(merged.due).toBe('2026-10-31');
      expect(merged.action).toBe('完成整改');
      expect(merged.a04.needsReview).toBe(false);
    }
    expect(assessmentFieldVisibility('compliant')).toEqual({ showRemediationFields: false, showNaReason: false });
    expect(assessmentFieldVisibility('partial')).toEqual({ showRemediationFields: true, showNaReason: false });
    expect(assessmentFieldVisibility('noncompliant')).toEqual({ showRemediationFields: true, showNaReason: false });
    expect(assessmentFieldVisibility('na')).toEqual({ showRemediationFields: false, showNaReason: true });
  });

  it('按显示规则渲染证据、整改字段与不适用理由', () => {
    const compliant = renderItem('compliant');
    const partial = renderItem('partial');
    const noncompliant = renderItem('noncompliant');
    const na = renderItem('na');
    for (const markup of [compliant, partial, noncompliant, na]) expect(markup).toContain('证据编号/位置');
    expect(compliant).not.toContain('整改负责人');
    expect(compliant).not.toContain('不适用理由');
    expect(partial).toContain('整改负责人');
    expect(partial).toContain('整改期限');
    expect(noncompliant).toContain('整改负责人');
    expect(noncompliant).toContain('整改期限');
    expect(na).toContain('不适用理由');
    expect(na).toContain('不建议只填未安装/未设置');
  });

  it('映射键盘结论并在边界内切换当前条款', () => {
    expect(assessmentStatusForKey('1')).toBe('compliant');
    expect(assessmentStatusForKey('2')).toBe('partial');
    expect(assessmentStatusForKey('3')).toBe('noncompliant');
    expect(assessmentStatusForKey('4')).toBe('na');
    expect(assessmentStatusForKey('5')).toBeUndefined();
    expect(assessmentIndexAfter(0, 17, -1)).toBe(0);
    expect(assessmentIndexAfter(2, 17, 1)).toBe(3);
    expect(assessmentIndexAfter(16, 17, 1)).toBe(16);
  });
});
