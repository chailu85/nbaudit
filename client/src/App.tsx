import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AlertTriangle, BookOpen, CheckCircle2, ChevronRight, ClipboardCheck, Download, FileText, LayoutDashboard, ListChecks, Save, Search, ShieldCheck, SlidersHorizontal, Table2, Upload, X } from 'lucide-react';
import { basisLabel, criteria, type Criterion, modules, type Profile, standardClauses, unitTypes } from '@/data/criteria';
import { SourceLibrary } from '@/components/SourceLibrary';
import { type Answer, type Answers, emptyAnswer, priority, remediationLabel, type RemediationStatus, reviewReasonText, score, statusLabel } from '@/lib/scoring';
import { type AuditState, SCHEMA_VERSION, clearAudit, createBlankAnswers, downloadJson, downloadRawAudit, loadAudit, readJsonFile, saveAudit } from '@/lib/storage';
import { exportExcelReport, exportWordReport, reportDetailRows } from '@/lib/reportExport';
import { businessDate, isBusinessDate } from '@/lib/businessDate';
import { hasSpecialRisk, normalizeProfileDraft } from '@/lib/profile';
import './index.css';

type View = 'dashboard' | 'assessment' | 'remediation' | 'sources' | 'report';

const today = businessDate();
const defaultProfile: Profile = {
  name: '',
  region: '',
  unitType: '企业',
  industry: '',
  multiSite: false,
  keyCandidate: true,
  keyProtectionLevel: '未确定',
  secret: false,
  dangerous: false,
  crowded: false,
  dataStorage: false,
  reviewer: '',
  reviewDate: today,
};

const makeAnswers = (): Answers => createBlankAnswers(criteria.map(criterion => criterion.id));
const initialLoad = loadAudit(defaultProfile, makeAnswers());
const initialAudit = initialLoad.state;
const statusValues = new Set(['compliant', 'partial', 'noncompliant', 'na']);

