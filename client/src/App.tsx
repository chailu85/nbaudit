import React, { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AlertTriangle, BookOpen, CheckCircle2, ChevronRight, ClipboardCheck, Download, FileText, LayoutDashboard, ListChecks, Save, Search, ShieldCheck, SlidersHorizontal, Table2, Upload, X } from 'lucide-react';
import { basisLabel, criteria, type Criterion, modules, type Profile, standardClauses, unitTypes } from '@/data/criteria';
import { SourceLibrary } from '@/components/SourceLibrary';
import { canCloseRemediation, closureMissingFields, effectiveStatus, type Answer, type Answers, emptyAnswer, priority, remediationLabel, type RemediationStatus, reviewReasonText, score, statusLabel } from '@/lib/scoring';
import { type AuditState, SCHEMA_VERSION, clearAudit, createBlankAnswers, downloadJson, downloadRawAudit, loadAudit, readJsonFile, saveAudit } from '@/lib/storage';
import { exportExcelReport, exportWordReport, reportDetailRows } from '@/lib/reportExport';
import { businessDate, isBusinessDate } from '@/lib/businessDate';
import { createAuditProfile, hasSpecialRisk, normalizeProfileDraft, prepareAuditProfileDraft } from '@/lib/profile';
import { A04_CONTROL_SET_VERSION, evaluateA04Rule } from '@/data/a04Controls';
import { defaultA04Profile, type A04Fact, type A04ProfileFacts } from '@/data/a04Types';
import './index.css';

type View = 'dashboard' | 'assessment' | 'remediation' | 'sources' | 'report';

const today = businessDate();
const makeAnswers = (): Answers => createBlankAnswers(criteria);
const initialLoad = loadAudit(createAuditProfile(), makeAnswers());
const initialAudit = initialLoad.state;
const statusValues = new Set(['compliant', 'partial', 'noncompliant', 'na']);

