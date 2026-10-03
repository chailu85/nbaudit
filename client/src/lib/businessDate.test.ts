import { describe, expect, it } from 'vitest';
import { businessDate, isBusinessDate } from './businessDate';

describe('Asia/Shanghai业务日期', () => {
  it('在北京时间零点后使用新的审核日期', () => {
    expect(businessDate(new Date('2026-10-02T16:30:00.000Z'))).toBe('2026-10-03');
    expect(businessDate(new Date('2026-10-02T15:59:59.000Z'))).toBe('2026-10-02');
  });

  it('校验跨月、跨年和无效日期', () => {
    expect(isBusinessDate('2026-12-31')).toBe(true);
    expect(isBusinessDate('2026-02-29')).toBe(false);
    expect(isBusinessDate('2028-02-29')).toBe(true);
    expect(isBusinessDate('2026-13-01')).toBe(false);
  });
});