function App() {
  const [profile, setProfile] = useState<Profile>(initialAudit?.profile ?? defaultProfile);
  const [answers, setAnswers] = useState<Answers>(initialAudit?.answers ?? makeAnswers());
  const [view, setView] = useState<View>('dashboard');
  const [activeModule, setActiveModule] = useState('governance');
  const [query, setQuery] = useState('');
  const [showProfile, setShowProfile] = useState(!initialAudit);
  const [notice, setNotice] = useState('');
  const [autoSavePaused, setAutoSavePaused] = useState(Boolean(initialLoad.issue));
  const [persistenceIssue, setPersistenceIssue] = useState(initialLoad.issue?.message ?? '');
  const [recoveryRaw, setRecoveryRaw] = useState(initialLoad.issue?.raw);
  const fileRef = useRef<HTMLInputElement>(null);

  const currentScore = useMemo(() => score(criteria, answers, profile, false), [answers, profile]);
  const forwardScore = useMemo(() => score(criteria, answers, profile, true), [answers, profile]);
  const assessmentCriteria = forwardScore.active;
  const filtered = assessmentCriteria.filter(criterion => {
    const searchable = `${criterion.id}${criterion.title}${criterion.prompt}${criterion.basis.map(basis => basis.clause).join('')}`.toLowerCase();
    return (!query || searchable.includes(query.toLowerCase())) && criterion.module === activeModule;
  });

  const showNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 3200);
  };

  const makeState = (): AuditState => ({ version: SCHEMA_VERSION, profile, answers, savedAt: new Date().toISOString() });
  const recordSaveFailure = (message: string) => {
    setAutoSavePaused(true);
    setPersistenceIssue(message);
  };

  const save = () => {
    const result = saveAudit(makeState());
    if (!result.ok) {
      recordSaveFailure(result.message);
      showNotice('保存失败：请立即导出JSON备份。');
      return;
    }
    setAutoSavePaused(false);
    setPersistenceIssue('');
    setRecoveryRaw(undefined);
    showNotice('已保存到本机浏览器');
  };

  useEffect(() => {
    if (autoSavePaused) return;
    const timer = window.setTimeout(() => {
      const result = saveAudit({ version: SCHEMA_VERSION, profile, answers, savedAt: new Date().toISOString() });
      if (!result.ok) recordSaveFailure(result.message);
    }, 800);
    return () => window.clearTimeout(timer);
  }, [profile, answers, autoSavePaused]);

  const updateAnswer = (id: string, patch: Partial<Answer>) => {
    setAnswers(previous => ({ ...previous, [id]: { ...(previous[id] ?? emptyAnswer()), ...patch } }));
  };

  const reset = () => {
    if (!window.confirm('确定清空本机审核草稿吗？此操作会删除浏览器中的已保存档案。')) return;
    if (!window.confirm('请再次确认：清空后只能依靠此前导出的JSON恢复，是否继续？')) return;
    const result = clearAudit();
    if (!result.ok) {
      recordSaveFailure(result.message);
      showNotice('未能清空本机草稿，请先导出JSON备份。');
      return;
    }
    setAutoSavePaused(true);
    setProfile(defaultProfile);
    setAnswers(makeAnswers());
    setShowProfile(true);
    setPersistenceIssue('');
    setRecoveryRaw(undefined);
    showNotice('已清空本机草稿；请保存新审核后恢复自动保存。');
  };

  const importFile = async (file?: File) => {
    if (!file) return;
    try {
      const imported = await readJsonFile(file, defaultProfile, makeAnswers());
      const next = { ...imported, savedAt: new Date().toISOString() };
      const persisted = saveAudit(next);
      setProfile(next.profile);
      setAnswers(next.answers);
      if (!persisted.ok) {
        recordSaveFailure(persisted.message);
        showNotice('档案已导入当前页面，但未能保存到浏览器；请立即导出JSON备份。');
        return;
      }
      setAutoSavePaused(false);
      setPersistenceIssue('');
      setRecoveryRaw(undefined);
      showNotice('已导入、校验并保存审核档案');
    } catch (error) {
      showNotice(error instanceof Error ? error.message : '导入失败；当前审核档案未被修改。');
    }
  };

  const goAssessment = (module = activeModule) => {
    setActiveModule(module);
    setView('assessment');
  };
  const forwardOnlyCount = forwardScore.active.filter(criterion => !currentScore.active.some(current => current.id === criterion.id)).length;

  return <div className="min-h-screen bg-[#f5f7fb] text-slate-900">
    <header className="topbar">
      <div className="brand">
        <div className="brand-mark"><ShieldCheck size={22} /></div>
        <div><div className="brand-title">内保合规审核台</div><div className="brand-sub">单位内部治安保卫 · 全标准版</div></div>
      </div>
      <div className="top-actions">
        <span className={`status-dot ${persistenceIssue ? 'status-warning' : ''}`}><span />{persistenceIssue ? '本机保存异常' : '本地模式 · 不上传材料'}</span>
        <button className="icon-btn" onClick={save} title="保存"><Save size={18} /></button>
        <button className="outline-btn import-action" onClick={() => fileRef.current?.click()}><Upload size={16} /> 导入</button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={event => importFile(event.target.files?.[0])} />
        <button className="primary-btn" onClick={() => downloadJson(makeState())}><Download size={16} /> 导出JSON</button>
      </div>
    </header>
    <div className="disclaimer"><AlertTriangle size={16} /><span>内部自查辅助工具，不替代公安机关监督检查、主管部门要求或法律意见。征求意见稿内容仅作前瞻性参考。</span><button onClick={() => showNotice('现行基线：2004版条例 + DB11/T 2552—2026；前瞻口径另行显示')}>查看口径</button></div>
    <div className="app-shell">
      <aside className="sidebar">
        <div className="profile-mini"><div className="avatar">{profile.name ? profile.name.slice(0, 1) : '未'}</div><div className="profile-name">{profile.name || '未创建审核'}</div><div className="profile-meta">{profile.unitType} · {profile.industry || '待填写行业'}</div><button className="text-btn" onClick={() => setShowProfile(true)}>编辑单位画像 <ChevronRight size={14} /></button></div>
        <nav className="nav">
          <NavItem active={view === 'dashboard'} icon={<LayoutDashboard size={18} />} label="审核总览" onClick={() => setView('dashboard')} />
          <NavItem active={view === 'assessment'} icon={<ClipboardCheck size={18} />} label="分模块审核" onClick={() => goAssessment()} />
          <NavItem active={view === 'remediation'} icon={<ListChecks size={18} />} label="整改清单" count={currentScore.remediationOpen.length} onClick={() => setView('remediation')} />
          <NavItem active={view === 'sources'} icon={<BookOpen size={18} />} label="依据与差异" onClick={() => setView('sources')} />
          <NavItem active={view === 'report'} icon={<FileText size={18} />} label="审核报告" onClick={() => setView('report')} />
        </nav>
        <div className="sidebar-foot"><div>审核标准库</div><strong>DB11/T 2552—2026</strong><span>第1—9章 · 附录A—H</span><span>2004版条例 · 修订征求意见稿</span><button className="danger-link" onClick={reset}>清空本机草稿</button></div>
      </aside>
      <main className="main-content">
        {notice && <div className="toast"><CheckCircle2 size={16} /> {notice}</div>}
        {persistenceIssue && <div className="persistence-banner"><AlertTriangle size={16} /><span><strong>本机档案未确认保存。</strong>{persistenceIssue}</span>{recoveryRaw && <button className="outline-btn" onClick={() => downloadRawAudit(recoveryRaw)}>导出原始草稿</button>}<button className="outline-btn" onClick={() => downloadJson(makeState())}>导出当前草稿</button></div>}
        {view === 'dashboard' && <Dashboard profile={profile} score={currentScore} forward={forwardScore} answers={answers} onModule={goAssessment} onStart={() => setShowProfile(true)} forwardOnlyCount={forwardOnlyCount} />}
        {view === 'assessment' && <Assessment activeModule={activeModule} setActiveModule={setActiveModule} moduleList={modules} items={filtered} allCriteria={assessmentCriteria} answers={answers} updateAnswer={updateAnswer} query={query} setQuery={setQuery} keyCandidate={profile.keyCandidate} onEnableKeyReview={() => { setProfile(current => ({ ...current, keyCandidate: true, keyProtectionLevel: '未确定' })); setAutoSavePaused(false); }} onBack={() => setView('dashboard')} />}
        {view === 'remediation' && <Remediation items={forwardScore.active} answers={answers} updateAnswer={updateAnswer} onAssess={goAssessment} />}
        {view === 'sources' && <SourceLibrary items={criteria} clauses={standardClauses} />}
        {view === 'report' && <Report profile={profile} current={currentScore} forward={forwardScore} answers={answers} />}
      </main>
    </div>
    {showProfile && <ProfileModal profile={profile} setProfile={next => { setProfile(next); setAutoSavePaused(false); }} onClose={() => setShowProfile(false)} onReset={() => { setAnswers(makeAnswers()); setView('dashboard'); }} />}
  </div>;
}