function App() {
  const [profile, setProfile] = useState<Profile>(initialAudit?.profile ?? createAuditProfile());
  const [answers, setAnswers] = useState<Answers>(initialAudit?.answers ?? makeAnswers());
  const [view, setView] = useState<View>('dashboard');
  const [activeModule, setActiveModule] = useState('governance');
  const [query, setQuery] = useState('');
  const [showProfile, setShowProfile] = useState(!initialAudit);
  const [isNewAudit, setIsNewAudit] = useState(!initialAudit);
  const [notice, setNotice] = useState('');
  const [autoSavePaused, setAutoSavePaused] = useState(Boolean(initialLoad.issue));
  const [persistenceIssue, setPersistenceIssue] = useState(initialLoad.issue?.message ?? '');
  const [recoveryRaw, setRecoveryRaw] = useState(initialLoad.issue?.raw);
  const fileRef = useRef<HTMLInputElement>(null);

  const currentScore = useMemo(() => score(criteria, answers, profile, false), [answers, profile]);
  const forwardScore = useMemo(() => score(criteria, answers, profile, true), [answers, profile]);
  const assessmentCriteria = forwardScore.active.filter(criterion => profile.a04?.showSupplemental || criterion.scoreContribution !== 'supplemental');
  const filtered = assessmentCriteria.filter(criterion => {
    const searchable = `${criterion.id}${criterion.title}${criterion.prompt}${criterion.basis.map(basis => basis.clause).join('')}`.toLowerCase();
    return (!query || searchable.includes(query.toLowerCase())) && criterion.module === activeModule;
  });

  const showNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 3200);
  };

  const makeState = (): AuditState => ({ version: SCHEMA_VERSION, controlSetVersion: A04_CONTROL_SET_VERSION, profile, answers, savedAt: new Date().toISOString() });
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
      const result = saveAudit(makeState());
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
    setProfile(createAuditProfile());
    setAnswers(makeAnswers());
    setIsNewAudit(true);
    setShowProfile(true);
    setPersistenceIssue('');
    setRecoveryRaw(undefined);
    showNotice('已清空本机草稿；请保存新审核后恢复自动保存。');
  };

  const importFile = async (file?: File) => {
    if (!file) return;
    try {
      const imported = await readJsonFile(file, createAuditProfile(), makeAnswers());
      const next = { ...imported, savedAt: new Date().toISOString() };
      const persisted = saveAudit(next);
      setProfile(next.profile);
      setAnswers(next.answers);
      setIsNewAudit(false);
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

  return <div className="app-root">
    <header className="topbar">
      <div className="brand">
        <div className="brand-mark"><ShieldCheck size={22} /></div>
        <div><div className="brand-title">内保合规审核台</div><div className="brand-sub">单位内部治安保卫 · 全标准版</div></div>
      </div>
      <details className="data-menu">
        <summary>数据</summary>
        <div className="data-menu-panel">
          <span className={`status-dot ${persistenceIssue ? 'status-warning' : ''}`}><span />{persistenceIssue ? '本机保存异常' : '本地模式 · 不上传材料'}</span>
          <button className="icon-btn" onClick={save} title="保存"><Save size={18} /> 保存</button>
          <button className="outline-btn import-action" onClick={() => fileRef.current?.click()}><Upload size={16} /> 导入</button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={event => importFile(event.target.files?.[0])} />
          <button className="primary-btn" onClick={() => downloadJson(makeState())}><Download size={16} /> 导出JSON</button>
          <button className="danger-link" onClick={reset}>清空本机草稿</button>
        </div>
      </details>
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
        <div className="sidebar-foot"><div>审核标准库</div><strong>DB11/T 2552—2026</strong><span>第1—9章 · 附录A—H</span><span>2004版条例 · 修订征求意见稿</span></div>
      </aside>
      <main className="main-content">
        {notice && <div className="toast"><CheckCircle2 size={16} /> {notice}</div>}
        {persistenceIssue && <div className="persistence-banner"><AlertTriangle size={16} /><span><strong>本机档案未确认保存。</strong>{persistenceIssue}</span>{recoveryRaw && <button className="outline-btn" onClick={() => downloadRawAudit(recoveryRaw)}>导出原始草稿</button>}<button className="outline-btn" onClick={() => downloadJson(makeState())}>导出当前草稿</button></div>}
        {view === 'dashboard' && <Dashboard profile={profile} score={currentScore} forward={forwardScore} answers={answers} onModule={goAssessment} onStart={() => setShowProfile(true)} forwardOnlyCount={forwardOnlyCount} />}
        {view === 'assessment' && <Assessment profile={profile} activeModule={activeModule} setActiveModule={setActiveModule} moduleList={modules} items={filtered} allCriteria={assessmentCriteria} answers={answers} updateAnswer={updateAnswer} query={query} setQuery={setQuery} keyCandidate={profile.keyCandidate} supplementalEnabled={Boolean(profile.a04?.showSupplemental)} onToggleSupplement={() => setProfile(current => ({ ...current, a04: { ...defaultA04Profile, ...current.a04, showSupplemental: !current.a04?.showSupplemental } }))} onEnableKeyReview={() => { setProfile(current => ({ ...current, keyCandidate: true, keyProtectionLevel: '未确定' })); setAutoSavePaused(false); }} onBack={() => setView('dashboard')} />}
        {view === 'remediation' && <Remediation profile={profile} items={forwardScore.active} answers={answers} updateAnswer={updateAnswer} onAssess={goAssessment} />}
        {view === 'sources' && <SourceLibrary items={criteria} clauses={standardClauses} />}
        {view === 'report' && <Report profile={profile} current={currentScore} forward={forwardScore} answers={answers} />}
      </main>
    </div>
    {showProfile && <ProfileModal profile={profile} isNewAudit={isNewAudit} setProfile={next => { setProfile(next); setIsNewAudit(false); setAutoSavePaused(false); }} onClose={() => setShowProfile(false)} onReset={() => { setAnswers(makeAnswers()); setView('dashboard'); }} />}
  </div>;
}

function NavItem({ active, icon, label, count, onClick }: { active: boolean; icon: ReactNode; label: string; count?: number; onClick: () => void }) {
  return <button className={`nav-item ${active ? 'active' : ''}`} onClick={onClick}>{icon}<span>{label}</span>{count ? <b>{count}</b> : null}</button>;
}

function ReviewReasons({ reasons, onCriterion }: { reasons: ReturnType<typeof score>['reviewReasons']; onCriterion?: (criterionId: string) => void }) {
  if (!reasons.length) return null;
  return <details className="review-reasons"><summary>{reasons.length} 项需人工复核</summary><div className="review-reason-list">{reasons.map(reason => <p key={reason.code}>{reviewReasonText(reason)}{reason.criterionIds?.length ? <>（相关项目：{reason.criterionIds.map((id, index) => <React.Fragment key={id}>{index > 0 && '、'}{onCriterion ? <button className="review-criterion-link" onClick={() => onCriterion(id)}>{id}</button> : id}</React.Fragment>)}</> : ''}</p>)}</div></details>;
}

function Dashboard({ profile, score: snapshot, answers, onModule, onStart }: { profile: Profile; score: ReturnType<typeof score>; forward: ReturnType<typeof score>; answers: Answers; onModule: (module: string) => void; onStart: () => void; forwardOnlyCount: number }) {
  const reviewedCount = snapshot.counted.filter(criterion => statusValues.has(answers[criterion.id]?.status)).length;
  const keyModeOff = !profile.keyCandidate;
  const goToReviewCriterion = (criterionId: string) => {
    const criterion = criteria.find(item => item.id === criterionId);
    if (criterion) onModule(criterion.module);
  };
  return <div className="dashboard-page">
    <div className="page-head"><div><div className="eyebrow">COMPLIANCE REVIEW / {profile.reviewDate || today}</div><h1>{profile.name ? `${profile.name} · 合规审核总览` : '开始一次单位合规审核'}</h1><p>按DB11/T 2552—2026章节组织：第5章一般单位、第6章重点单位常态防范。</p></div><button className="primary-btn" onClick={onStart}><SlidersHorizontal size={17} /> {profile.name ? '编辑单位画像' : '创建审核'}</button></div>
    <section className="dashboard-summary"><div className={`dashboard-score ${snapshot.level === '高风险' ? 'danger' : ''}`}><span>现行基线完成率</span><strong>{snapshot.completion}<small>%</small></strong><p>已审核 {reviewedCount} / 当前计分 {snapshot.counted.length} 项 · {snapshot.level}</p></div><div className="dashboard-metrics"><div><span>国内适用项</span><strong>{snapshot.domestic.length}</strong><small>全部 {snapshot.domestic.length} 项 / 当前计分 {snapshot.counted.length} 项</small></div><div><span>现行关键缺口</span><strong>{snapshot.criticalGaps.length}</strong><small>仅现行基线强制项</small></div><div><span>附录F建议得分</span><strong>{snapshot.suggestedCompletion}<em>%</em></strong><small>{snapshot.recommended.length} 项“宜”单列建议分</small></div></div></section>
    {keyModeOff && <div className="info-banner key-entry"><BookOpen size={16} /><span><strong>第6.1 重点单位类别筛查入口。</strong> 当前按一般单位模式审核；如本单位已被认定为重点单位或需要预先核验，可进入第6章切换模式。</span><button className="outline-btn" onClick={() => onModule('key')}>查看第6章</button></div>}
    <ReviewReasons reasons={snapshot.reviewReasons} onCriterion={goToReviewCriterion} />
    <section className="dashboard-modules"><div className="section-head"><div><h2>模块完成情况</h2><p>审核模块与标准章节对应；重点单位的访问、人力、实体、电子要求均归入第6章。</p></div><span className="muted">全部 {snapshot.domestic.length} 项 / 当前计分 {snapshot.counted.length} 项</span></div><div className="module-table"><div className="module-table-head"><span>序号</span><span>模块名</span><span>已完成 / 总数</span><span>完成度</span></div>{modules.map((module, index) => { const items = snapshot.domestic.filter(criterion => criterion.module === module.id); const reviewed = items.filter(criterion => statusValues.has(answers[criterion.id]?.status)).length; const percentage = items.length ? Math.round(reviewed / items.length * 100) : 0; const pending = module.id === 'key' && keyModeOff; return <button className="module-table-row" key={module.id} onClick={() => onModule(module.id)}><span>{String(index + 1).padStart(2, '0')}</span><strong>{module.label}</strong><div className="module-table-measure"><span>{pending ? '筛查入口' : `${reviewed} / ${items.length}`}</span><span>{pending ? '—' : `${percentage}%`}</span></div><i aria-hidden="true"><b style={{ width: `${percentage}%` }} /></i></button>; })}</div></section>
    <div className="dashboard-note"><span>审核提示：如涉及重点单位或特殊风险场景，再确认重点单位资格与防范级别；工具不会自动改变审核模式。</span><button className="text-btn" onClick={() => onModule('key')}>查看第6章</button></div>
  </div>;
}

const assessmentStatuses = ['compliant', 'partial', 'noncompliant', 'na'] as const;
type AssessmentStatus = typeof assessmentStatuses[number];

export const assessmentFieldVisibility = (status: Answer['status']) => ({
  showRemediationFields: status === 'partial' || status === 'noncompliant',
  showNaReason: status === 'na',
});

export const assessmentStatusForKey = (key: string): AssessmentStatus | undefined => ({ '1': 'compliant', '2': 'partial', '3': 'noncompliant', '4': 'na' }[key] as AssessmentStatus | undefined);

export const assessmentIndexAfter = (index: number, length: number, delta: number) => Math.min(Math.max(index + delta, 0), Math.max(length - 1, 0));

export const assessmentStatusPatch = (answer: Answer, status: AssessmentStatus): Partial<Answer> => ({
  status,
  a04: { ...answer.a04, needsReview: false },
});

function Assessment({ profile, activeModule, setActiveModule, moduleList, items, allCriteria, answers, updateAnswer, query, setQuery, keyCandidate, supplementalEnabled, onToggleSupplement, onEnableKeyReview, onBack }: { profile: Profile; activeModule: string; setActiveModule: (value: string) => void; moduleList: typeof modules; items: Criterion[]; allCriteria: Criterion[]; answers: Answers; updateAnswer: (id: string, patch: Partial<Answer>) => void; query: string; setQuery: (value: string) => void; keyCandidate: boolean; supplementalEnabled: boolean; onToggleSupplement: () => void; onEnableKeyReview: () => void; onBack: () => void }) {
  const [activeCriterionIndex, setActiveCriterionIndex] = useState(0);
  const [isModulePickerOpen, setIsModulePickerOpen] = useState(false);
  const moduleIndex = Math.max(0, moduleList.findIndex(module => module.id === activeModule));
  const activeCriterion = items[activeCriterionIndex];
  const keyModeOff = activeModule === 'key' && !keyCandidate;
  const moduleStats = moduleList.map((module, index) => {
    const moduleItems = allCriteria.filter(criterion => criterion.module === module.id);
    const completed = moduleItems.filter(criterion => statusValues.has(answers[criterion.id]?.status)).length;
    return { module, index, total: moduleItems.length, completed, pending: module.id === 'key' && !keyCandidate };
  });

  useEffect(() => {
    setActiveCriterionIndex(current => assessmentIndexAfter(current, items.length, 0));
  }, [activeModule, items.length, query]);

  const selectModule = (moduleId: string) => {
    setActiveModule(moduleId);
    setActiveCriterionIndex(0);
    setIsModulePickerOpen(false);
  };
  const moveModule = (delta: number) => selectModule(moduleList[assessmentIndexAfter(moduleIndex, moduleList.length, delta)]!.id);
  const moveCriterion = (delta: number) => setActiveCriterionIndex(current => assessmentIndexAfter(current, items.length, delta));
  const selectStatus = (status: AssessmentStatus) => {
    if (!activeCriterion) return;
    updateAnswer(activeCriterion.id, assessmentStatusPatch(answers[activeCriterion.id] ?? emptyAnswer(), status));
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      const isEditable = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || (target instanceof HTMLElement && target.isContentEditable);
      if (isModulePickerOpen || isEditable || event.altKey || event.ctrlKey || event.metaKey || items.length === 0) return;
      if (event.key === 'ArrowUp') { event.preventDefault(); moveCriterion(-1); return; }
      if (event.key === 'ArrowDown') { event.preventDefault(); moveCriterion(1); return; }
      const status = assessmentStatusForKey(event.key);
      if (status) { event.preventDefault(); selectStatus(status); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeCriterion, answers, isModulePickerOpen, items.length]);

  const activeModuleLabel = moduleList[moduleIndex]?.label ?? '分模块审核';
  return <div className="assessment-page">
    <div className="page-head compact assessment-page-head"><div><div className="eyebrow">ASSESSMENT / FULL STANDARD</div><h1>分模块审核</h1><p>按第5章和第6章分别审核一般单位、重点单位；A04原子控制按其独立适用条件、来源和强度核验。</p></div><button className="outline-btn" onClick={onBack}><LayoutDashboard size={16} /> 返回总览</button></div>
    <div className="mobile-module-bar">
      <button className="text-btn" onClick={() => moveModule(-1)} disabled={moduleIndex === 0}>← 上一模块</button>
      <button className="module-selector" onClick={() => setIsModulePickerOpen(true)}>{String(moduleIndex + 1).padStart(2, '0')} / {String(moduleList.length).padStart(2, '0')} {activeModuleLabel} <span>▾</span></button>
      <button className="text-btn" onClick={() => moveModule(1)} disabled={moduleIndex === moduleList.length - 1}>下一模块 →</button>
    </div>
    {isModulePickerOpen && <div className="module-picker-overlay" role="dialog" aria-modal="true" aria-label="选择审核模块"><div className="module-picker-head"><span>选择审核模块</span><button className="text-btn" onClick={() => setIsModulePickerOpen(false)}>关闭</button></div><div className="module-picker-list">{moduleStats.map(({ module, index, total, completed, pending }) => <button className={`module-picker-item ${module.id === activeModule ? 'active' : ''}`} onClick={() => selectModule(module.id)} key={module.id}><span>{String(index + 1).padStart(2, '0')}</span><strong>{module.label}</strong><small>{pending ? '第6.1筛查入口' : `${completed} / ${total}`}</small></button>)}</div></div>}
    <div className="assessment-layout">
      <aside className="module-list" aria-label="审核模块列表">{moduleStats.map(({ module, index, total, completed, pending }) => <button className={`module-nav ${activeModule === module.id ? 'active' : ''}`} onClick={() => selectModule(module.id)} key={module.id}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{module.label}</strong><small>{pending ? '第6.1筛查入口' : `${completed} / ${total} 项已完成`}</small></div></button>)}</aside>
      <div className="criteria-pane">
        <div className="criteria-toolbar"><div><h2>{activeModuleLabel}</h2><span>{keyModeOff ? '第6.1筛查入口' : `${items.length} 个适用项目`}</span></div><div className="toolbar-actions"><button className={`outline-btn supplemental-toggle ${supplementalEnabled ? 'enabled' : ''}`} onClick={onToggleSupplement}>{supplementalEnabled ? '隐藏补充核验' : '显示补充核验'}</button><div className="search"><Search size={16} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="搜索条款、项目或关键词" /></div></div></div>
        {keyModeOff && <div className="info-banner key-entry"><BookOpen size={16} /><span><strong>当前按一般单位模式审核。</strong> 可先完成第6.1类别筛查；如需审核重点单位要求，可展开重点单位模式并选择相应防范级别。</span><button className="primary-btn" onClick={onEnableKeyReview}>展开重点单位模式</button></div>}
        {items.length === 0 ? <div className="empty"><CheckCircle2 size={32} /><h3>暂无适用项目</h3><p>当前单位画像未触发该模块；请在单位画像中补充A04工程和系统适用事实。</p></div> : <><AssessmentItem criterion={activeCriterion!} answer={answers[activeCriterion!.id] ?? emptyAnswer()} profile={profile} update={patch => updateAnswer(activeCriterion!.id, patch)} /><div className="assessment-item-pagination"><span>第 {activeCriterionIndex + 1} / {items.length} 项</span><button className="text-btn" onClick={() => moveCriterion(1)} disabled={activeCriterionIndex === items.length - 1}>下一项 →</button></div></>}
      </div>
    </div>
  </div>;
}

export function AssessmentItem({ criterion, answer, profile, update }: { criterion: Criterion; answer: Answer; profile: Profile; update: (patch: Partial<Answer>) => void }) {
  const hasForward = criterion.basis.some(basis => basis.kind === 'forward');
  const meta = criterion.controlMeta;
  const effective = effectiveStatus(criterion, answer, profile);
  const fields = assessmentFieldVisibility(answer.status);
  const selectStatus = (status: AssessmentStatus) => update(assessmentStatusPatch(answer, status));
  return <article className={`criterion assessment-item ${effective === 'noncompliant' ? 'is-danger' : ''}`}><div className="criterion-head"><div className="criterion-title-block"><div className="criterion-id">{criterion.id} {hasForward && <span className="forward-label">前瞻</span>}{criterion.critical && <span className="pill critical">关键项</span>}{meta && <span className={`pill ${criterion.scoreContribution === 'supplemental' ? 'supplemental' : 'current'}`}>{meta.uiBadge}</span>}</div><h3>{criterion.title}</h3></div><span className="weight">{criterion.scoreContribution === 'supplemental' ? '不计国内分' : criterion.recommendation?.(profile) ? '建议项（宜）' : `权重 ${criterion.weight}`}</span></div><p className="prompt">{criterion.prompt}</p><details className="basis-details"><summary>依据</summary><div><BookOpen size={14} /><span>{criterion.basis.map((basis, index) => <span key={`${basis.source}-${basis.clause}`}>{index > 0 && ' · '}{basisLabel(basis.kind)}：{basis.source} · {basis.clause}{basis.note ? `（${basis.note}）` : ''}</span>)}</span></div></details>{meta && <A04ReviewFields criterion={criterion} answer={answer} profile={profile} update={update} />}{effective !== answer.status && <div className="effective-status-warning"><AlertTriangle size={14} /> 已选结论“{statusLabel[answer.status]}”受结构化指标、逐来源核验、子断言或不适用规则约束；有效结论为“{statusLabel[effective]}”。</div>}{criterion.scoreContribution === 'supplemental' && <div className="supplemental-note">此项为补充方法/效能观察；其结论、整改和证据会保留，但不会改变中国国内合规分、分母、关键缺口或国内风险结论。</div>}<div className="status-row" role="radiogroup" aria-label="审核结论">{assessmentStatuses.map(status => <button key={status} aria-pressed={answer.status === status} className={`status-btn ${answer.status === status ? 'selected' : ''} ${status}`} onClick={() => selectStatus(status)}>{status === 'compliant' ? '符合' : status === 'partial' ? '部分符合' : status === 'noncompliant' ? '不符合' : '不适用'}</button>)}</div><div className="evidence-grid"><label>证据编号/位置<input value={answer.evidence} onChange={event => update({ evidence: event.target.value })} placeholder={criterion.evidence} /></label>{fields.showRemediationFields && <><label>整改负责人<input value={answer.owner} onChange={event => update({ owner: event.target.value })} placeholder="未整改时填写" /></label><label>整改期限<input type="date" value={answer.due} onChange={event => update({ due: event.target.value })} /></label></>}<label>整改措施<textarea value={answer.action} onChange={event => update({ action: event.target.value })} placeholder="记录拟采取的措施" /></label>{fields.showNaReason && <label className="na-reason">不适用理由<input value={answer.note} onChange={event => update({ note: event.target.value, a04: { ...answer.a04, naBasis: event.target.value } })} placeholder="请说明为何不适用；不能只填未安装/未设置" required /></label>}</div></article>;
}

function A04ReviewFields({ criterion, answer, profile, update }: { criterion: Criterion; answer: Answer; profile: Profile; update: (patch: Partial<Answer>) => void }) {
  const meta = criterion.controlMeta!;
  const details = answer.a04;
  const rule = evaluateA04Rule(criterion, profile, details);
  const updateDetails = (patch: Partial<typeof details>) => update({ a04: { ...details, ...patch, needsReview: false } });
  const updateAssertion = (index: number, patch: Partial<typeof details.subAssertions[number]>) => updateDetails({ subAssertions: details.subAssertions.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item) });
  const removeAssertion = (index: number) => updateDetails({ subAssertions: details.subAssertions.filter((_, itemIndex) => itemIndex !== index) });
  const addAssertion = () => updateDetails({ subAssertions: [...details.subAssertions, { id: `${criterion.id}-S${details.subAssertions.length + 1}`, label: '', status: 'unreviewed', evidence: '', remediation: '' }] });
  const sourceFor = (sourceId: string, clause: string) => details.sourceAssessments.find(item => item.sourceId === sourceId && item.clause === clause) ?? { sourceId, clause, applicability: 'unknown' as const, rationale: '', evidence: '', conclusion: 'unreviewed' as const };
  const updateSource = (sourceId: string, clause: string, patch: Partial<ReturnType<typeof sourceFor>>) => {
    const current = sourceFor(sourceId, clause);
    const hasCurrent = details.sourceAssessments.some(item => item.sourceId === sourceId && item.clause === clause);
    updateDetails({ sourceAssessments: hasCurrent ? details.sourceAssessments.map(item => item.sourceId === sourceId && item.clause === clause ? { ...item, ...patch } : item) : [...details.sourceAssessments, { ...current, ...patch }] });
  };
  const expectedUnit = (meta.structuredRule as { unit?: string } | undefined)?.unit;
  return <details className="a04-control" open={Boolean(details.needsReview || answer.status === 'na')}><summary><span>A04原子控制明细</span><small>{meta.reviewStatus}{details.needsReview ? ' · 由旧档案/未核验状态待复核' : ''}</small></summary><div className="a04-meta-grid"><div><b>适用条件</b><span>{meta.applicability}</span></div><div><b>最低证据</b><span>{meta.requiredEvidence.join('；')}</span></div><div><b>责任部门</b><span>{meta.accountableOwner}</span></div><div><b>关闭条件</b><span>{meta.closureEvidence}</span></div></div><div className="a04-form-grid"><label>对象/空间点位<input value={details.objectLocation} onChange={event => updateDetails({ objectLocation: event.target.value })} placeholder="例如：1号楼北侧主要出入口" /></label><label>适用/排除判断理由<input value={details.applicabilityReason} onChange={event => updateDetails({ applicabilityReason: event.target.value })} placeholder="说明实际资产、工程阶段或排除依据" /></label><label>来源适用说明<input value={details.sourceApplicability} onChange={event => updateDetails({ sourceApplicability: event.target.value })} placeholder="说明控制整体适用口径" /></label>{meta.structuredRule && <><label>实测值<input inputMode="decimal" value={details.measuredValue} onChange={event => updateDetails({ measuredValue: event.target.value })} placeholder="填写非负有限数值" /></label><label>实测单位<input value={details.measuredUnit} onChange={event => updateDetails({ measuredUnit: event.target.value })} placeholder={expectedUnit || '按验收规则'} /></label></>}<label>期限/频率来源<input value={details.deadlineSource} onChange={event => updateDetails({ deadlineSource: event.target.value })} placeholder="法定期限、批准内控或合同来源" /></label><label>整改期间临时防范<textarea value={details.temporaryProtection} onChange={event => updateDetails({ temporaryProtection: event.target.value })} placeholder="整改完成前的替代防护、巡查或值守安排" /></label><label>待专家/人工复核原因<input value={details.reviewReason} onChange={event => updateDetails({ reviewReason: event.target.value })} placeholder="必要时说明待核准事项" /></label>{answer.status === 'na' && <label>不适用依据<input value={details.naBasis} onChange={event => updateDetails({ naBasis: event.target.value, needsReview: false })} placeholder={meta.cannotBeNaWhenActive ? '本项适用时不得标为不适用' : '不得仅填写未安装/未设置'} /></label>}<label>复核证据<input value={details.verificationEvidence} onChange={event => updateDetails({ verificationEvidence: event.target.value })} /></label><label>复核人员<input value={details.verifier} onChange={event => updateDetails({ verifier: event.target.value })} /></label><label>复核日期<input type="date" value={details.verifiedAt} onChange={event => updateDetails({ verifiedAt: event.target.value })} /></label><label>关闭日期<input type="date" value={details.closedAt} onChange={event => updateDetails({ closedAt: event.target.value })} /></label></div>{rule && <div className={`rule-result ${rule.state}`}><strong>结构化判定：</strong>{rule.message}</div>}<div className="source-assessments"><div><strong>逐来源适用与结论</strong><small>每一来源分别记录适用/排除、依据和结论；不得用某一来源适用替代其他来源判断。</small></div>{meta.sourceRequirements.map(requirement => { const item = sourceFor(requirement.sourceId, requirement.clause); return <div className="source-assessment" key={`${requirement.sourceId}-${requirement.clause}`}><b>{requirement.source} · {requirement.clause}（{requirement.strength}）</b><select value={item.applicability} onChange={event => updateSource(requirement.sourceId, requirement.clause, { applicability: event.target.value as typeof item.applicability })}><option value="unknown">待判断</option><option value="applicable">适用</option><option value="excluded">排除/不适用</option></select><select value={item.conclusion} onChange={event => updateSource(requirement.sourceId, requirement.clause, { conclusion: event.target.value as typeof item.conclusion })}>{(['unreviewed', 'compliant', 'partial', 'noncompliant', 'na'] as const).map(status => <option value={status} key={status}>{statusLabel[status]}</option>)}</select><input value={item.rationale} onChange={event => updateSource(requirement.sourceId, requirement.clause, { rationale: event.target.value })} placeholder="本来源适用/排除依据" /><input value={item.evidence} onChange={event => updateSource(requirement.sourceId, requirement.clause, { evidence: event.target.value })} placeholder="本来源证据" /></div>; })}</div><div className="subassertions"><div><strong>子断言</strong><small>对多功能、多个点位或多个资产分别保留结论、证据与整改；任何适用子断言失败将覆盖父项“符合”。</small></div><button type="button" className="outline-btn" onClick={addAssertion}>添加子断言</button>{details.subAssertions.map((item, index) => <div className="subassertion" key={item.id}><input value={item.label} onChange={event => updateAssertion(index, { label: event.target.value })} placeholder="子断言/点位" /><select value={item.status} onChange={event => updateAssertion(index, { status: event.target.value as typeof item.status })}>{(['unreviewed', 'compliant', 'partial', 'noncompliant', 'na'] as const).map(status => <option value={status} key={status}>{statusLabel[status]}</option>)}</select><input value={item.evidence} onChange={event => updateAssertion(index, { evidence: event.target.value })} placeholder="证据索引" /><input value={item.remediation} onChange={event => updateAssertion(index, { remediation: event.target.value })} placeholder="子项整改" /><button type="button" className="icon-btn remove-subassertion" onClick={() => removeAssertion(index)} title="删除子断言">×</button></div>)}</div>{meta.supplementOf.length > 0 && <div className="a04-anchor">关联国内控制：{meta.supplementOf.join('、')}；补充原因：{meta.supplementReason || '—'}</div>}</details>;
}

