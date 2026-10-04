import { describe, expect, it } from 'vitest';
import { criteria, standardClauses } from '../data/criteria';
import { exactMappedCriterion, sourceClauseCode } from './SourceLibrary';

const clause = (id: string) => {
  const found = standardClauses.find(item => item.id === id);
  if (!found) throw new Error(`missing source clause: ${id}`);
  return found;
};

describe('来源库精确条款映射', () => {
  it('只解析完整的标准条款号', () => {
    expect(sourceClauseCode('第4.1.2条')).toBe('4.1.2');
    expect(sourceClauseCode('6.7、6.8')).toBe('6.7');
  });

  it('优先选择当前适用且来源相同的审核项', () => {
    expect(exactMappedCriterion(clause('4.1.2'), criteria, ['G-01'])?.id).toBe('G-01');
  });

  it('多个当前适用候选时不伪造唯一审核跳转', () => {
    expect(exactMappedCriterion(clause('4.1.2'), criteria, ['G-01', 'S-03'])).toBeUndefined();
  });

  it('不把其他标准的相同数字条款映射为DB11/T 2552来源条款', () => {
    expect(exactMappedCriterion(clause('6.7'), criteria, criteria.map(item => item.id))).toBeUndefined();
  });
});