function NavItem({ active, icon, label, count, onClick }: { active: boolean; icon: ReactNode; label: string; count?: number; onClick: () => void }) {
  return <button className={`nav-item ${active ? 'active' : ''}`} onClick={onClick}>{icon}<span>{label}</span>{count ? <b>{count}</b> : null}</button>;
}

function ReviewReasons({ reasons }: { reasons: ReturnType<typeof score>['reviewReasons'] }) {
  if (!reasons.length) return null;
  return <div className="review-banner review-reasons"><AlertTriangle size={16} /><div><strong>需人工复核</strong>{reasons.map(reason => <p key={reason.code}>{reviewReasonText(reason)}{reason.criterionIds?.length ? `（相关项目：${reason.criterionIds.join('、')}）` : ''}</p>)}</div></div>;
}

function Dashboard({ profile, score: snapshot, forward, answers, onModule, onStart, forwardOnlyCount }: { profile: Profile; score: ReturnType<typeof score>; forward: ReturnType<typeof score>; answers: Answers; onModule: (module: string) => void; onStart: () => void; forwardOnlyCount: number }) {
  const reviewedCount = snapshot.counted.filter(criterion => statusValues.has(answers[criterion.id]?.status)).length;
  const keyReviewPending = !profile.keyCandidate;
  return <div>
    <div className="page-head"><div><div className="eyebrow">COMPLIANCE REVIEW / {profile.reviewDate || today}</div><h1>{profile.name ? `${profile.name} · 合规审核总览` : '开始一次单位合规审核'}</h1><p>按DB11/T 2552—2026章节组织：第5章一般单位、第6章重点单位常态防范。</p></div><button className="primary-btn" onClick={onStart}><SlidersHorizontal size={17} /> {profile.name ? '编辑单位画像' : '创建审核'}</button></div>
    <section className="hero-grid">
      <div className={`score-card ${snapshot.level === '高风险' ? 'danger' : ''}`}><div className="score-label">现行基线完成率</div><div className="score-number">{snapshot.completion}<small>%</small></div><div className="score-level">{snapshot.level} <span>· {snapshot.criticalGaps.length} 个关键缺口</span></div><div className="score-track"><i style={{ width: `${snapshot.completion}%` }} /></div><div className="score-foot">已审核 {reviewedCount} / 适用 {snapshot.counted.length} 项</div></div>
      <div className="metric-card"><div className="metric-icon amber"><AlertTriangle size={20} /></div><div><span>待整改</span><strong>{snapshot.remediationOpen.length}</strong><small>含 {snapshot.criticalGaps.length} 项关键项</small></div></div>
      <div className="metric-card"><div className="metric-icon blue"><BookOpen size={20} /></div><div><span>附录F建议得分</span><strong>{snapshot.suggestedCompletion}%</strong><small>{snapshot.recommended.length} 项“宜”单列建议分，不计强制合规分母</small></div></div>
    </section>
    {keyReviewPending && <div className="review-banner key-review"><AlertTriangle size={16} /><span><strong>重点单位资格待判定。</strong> 当前未按重点单位模式审核；第6章模块保留6.1判定入口，不会显示为0项。</span><button className="outline-btn" onClick={() => onModule('key')}>进入第6章判定</button></div>}
    <ReviewReasons reasons={snapshot.reviewReasons} />
    <div className="section-head"><div><h2>模块完成情况</h2><p>审核模块与标准章节对应；重点单位的访问、人力、实体、电子要求均归入第6章。</p></div><span className="muted">{snapshot.active.length} 个现行适用审核项</span></div>
    <div className="module-grid">{modules.map(module => {
      const items = snapshot.active.filter(criterion => criterion.module === module.id);
      const reviewed = items.filter(criterion => statusValues.has(answers[criterion.id]?.status)).length;
      const percentage = items.length ? Math.round(reviewed / items.length * 100) : 0;
      const pending = module.id === 'key' && keyReviewPending;
      return <button className="module-card" key={module.id} onClick={() => onModule(module.id)}><div className="module-top"><span className="module-code">{module.short}</span><ChevronRight size={16} /></div><h3>{module.label}</h3><div className="module-progress"><i style={{ width: `${percentage}%` }} /></div><div className="module-foot"><span>{pending ? '资格待判定' : `${items.length} 项`}</span><b>{pending ? '第6章' : `${percentage}%`}</b></div></button>;
    })}</div>
    <div className="callout"><div className="callout-icon"><ShieldCheck size={22} /></div><div><strong>审核提示</strong><p>建议先确认重点单位资格与防范级别；特殊风险场景仅触发资格复核，不会自动改变审核模式。</p></div><button className="text-btn" onClick={() => onModule('key')}>进入第6章审核 <ChevronRight size={15} /></button></div>
  </div>;
}