function Remediation({ profile, items, answers, updateAnswer, onAssess }: { profile: Profile; items: Criterion[]; answers: Answers; updateAnswer: (id: string, patch: Partial<Answer>) => void; onAssess: (module: string) => void }) {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | RemediationStatus>('all');
  const [riskFilter, setRiskFilter] = useState('all');
  const [expandedRemediationId, setExpandedRemediationId] = useState<string | null>(null);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const statusOf = (criterion: Criterion) => effectiveStatus(criterion, answers[criterion.id] ?? emptyAnswer(), profile);
  const priorityOf = (criterion: Criterion) => { const status = statusOf(criterion); return criterion.critical && status === 'noncompliant' ? '立即' : status === 'noncompliant' ? '高' : '中'; };
  const findings = items.filter(criterion => ['partial', 'noncompliant'].includes(statusOf(criterion)));
  const outstanding = findings.filter(criterion => { const answer = answers[criterion.id] ?? emptyAnswer(); return answer.remediationStatus !== 'closed' || !canCloseRemediation(answer); });
  const visible = findings.filter(criterion => { const answer = answers[criterion.id] ?? emptyAnswer(); const currentPriority = priorityOf(criterion); const searchable = `${criterion.id}${criterion.title}${answer.owner}${answer.action}`.toLowerCase(); return (!query || searchable.includes(query.toLowerCase())) && (statusFilter === 'all' || answer.remediationStatus === statusFilter) && (riskFilter === 'all' || currentPriority === riskFilter); });
  const changeStatus = (criterion: Criterion, answer: Answer, remediationStatus: RemediationStatus) => {
    if (remediationStatus === 'closed') { const missing = closureMissingFields(answer); if (missing.length) { window.alert(`不能关闭整改：请先填写${missing.join('、')}。`); return; } }
    updateAnswer(criterion.id, { remediationStatus, a04: { ...answer.a04, closedAt: remediationStatus === 'closed' ? (answer.a04.closedAt || businessDate()) : answer.a04.closedAt } });
  };
  const statusText = statusFilter === 'all' ? '全部' : remediationLabel[statusFilter];
  const priorityText = riskFilter === 'all' ? '全部' : riskFilter;
  const renderGroup = (title: string, group: Criterion[]) => group.length ? <section className="remediation-group" key={title}><h2>{title}</h2><div className="remediation-list">{group.map(criterion => { const answer = answers[criterion.id] ?? emptyAnswer(); const currentPriority = priorityOf(criterion); const missing = closureMissingFields(answer); const isExpanded = expandedRemediationId === criterion.id; return <article className={`remediation-item ${isExpanded ? 'expanded' : ''}`} key={criterion.id}><button className="remediation-row" onClick={() => setExpandedRemediationId(current => current === criterion.id ? null : criterion.id)}><div className="remediation-row-meta"><span className="remediation-id">{criterion.id}</span><span className={`remediation-priority ${currentPriority === '中' ? '' : 'high'}`}>{currentPriority}优先级</span></div><h3>{criterion.title}</h3><div className="remediation-row-details"><span className="remediation-owner">{answer.owner || '—'}</span><span className="remediation-due">{answer.due || '—'}</span><span className="remediation-status">{remediationLabel[answer.remediationStatus]}</span></div></button>{isExpanded && <div className="remediation-editor"><details className="remediation-basis"><summary>依据</summary><div>{criterion.basis.map((basis, index) => <span key={`${basis.source}-${basis.clause}`}>{index > 0 && ' · '}{basisLabel(basis.kind)}：{basis.source} · {basis.clause}</span>)}</div></details><div className="remediation-fields"><label>负责人<input value={answer.owner} onChange={event => updateAnswer(criterion.id, { owner: event.target.value })} /></label><label>期限<input type="date" value={answer.due} onChange={event => updateAnswer(criterion.id, { due: event.target.value })} /></label><label>关闭状态<select value={answer.remediationStatus} onChange={event => changeStatus(criterion, answer, event.target.value as RemediationStatus)}><option value="pending">待整改</option><option value="in_progress">整改中</option><option value="review">待复核</option><option value="closed">已关闭</option></select></label><label>复核人员<input value={answer.a04.verifier} onChange={event => updateAnswer(criterion.id, { a04: { ...answer.a04, verifier: event.target.value } })} /></label><label>复核日期<input type="date" value={answer.a04.verifiedAt} onChange={event => updateAnswer(criterion.id, { a04: { ...answer.a04, verifiedAt: event.target.value } })} /></label><label>复核证据<input value={answer.a04.verificationEvidence} onChange={event => updateAnswer(criterion.id, { a04: { ...answer.a04, verificationEvidence: event.target.value } })} /></label><label>整改期间临时防范<textarea value={answer.a04.temporaryProtection} onChange={event => updateAnswer(criterion.id, { a04: { ...answer.a04, temporaryProtection: event.target.value } })} /></label><label>整改措施<textarea value={answer.action} onChange={event => updateAnswer(criterion.id, { action: event.target.value })} /></label></div><div className="remediation-editor-actions"><div>{missing.length > 0 && <span className="closure-warning">缺少：{missing.join('、')}；补齐前仍保留待整改。</span>}</div><button className="primary-btn" disabled={missing.length > 0 || answer.remediationStatus === 'closed'} onClick={() => changeStatus(criterion, answer, 'closed')}>关闭整改</button><button className="text-btn" onClick={() => onAssess(criterion.module)}>回到审核项</button></div></div>}</article>; })}</div></section> : null;
  const highPriority = visible.filter(criterion => ['立即', '高'].includes(priorityOf(criterion)));
  const otherPriority = visible.filter(criterion => !['立即', '高'].includes(priorityOf(criterion)));
  return <div className="remediation-page"><div className="page-head compact remediation-page-head"><div><h1>整改清单</h1><details className="remediation-description"><summary>说明</summary><p>逐项保存临时防范、复核证据、复核人员和日期；关闭不自动改变合规结论，缺少关闭证据仍保留为待整改。</p></details></div><div className="remediation-total"><strong>{outstanding.length}</strong><span>项待整改</span></div></div><div className="remediation-filters"><div className="remediation-search"><input value={query} onChange={event => setQuery(event.target.value)} placeholder="搜索项目、负责人或措施" /></div><button className="text-btn" onClick={() => setIsFilterPanelOpen(true)}>状态：{statusText} ▾</button><button className="text-btn" onClick={() => setIsFilterPanelOpen(true)}>优先级：{priorityText} ▾</button></div>{isFilterPanelOpen && <div className="remediation-filter-panel"><div className="remediation-filter-panel-head"><span>筛选</span><button className="text-btn" onClick={() => setIsFilterPanelOpen(false)}>完成</button></div><label>状态<select value={statusFilter} onChange={event => setStatusFilter(event.target.value as typeof statusFilter)}><option value="all">全部</option><option value="pending">待整改</option><option value="in_progress">整改中</option><option value="review">待复核</option><option value="closed">已关闭</option></select></label><label>优先级<select value={riskFilter} onChange={event => setRiskFilter(event.target.value)}><option value="all">全部</option><option>立即</option><option>高</option><option>中</option></select></label></div>}{visible.length === 0 ? <div className="empty"><CheckCircle2 size={34} /><h3>{findings.length ? '没有匹配的整改项' : '暂无合规缺口'}</h3><p>{findings.length ? '调整筛选条件，已关闭项目也可在此查看和恢复。' : '完成审核后，存在部分符合或不符合的项目会自动出现在这里。'}</p></div> : <>{renderGroup('高优先级', highPriority)}{renderGroup('其他', otherPriority)}</>}</div>;
}

