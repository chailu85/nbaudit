import { useMemo, useState } from 'react';
import { BookOpen } from 'lucide-react';
import { Criterion, StandardClause } from '@/data/criteria';
import { ResponsiveSelect } from '@/components/ResponsiveSelect';

type Props = {
  items: Criterion[];
  clauses: StandardClause[];
  activeCriterionIds: string[];
  onCriterion?: (criterionId: string) => void;
};

export const sourceClauseCode = (value: string) => value.match(/附录[A-H]|\d+(?:\.\d+)*/)?.[0] ?? '';

export const exactMappedCriterion = (clause: StandardClause, items: Criterion[], activeCriterionIds: string[]) => {
  const candidates = items.filter(item => item.basis.some(basis => basis.source === clause.source && sourceClauseCode(basis.clause) === clause.id));
  const activeCandidates = candidates.filter(item => activeCriterionIds.includes(item.id));
  return activeCandidates.length === 1 ? activeCandidates[0] : undefined;
};

export function SourceLibrary({ items, clauses, activeCriterionIds, onCriterion }: Props) {
  const [query, setQuery] = useState('');
  const [type, setType] = useState<'all' | StandardClause['type']>('all');
  const [chapter, setChapter] = useState('all');
  const [isChapterPickerOpen, setIsChapterPickerOpen] = useState(false);
  const normalized = query.trim().toLowerCase();
  const filtered = useMemo(() => clauses.filter(clause => {
    const hit = !normalized || `${clause.id}${clause.chapter}${clause.title}${clause.requirement}`.toLowerCase().includes(normalized);
    return hit && (type === 'all' || clause.type === type) && (chapter === 'all' || clause.chapter === chapter);
  }), [clauses, normalized, type, chapter]);
  const chapters = useMemo(() => Array.from(new Set(clauses.map(clause => clause.chapter))), [clauses]);
  const oldCount = items.filter(item => item.basis.some(basis => basis.source.includes('2004版'))).length;
  const forwardCount = items.filter(item => item.basis.some(basis => basis.kind === 'forward')).length;
  const countFor = (chapterName: string) => clauses.filter(clause => clause.chapter === chapterName).length;
  const linkedCriterion = (clause: StandardClause) => exactMappedCriterion(clause, items, activeCriterionIds);
  const selectChapter = (chapterName: string) => { setChapter(chapterName); setIsChapterPickerOpen(false); };
  const selectedChapter = chapter === 'all' ? '全部章节' : chapter;

  return <div className="source-page">
    <div className="page-head compact">
      <div><div className="eyebrow">SOURCE LIBRARY / DB11/T 2552—2026</div><h1>依据库与条款细则</h1><p>按标准第1—9章及附录A—H建立可搜索的条款索引，并与审核项目交叉追溯。</p></div>
      <div className="source-count"><strong>{clauses.length}</strong><span>条款索引</span></div>
    </div>
    <div className="source-cards">
      <div className="source-card"><span className="source-type">现行标准</span><h3>DB11/T 2552—2026</h3><p>单位内部安全防范通用要求</p><small>第1—9章 · 附录A—H · 发布2026-06-30</small></div>
      <div className="source-card"><span className="source-type">交叉依据</span><h3>规范性引用文件</h3><p>GB、GA、DB11/T等相关设施、系统和运维标准</p><small>{items.length} 个审核项目已建立追溯映射</small></div>
      <div className="source-card"><span className="source-type">使用提示</span><h3>条款检索</h3><p>输入条款号、设施名称、场景或要求关键词，定位可执行的审核依据。</p><small>依据库内容来自用户提供的标准原文</small></div>
    </div>
    <section className="difference source-difference">
      <h2>法规口径交叉提醒</h2>
      <div className="source-difference-table">
        <div><b>DB11/T 2552—2026</b><span>主审核基线</span><strong>{clauses.length} 条</strong></div>
        <div><b>2004版条例</b><span>保留旧版映射</span><strong>{oldCount} 项</strong></div>
        <div><b>修订征求意见稿</b><span>前瞻参考，不改变现行分数</span><strong>{forwardCount} 项</strong></div>
      </div>
    </section>
    <div className="source-controls">
      <button className="chapter-selector" onClick={() => setIsChapterPickerOpen(true)}>{selectedChapter} <span>▾</span></button>
      <div className="source-search"><input value={query} onChange={event => setQuery(event.target.value)} placeholder="搜索关键词或条款编号" /></div>
      <ResponsiveSelect aria-label="全部类型" value={type} onChange={value => setType(value as typeof type)} options={[{ value: 'all', label: '全部类型' }, { value: '规范性', label: '规范性条款' }, { value: '资料性', label: '资料性附录' }, { value: '定义', label: '术语定义' }, { value: '引用', label: '规范性引用' }]} />
      <span className="muted">显示 {filtered.length} / {clauses.length} 条</span>
    </div>
    {isChapterPickerOpen && <div className="chapter-picker-overlay" role="dialog" aria-modal="true" aria-label="选择章节"><div className="chapter-picker-head"><span>选择章节</span><button className="text-btn" onClick={() => setIsChapterPickerOpen(false)}>关闭</button></div><div className="chapter-picker-list"><button className={`chapter-picker-item ${chapter === 'all' ? 'active' : ''}`} onClick={() => selectChapter('all')}><strong>全部章节</strong><span>{clauses.length}</span></button>{chapters.map(chapterName => <button className={`chapter-picker-item ${chapter === chapterName ? 'active' : ''}`} onClick={() => selectChapter(chapterName)} key={chapterName}><strong>{chapterName}</strong><span>{countFor(chapterName)}</span></button>)}</div></div>}
    <div className="source-workspace">
      <aside className="source-chapter-list"><button className={chapter === 'all' ? 'active' : ''} onClick={() => selectChapter('all')}><strong>全部章节</strong><span>{clauses.length}</span></button>{chapters.map(chapterName => <button className={chapter === chapterName ? 'active' : ''} onClick={() => selectChapter(chapterName)} key={chapterName}><strong>{chapterName}</strong><span>{countFor(chapterName)}</span></button>)}</aside>
      <section className="clause-list">{filtered.length === 0 ? <div className="empty"><BookOpen size={32} /><h3>没有匹配条款</h3><p>尝试搜索“视频”“附录F”“180d”或具体条款号。</p></div> : filtered.map(clause => { const target = linkedCriterion(clause); const canJump = Boolean(target && onCriterion && activeCriterionIds.includes(target.id)); return <article className="clause-card" key={clause.id}><div className="clause-meta">{canJump && target && onCriterion ? <button className="criterion-link" onClick={() => onCriterion(target.id)}>{clause.id}</button> : <span className="criterion-id">{clause.id}</span>}</div><div className="clause-body"><div className="clause-chapter">{clause.chapter} <span>· {clause.type}</span></div><h3>{clause.title}</h3><p>{clause.requirement}</p><small>来源：{clause.source}</small></div></article>; })}</section>
    </div>
  </div>;
}