function Assessment({ activeModule, setActiveModule, moduleList, items, allCriteria, answers, updateAnswer, query, setQuery, keyCandidate, onEnableKeyReview, onBack }: { activeModule: string; setActiveModule: (value: string) => void; moduleList: typeof modules; items: Criterion[]; allCriteria: Criterion[]; answers: Answers; updateAnswer: (id: string, patch: Partial<Answer>) => void; query: string; setQuery: (value: string) => void; keyCandidate: boolean; onEnableKeyReview: () => void; onBack: () => void }) {
  const keyReviewPending = activeModule === 'key' && !keyCandidate;
  return <div><div className="page-head compact"><div><div className="eyebrow">ASSESSMENT / FULL STANDARD</div><h1>分模块审核</h1><p>按第5章和第6章分别审核一般单位、重点单位；前瞻条款不会改变现行基线分数。</p></div><button className="outline-btn" onClick={onBack}><LayoutDashboard size={16} /> 返回总览</button></div><div className="assessment-layout"><div className="module-list">{moduleList.map(module => { const count = allCriteria.filter(criterion => criterion.module === module.id).length; const pending = module.id === 'key' && !keyCandidate; return <button className={`module-nav ${activeModule === module.id ? 'active' : ''}`} onClick={() => setActiveModule(module.id)} key={module.id}><span>{module.short}</span><div><strong>{module.label}</strong><small>{pending ? '资格待判定 · 第6.1入口' : `${count} 项审核`}</small></div><ChevronRight size={15} /></button>; })}</div><div className="criteria-pane"><div className="criteria-toolbar"><div><h2>{moduleList.find(module => module.id === activeModule)?.label}</h2><span>{keyReviewPending ? '资格待判定' : `${items.length} 个适用项目`}</span></div><div className="search"><Search size={16} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="搜索条款、项目或关键词" /></div></div>{keyReviewPending && <div className="review-banner key-review"><AlertTriangle size={16} /><span><strong>当前未按重点单位模式审核。</strong> 请先完成6.1类别排查；如无法排除重点单位资格，可直接展开第6章并保留“防范级别未确定”进行人工复核。</span><button className="primary-btn" onClick={onEnableKeyReview}>按重点单位待判定模式展开第6章</button></div>}{items.length === 0 ? <div className="empty"><CheckCircle2 size={32} /><h3>暂无适用项目</h3><p>当前单位画像未触发该模块。</p></div> : items.map(criterion => <AssessmentItem key={criterion.id} criterion={criterion} answer={answers[criterion.id] ?? emptyAnswer()} update={patch => updateAnswer(criterion.id, patch)} />)}</div></div></div>;
}