function Report({ profile, current, forward, answers }: { profile: Profile; current: ReturnType<typeof score>; forward: ReturnType<typeof score>; answers: Answers }) {
  const detailRows = reportDetailRows({ profile, current, forward, answers });
  const exceptionRows = detailRows.filter(row => ['部分符合', '不符合', '不适用'].includes(row.结论));
  return <div className="report-page"><div className="page-head compact no-print report-page-head"><div><div className="eyebrow">REPORT / INTERNAL USE</div><h1>审核报告</h1><p>生成时间：{new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}</p></div><div className="report-actions"><button className="primary-btn" onClick={() => void exportWordReport({ profile, current, forward, answers }).catch(() => window.alert('Word导出失败，请重试'))}><FileText size={16} /> 导出Word</button><button className="outline-btn" onClick={() => void exportExcelReport({ profile, current, forward, answers }).catch(() => window.alert('Excel导出失败，请重试'))}><Table2 size={16} /> 导出Excel</button><button className="outline-btn" onClick={() => window.print()}><FileText size={16} /> 打印报告</button></div></div><div className="report-sheet"><div className="report-header"><div><div className="report-kicker">单位内部治安保卫合规审核</div><h1>审核报告</h1></div><div className={`report-score ${current.level === '高风险' ? 'danger' : ''}`}><strong>{current.completion}%</strong><span>{current.level}</span></div></div><div className="report-unit-grid"><div><span>单位名称</span><strong>{profile.name || '未命名单位'}</strong></div><div><span>所属地区</span><strong>{profile.region || '未填写地区'}</strong></div><div><span>所属行业</span><strong>{profile.industry || '未填写行业'}</strong></div><div><span>审核日期</span><strong>{profile.reviewDate || today}</strong></div></div><div className="report-footnotes"><p>本报告为内部自查辅助，不等同于公安机关、主管部门或其他监管机构的法定合格证明。国际方法补充明确标注为“国际方法补充｜非中国法定义务”，不计入国内合规分。</p><ReviewReasons reasons={current.reviewReasons} /></div><div className="report-stats"><div><span>国内适用项目</span><strong>{current.counted.length}</strong></div><div><span>现行关键缺口</span><strong>{current.criticalGaps.length}</strong></div><div><span>现行待整改</span><strong>{current.remediationOpen.length}</strong></div><div><span>国际补充问题</span><strong>{current.supplementalFindings.length}</strong></div></div><h2>缺口、不适用与整改明细</h2><div className="report-table">{exceptionRows.length === 0 ? <div className="empty">暂无部分符合、不符合或不适用项目</div> : exceptionRows.map(row => <div className="report-row report-row-rich" key={`${row.口径}-${row.条款编号}`}><b>{row.条款编号}</b><span><strong>{row.审核项目}</strong><small>{row.来源类别} · {row.来源标签}</small><small>{row.模块} · {row.口径} · {row.评分属性} · {row.依据}</small><small>证据：{row.证据编号或位置 || '未填写'}{row.不适用理由 ? ` · 不适用理由：${row.不适用理由}` : ''}</small></span><span>{row.结论}<small>{row.整改状态}</small></span><span>{row.整改负责人 || '待指定'}<small>{row.整改期限 || '待定'}</small></span><span>{row.整改措施 || '未填写措施'}</span></div>)}</div><div className="report-foot">依据：DB11/T 2552—2026（第1—9章及附录A—H）、2004版《企业事业单位内部治安保卫条例》；征求意见稿为前瞻参考。审核人：{profile.reviewer || '未填写'}。证据索引、逐来源适用性、整改状态、临时防范、整改措施、复核与关闭信息来自本机审核档案。</div></div></div>;
}

