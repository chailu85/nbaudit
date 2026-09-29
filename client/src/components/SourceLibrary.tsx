import { useMemo, useState } from 'react';
import { BookOpen, Search } from 'lucide-react';
import { Criterion, StandardClause } from '@/data/criteria';

type Props = { items: Criterion[]; clauses: StandardClause[] };

export function SourceLibrary({ items, clauses }: Props) {
  const [query, setQuery] = useState('');
  const [type, setType] = useState<'all' | StandardClause['type']>('all');
  const normalized = query.trim().toLowerCase();
  const filtered = useMemo(() => clauses.filter(c => {
    const hit = !normalized || `${c.id}${c.chapter}${c.title}${c.requirement}`.toLowerCase().includes(normalized);
    return hit && (type === 'all' || c.type === type);
  }), [clauses, normalized, type]);
  const chapters = useMemo(() => Array.from(new Set(clauses.map(c => c.chapter))), [clauses]);
  const oldCount = items.filter(c => c.basis.some(b => b.source.includes('2004版'))).length;
  const forwardCount = items.filter(c => c.basis.some(b => b.kind === 'forward')).length;
  const countFor = (chapter: string) => clauses.filter(c => c.chapter === chapter).length;
  return <div>
    <div className="page-head compact"><div><div className="eyebrow">SOURCE LIBRARY / DB11/T 2552—2026</div><h1>依据库与条款细则</h1><p>按标准第1—9章及附录A—H建立可搜索的条款索引，并与审核项目交叉追溯。</p></div><div className="source-count"><strong>{clauses.length}</strong><span>条款索引</span></div></div>
    <div className="source-cards"><div className="source-card"><span className="source-type">现行标准</span><h3>DB11/T 2552—2026</h3><p>单位内部安全防范通用要求</p><small>第1—9章 · 附录A—H · 发布2026-06-30</small></div><div className="source-card"><span className="source-type amber">交叉依据</span><h3>规范性引用文件</h3><p>GB、GA、DB11/T等相关设施、系统和运维标准</p><small>{items.length} 个审核项目已建立追溯映射</small></div><div className="source-card"><span className="source-type">使用提示</span><h3>条款检索</h3><p>输入条款号、设施名称、场景或要求关键词，定位可执行的审核依据。</p><small>依据库内容来自用户提供的标准原文</small></div></div>
    <div className="filter-bar source-filter"><div className="search"><Search size={16} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="搜索条款号、章节、设施或关键词" /></div><select value={type} onChange={e => setType(e.target.value as typeof type)}><option value="all">全部类型</option><option value="规范性">规范性条款</option><option value="资料性">资料性附录</option><option value="定义">术语定义</option><option value="引用">规范性引用</option></select><span className="muted">显示 {filtered.length} / {clauses.length} 条</span></div>
    <div className="source-chapters">{chapters.map(chapter => <span key={chapter}>{chapter} <b>{countFor(chapter)}</b></span>)}</div>
    <section className="difference source-difference"><h2>法规口径交叉提醒</h2><div className="source-difference-grid"><div><b>DB11/T 2552—2026</b><span>当前工具主审核基线，含 {clauses.length} 条标准索引</span></div><div><b>2004版条例</b><span>{oldCount} 个审核项目保留旧版责任、机构和制度映射</span></div><div><b>修订征求意见稿</b><span>{forwardCount} 个审核项目作为前瞻参考，不改变现行基线分数</span></div></div></section>
    <section className="clause-list">{filtered.length === 0 ? <div className="empty"><BookOpen size={32} /><h3>没有匹配条款</h3><p>尝试搜索“视频”“附录F”“180d”或具体条款号。</p></div> : filtered.map(c => <article className="clause-card" key={c.id}><div className="clause-meta"><b>{c.id}</b><span className={`clause-type ${c.type}`}>{c.type}</span></div><div className="clause-body"><div className="clause-chapter">{c.chapter}</div><h3>{c.title}</h3><p>{c.requirement}</p><small>来源：{c.source}</small></div></article>)}</section>
  </div>;
}