function AssessmentItem({ criterion, answer, update }: { criterion: Criterion; answer: Answer; update: (patch: Partial<Answer>) => void }) {
  const hasForward = criterion.basis.some(basis => basis.kind === 'forward');
  return <article className={`criterion ${answer.status === 'noncompliant' ? 'is-danger' : ''}`}><div className="criterion-head"><div><div className="criterion-id">{criterion.id} {hasForward && <span className="pill forward">含前瞻依据</span>}{criterion.critical && <span className="pill critical">关键项</span>}</div><h3>{criterion.title}</h3></div><span className="weight">权重 {criterion.weight}</span></div><p className="prompt">{criterion.prompt}</p><div className="basis-line"><BookOpen size={14} /><span>{criterion.basis.map((basis, index) => <span key={`${basis.source}-${basis.clause}`}>{index > 0 && ' · '}{basisLabel(basis.kind)}：{basis.source} · {basis.clause}</span>)}</span></div><div className="status-row">{(['compliant', 'partial', 'noncompliant', 'na'] as const).map(status => <button key={status} className={`status-btn ${answer.status === status ? 'selected' : ''} ${status}`} onClick={() => update({ status })}>{status === 'compliant' ? '符合' : status === 'partial' ? '部分符合' : status === 'noncompliant' ? '不符合' : '不适用'}</button>)}</div><div className="evidence-grid"><label>证据编号/位置<input value={answer.evidence} onChange={event => update({ evidence: event.target.value })} placeholder={criterion.evidence} /></label><label>整改负责人<input value={answer.owner} onChange={event => update({ owner: event.target.value })} placeholder="未整改时填写" /></label><label>整改期限<input type="date" value={answer.due} onChange={event => update({ due: event.target.value })} /></label><label>整改措施<textarea value={answer.action} onChange={event => update({ action: event.target.value })} placeholder="记录拟采取的措施" /></label>{answer.status === 'na' && <label className="na-reason">不适用理由<input value={answer.note} onChange={event => update({ note: event.target.value })} placeholder="请说明为何不适用" required /></label>}</div></article>;
}