function ProfileModal({ profile, isNewAudit, setProfile, onClose, onReset }: { profile: Profile; isNewAudit: boolean; setProfile: (profile: Profile) => void; onClose: () => void; onReset: () => void }) {
  const [draft, setDraft] = useState(() => prepareAuditProfileDraft(profile, isNewAudit));
  const set = (key: keyof Profile, value: unknown) => setDraft(current => ({ ...current, [key]: value }));
  const requiresQualificationReview = hasSpecialRisk(draft);
  const a04 = { ...defaultA04Profile, ...draft.a04 };
  const setA04 = (key: keyof A04ProfileFacts, value: A04ProfileFacts[keyof A04ProfileFacts]) => setDraft(current => ({ ...current, a04: { ...defaultA04Profile, ...current.a04, [key]: value } }));
  const a04FactFields: [keyof Pick<A04ProfileFacts, 'alarmSystem' | 'videoSystem' | 'accessControlSystem' | 'patrolSystem' | 'parkingSystem' | 'securityCheckSystem' | 'faceRecognition' | 'personalDataProcessing' | 'secretAdjacentUnit' | 'undergroundCrossing' | 'lowAirIntake' | 'guardhouseExteriorDoor' | 'securityDoorInstalled' | 'specialDoorOrStorage' | 'sharedImportantBuilding' | 'controlCenter' | 'networkOperator'>, string][] = [
    ['alarmSystem', '入侵/紧急报警系统'], ['videoSystem', '视频监控系统'], ['accessControlSystem', '门禁/出入口控制系统'], ['patrolSystem', '电子或实体巡查系统'], ['parkingSystem', '停车管理执行装置'], ['securityCheckSystem', '安检/防爆设备'], ['faceRecognition', '实际使用人脸识别算法'], ['personalDataProcessing', '处理个人信息'], ['secretAdjacentUnit', '相邻涉密单位/场所'], ['undergroundCrossing', '地下连通/跨越部位'], ['lowAirIntake', '低于2.5m室外进气口'], ['guardhouseExteriorDoor', '门卫室对外门'], ['securityDoorInstalled', '防盗安全门'], ['specialDoorOrStorage', '特殊门/重要物品库房'], ['sharedImportantBuilding', '共用重要建筑/重要部位'], ['controlCenter', '安防监控中心'], ['networkOperator', '网络运营者/网络日志范围'],
  ];
  const projectScope = a04.gbHighRiskObject === 'yes' ? 'high_risk' : a04.gb55029Applicable === 'yes' ? 'gb_project' : a04.gb55029Applicable === 'no' && a04.gbHighRiskObject === 'no' ? 'none' : 'unknown';
  const setProjectScope = (value: string) => setDraft(current => ({
    ...current,
    a04: { ...defaultA04Profile, ...current.a04, gb55029Applicable: value === 'unknown' ? 'unknown' : value === 'none' ? 'no' : 'yes', gbHighRiskObject: value === 'high_risk' ? 'yes' : value === 'unknown' ? 'unknown' : 'no' },
  }));
  const saveProfile = () => {
    if (!isBusinessDate(draft.reviewDate)) { window.alert('请填写有效的审核日期。'); return; }
    setProfile(normalizeProfileDraft(draft));
    onClose();
  };
  return <div className="modal-backdrop"><div className="modal profile-modal"><div className="modal-head"><div><div className="eyebrow">UNIT PROFILE</div><h2>创建 / 编辑单位画像</h2></div><button className="icon-btn" onClick={onClose}><X size={18} /></button></div><p className="modal-note"><strong>先创建，再逐项审核。</strong> 只填写下列基本信息即可开始；未填写高级筛选不会自动产生“需人工复核”，也不会阻止你进入审核。</p>{requiresQualificationReview && !draft.keyCandidate && <div className="profile-review-hint"><AlertTriangle size={15} /> 已标记专项场景。请在“适用性与单位画像”模块完成重点单位资格排查；当前仍按一般单位模式审核。</div>}<div className="form-grid"><label className="wide">单位名称<input value={draft.name} onChange={event => set('name', event.target.value)} placeholder="例如：某科技有限公司" /></label><label>所属地区<input value={draft.region} onChange={event => set('region', event.target.value)} placeholder="省/市/区" /></label><label>单位类型<select value={draft.unitType} onChange={event => set('unitType', event.target.value)}>{unitTypes.map(unitType => <option key={unitType}>{unitType}</option>)}</select></label><label>所属行业<input value={draft.industry} onChange={event => set('industry', event.target.value)} placeholder="例如：互联网、医疗、教育" /></label><label>审核人<input value={draft.reviewer} onChange={event => set('reviewer', event.target.value)} placeholder="姓名/部门" /></label><label>审核创建日期（默认今天）<input type="date" value={draft.reviewDate} onChange={event => set('reviewDate', event.target.value)} /></label></div><section className="profile-section"><div className="profile-section-head"><div><h3>审核范围</h3><p>仅在已经明确时选择；未选择重点单位不会触发第6章人工复核提示。</p></div></div><div className="check-grid compact-check-grid"><label className="check-item"><input type="checkbox" checked={draft.multiSite} onChange={event => set('multiSite', event.target.checked)} /><span>多地机构、设施或场站</span></label><label className="check-item"><input type="checkbox" checked={draft.keyCandidate} onChange={event => set('keyCandidate', event.target.checked)} /><span>按重点单位模式审核</span></label></div>{draft.keyCandidate && <label className="key-level-field">重点单位审核采用的防范级别<select value={draft.keyProtectionLevel} onChange={event => set('keyProtectionLevel', event.target.value)}><option value="未确定">未确定（保存后提示确认）</option><option value="三级">三级防范（第6.5）</option><option value="二级">二级防范（第6.5 + 6.6）</option><option value="一级">一级防范（第6.5 + 6.6 + 6.7）</option></select></label>}</section><details className="profile-optional"><summary>专项场景（仅符合时填写）</summary><p>这些场景会增加专项审核提示，但不会自动切换重点单位模式。</p><div className="check-grid compact-check-grid">{([['secret', '涉及国家秘密/涉密载体'], ['dangerous', '涉及危险物品/菌种/武器弹药'], ['crowded', '人员密集/大型活动场所'], ['dataStorage', '重要数据存储/重要高科技或互联网业务']] as [keyof Profile, string][]).map(([key, label]) => <label className="check-item" key={key}><input type="checkbox" checked={Boolean(draft[key])} onChange={event => set(key, event.target.checked)} /><span>{label}</span></label>)}</div></details><details className="a04-profile"><summary>高级：精确筛选 A04 原子控制（可选）</summary><p>仅用于在<strong>明确不涉及</strong>时缩小技术/设施控制范围。保持“未核实”即可在后续条款中逐项判断；这不是创建审核的必填项，也不会单独触发人工复核。</p><div className="a04-profile-grid a04-core-grid"><label>工程/高风险项目<select value={projectScope} onChange={event => setProjectScope(event.target.value)}><option value="unknown">未核实（不预先排除）</option><option value="none">不涉及 GB 55029 工程/高风险对象</option><option value="gb_project">一般 GB 55029 安防工程</option><option value="high_risk">GB 55029 高风险保护对象</option></select></label><label>工程/运行阶段<select value={a04.engineeringStage} onChange={event => setA04('engineeringStage', event.target.value as A04ProfileFacts['engineeringStage'])}><option value="unknown">未核实</option><option value="not_applicable">不涉及工程/系统阶段</option><option value="design">设计/改造设计</option><option value="construction">施工/安装</option><option value="commissioning">试运行/验收</option><option value="operation">运行维护</option></select></label><label>公共视频场所类型<select value={a04.publicVideoContext} onChange={event => setA04('publicVideoContext', event.target.value as A04ProfileFacts['publicVideoContext'])}><option value="unknown">未核实（不预先排除）</option><option value="none">不涉及公共视频场所</option><option value="article7">第7条公共场所</option><option value="article9_exception">第9条例外场所</option></select></label></div><details className="a04-fact-details"><summary>更多系统、点位和数据场景（按需精确排除）</summary><p>每项默认“未核实”，不会影响创建。只有确认“明确不涉及”时才会隐藏相应的条件控制。</p><div className="a04-profile-grid">{a04FactFields.map(([key, label]) => <label key={key}>{label}<select value={a04[key] as A04Fact} onChange={event => setA04(key, event.target.value as A04Fact)}><option value="unknown">未核实</option><option value="yes">存在/涉及</option><option value="no">明确不涉及（排除相关控制）</option></select></label>)}</div></details></details><div className="modal-actions"><button className="outline-btn" onClick={() => { onReset(); onClose(); }}>重置审核答案</button><div><button className="outline-btn" onClick={onClose}>取消</button><button className="primary-btn" onClick={saveProfile}>保存画像</button></div></div></div></div>;
}

export default App;