function Remediation({ items, answers, updateAnswer, onAssess }: { items: Criterion[]; answers: Answers; updateAnswer: (id: string, patch: Partial<Answer>) => void; onAssess: (module: string) => void }) {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | RemediationStatus>('all');
  const [riskFilter, setRiskFilter] = useState('all');
  const findings = items.filter(criterion => ['partial', 'noncompliant'].includes(answers[criterion.id]?.status));
  const outstanding = findings.filter(criterion => answers[criterion.id]?.remediationStatus !== 'closed');
  const visible = findings.filter(criterion => {
    const answer = answers[criterion.id] ?? emptyAnswer();
    const searchable = `${criterion.id}${criterion.title}${answer.owner}${answer.action}`.toLowerCase();
    return (!query || searchable.includes(query.toLowerCase()))
      && (statusFilter === 'all' || answer.remediationStatus === statusFilter)
      && (riskFilter === 'all' || priority(criterion, answer) === riskFilter);
  });
  return <div><div className="page-head compact"><div><div className="eyebrow">ACTION TRACKER</div><h1>整改清单</h1><p>支持按状态、优先级、负责人和期限追踪整改到复核关闭；关闭历史仍可筛选和重新打开。</p></div><div className="count-badge">{outstanding.length} 项待整改</div></div><div className="filter-bar"><div className="search"><Search size={16} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="搜索项目、负责人或措施" /></div><select value={statusFilter} onChange={event => setStatusFilter(event.target.value as typeof statusFilter)}><option value="all">全部状态</option><option value="pending">待整改</option><option value="in_progress">整改中</option><option value="review">待复核</option><option value="closed">已关闭</option></select><select value={riskFilter} onChange={event => setRiskFilter(event.target.value)}><option value="all">全部优先级</option><option>立即</option><option>高</option><option>中</option></select></div><div className="remediation-list">{visible.length === 0 ? <div className="empty"><CheckCircle2 size={34} /><h3>{findings.length ? '没有匹配的整改项' : '暂无合规缺口'}</h3><p>{findings.length ? '调整筛选条件，已关闭项目也可在此查看和恢复。' : '完成审核后，存在部分符合或不符合的项目会自动出现在这里。'}</p></div> : visible.map(criterion => { const answer = answers[criterion.id] ?? emptyAnswer(); return <article className="remediation-item" key={criterion.id}><div className="remediation-main"><div className="criterion-id">{criterion.id} <span className={`pill ${answer.status === 'noncompliant' ? 'critical' : 'forward'}`}>{priority(criterion, answer)}优先级</span></div><h3>{criterion.title}</h3><p>{criterion.prompt}</p><div className="basis-line"><BookOpen size={14} /> {criterion.basis.map(basis => `${basisLabel(basis.kind)}：${basis.source} · ${basis.clause}`).join(' · ')}</div></div><div className="remediation-fields"><label>负责人<input value={answer.owner} onChange={event => updateAnswer(criterion.id, { owner: event.target.value })} /></label><label>期限<input type="date" value={answer.due} onChange={event => updateAnswer(criterion.id, { due: event.target.value })} /></label><label>状态<select value={answer.remediationStatus} onChange={event => updateAnswer(criterion.id, { remediationStatus: event.target.value as RemediationStatus })}><option value="pending">待整改</option><option value="in_progress">整改中</option><option value="review">待复核</option><option value="closed">已关闭</option></select></label><label>措施<textarea value={answer.action} onChange={event => updateAnswer(criterion.id, { action: event.target.value })} /></label><button className="text-btn" onClick={() => onAssess(criterion.module)}>回到审核项 <ChevronRight size={14} /></button></div></article>; })}</div></div>;
}

function Report({ profile, current, forward, answers }: { profile: Profile; current: ReturnType<typeof score>; forward: ReturnType<typeof score>; answers: Answers }) {
  const detailRows = reportDetailRows({ profile, current, forward, answers });
  const exceptionRows = detailRows.filter(row => ['部分符合', '不符合', '不适用'].includes(row.结论));
  const forwardOnly = forward.active.filter(criterion => !current.active.some(currentCriterion => currentCriterion.id === criterion.id));
  return <div className="report-page"><div className="page-head compact no-print"><div><div className="eyebrow">REPORT / INTERNAL USE</div><h1>审核报告</h1><p>生成时间：{new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}</p></div><div className="report-actions"><button className="outline-btn" onClick={() => void exportWordReport({ profile, current, forward, answers }).catch(() => window.alert('Word导出失败，请重试'))}><FileText size={16} /> 导出Word</button><button className="outline-btn" onClick={() => void exportExcelReport({ profile, current, forward, answers }).catch(() => window.alert('Excel导出失败，请重试'))}><Table2 size={16} /> 导出Excel</button><button className="primary-btn" onClick={() => window.print()}><FileText size={16} /> 打印报告</button></div></div><div className="report-sheet"><div className="report-header"><div><div className="report-kicker">单位内部治安保卫合规审核</div><h1>{profile.name || '未命名单位'}</h1><p>{profile.region || '未填写地区'} · {profile.unitType} · {profile.industry || '未填写行业'} · 审核日期 {profile.reviewDate || today}</p></div><div className={`report-score ${current.level === '高风险' ? 'danger' : ''}`}><strong>{current.completion}%</strong><span>{current.level}</span></div></div><div className="report-warning"><AlertTriangle size={16} /> 本报告为内部自查辅助，不等同于公安机关、主管部门或其他监管机构的法定合格证明。征求意见稿项目仅作前瞻性参考。</div><ReviewReasons reasons={current.reviewReasons} /><div className="report-stats"><div><span>现行适用项目</span><strong>{current.counted.length}</strong></div><div><span>现行关键缺口</span><strong>{current.criticalGaps.length}</strong></div><div><span>现行待整改</span><strong>{current.remediationOpen.length}</strong></div><div><span>前瞻差距项目</span><strong>{forwardOnly.length}</strong></div></div><h2>缺口、不适用与整改明细</h2><div className="report-table">{exceptionRows.length === 0 ? <div className="empty">暂无部分符合、不符合或不适用项目</div> : exceptionRows.map(row => <div className="report-row report-row-rich" key={`${row.口径}-${row.条款编号}`}><b>{row.条款编号}</b><span><strong>{row.审核项目}</strong><small>{row.模块} · {row.口径} · {row.依据}</small><small>证据：{row.证据编号或位置 || '未填写'}{row.不适用理由 ? ` · 不适用理由：${row.不适用理由}` : ''}</small></span><span>{row.结论}<small>{row.整改状态}</small></span><span>{row.整改负责人 || '待指定'}<small>{row.整改期限 || '待定'}</small></span><span>{row.整改措施 || '未填写措施'}</span></div>)}</div><div className="report-foot">依据：DB11/T 2552—2026（第1—9章及附录A—H）、2004版《企业事业单位内部治安保卫条例》；征求意见稿为前瞻参考。审核人：{profile.reviewer || '未填写'}。证据索引、整改状态、整改措施和不适用理由来自本机审核档案。</div></div></div>;
}

function ProfileModal({ profile, setProfile, onClose, onReset }: { profile: Profile; setProfile: (profile: Profile) => void; onClose: () => void; onReset: () => void }) {
  const [draft, setDraft] = useState(profile);
  const set = (key: keyof Profile, value: unknown) => setDraft(current => ({ ...current, [key]: value }));
  const requiresQualificationReview = hasSpecialRisk(draft);
  return <div className="modal-backdrop"><div className="modal"><div className="modal-head"><div><div className="eyebrow">UNIT PROFILE</div><h2>创建 / 编辑单位画像</h2></div><button className="icon-btn" onClick={onClose}><X size={18} /></button></div><p className="modal-note">画像只用于决定审核项适用范围，不上传至服务器。特殊风险场景会提示重点单位资格与专项控制复核，但不会自动改变“重点单位模式”的勾选；防范级别仅用于筛选，不替代正式认定。</p>{requiresQualificationReview && !draft.keyCandidate && <div className="profile-review-hint"><AlertTriangle size={15} /> 已识别特殊风险场景：请完成重点单位资格排查；当前仍按一般单位模式审核，并保留第6.1判定入口。</div>}<div className="form-grid"><label className="wide">单位名称<input value={draft.name} onChange={event => set('name', event.target.value)} placeholder="例如：某科技有限公司" /></label><label>所属地区<input value={draft.region} onChange={event => set('region', event.target.value)} placeholder="省/市/区" /></label><label>单位类型<select value={draft.unitType} onChange={event => set('unitType', event.target.value)}>{unitTypes.map(unitType => <option key={unitType}>{unitType}</option>)}</select></label><label>所属行业<input value={draft.industry} onChange={event => set('industry', event.target.value)} placeholder="例如：互联网、医疗、教育" /></label><label>审核人<input value={draft.reviewer} onChange={event => set('reviewer', event.target.value)} placeholder="姓名/部门" /></label><label>审核日期<input type="date" value={draft.reviewDate} onChange={event => set('reviewDate', event.target.value)} /></label><label className="wide">重点单位审核采用的防范级别<select value={draft.keyProtectionLevel} disabled={!draft.keyCandidate} onChange={event => set('keyProtectionLevel', event.target.value)}><option value="未确定">未确定（显示确认与人工复核事项）</option><option value="三级">三级防范（第6.5）</option><option value="二级">二级防范（第6.5 + 6.6）</option><option value="一级">一级防范（第6.5 + 6.6 + 6.7）</option></select></label></div><div className="trigger-title">适用性触发条件</div><div className="check-grid">{([['multiSite', '多地机构/设施/场站'], ['keyCandidate', '按重点单位模式审核（默认待判定）'], ['secret', '涉及国家秘密/涉密载体'], ['dangerous', '涉及危险物品/菌种/武器弹药'], ['crowded', '人员密集/大型活动场所'], ['dataStorage', '重要数据存储/重要高科技或互联网企业']] as [keyof Profile, string][]).map(([key, label]) => <label className="check-item" key={key}><input type="checkbox" checked={Boolean(draft[key])} onChange={event => set(key, event.target.checked)} /><span>{label}</span></label>)}</div><div className="modal-actions"><button className="outline-btn" onClick={() => { onReset(); onClose(); }}>重置审核答案</button><div><button className="outline-btn" onClick={onClose}>取消</button><button className="primary-btn" onClick={() => { if (!isBusinessDate(draft.reviewDate)) { window.alert('请填写有效的审核日期。'); return; } setProfile(normalizeProfileDraft(draft)); }}>保存画像</button></div></div></div></div>;
}

export default App;
