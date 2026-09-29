export type Status = 'unreviewed' | 'compliant' | 'partial' | 'noncompliant' | 'na';
export type BasisKind = 'current' | 'forward' | 'local';
export type Criterion = {
  id: string; module: string; title: string; prompt: string; evidence: string;
  weight: 1 | 2 | 3; critical?: boolean; applies?: (p: Profile) => boolean;
  basis: { kind: BasisKind; source: string; clause: string; note?: string }[];
};
export type Profile = {
  name: string; region: string; unitType: string; industry: string; multiSite: boolean;
  keyCandidate: boolean; secret: boolean; dangerous: boolean; crowded: boolean; dataStorage: boolean;
  reviewer: string; reviewDate: string;
};

export const modules = [
  { id: 'scope', label: '适用性与单位画像', short: '范围' },
  { id: 'governance', label: '责任制与资源保障', short: '责任' },
  { id: 'people', label: '机构与人员', short: '人员' },
  { id: 'rules', label: '制度与档案', short: '制度' },
  { id: 'risk', label: '风险评估与重点对象', short: '风险' },
  { id: 'general', label: '一般单位常态防范', short: '一般' },
  { id: 'key', label: '重点单位常态防范', short: '重点' },
  { id: 'access', label: '门卫、巡查与出入控制', short: '出入' },
  { id: 'defense', label: '实体与电子防范', short: '防范' },
  { id: 'unusual', label: '非常态防范', short: '非常态' },
  { id: 'systems', label: '系统技术与全生命周期', short: '系统' },
  { id: 'emergency', label: '应急与处置', short: '应急' },
  { id: 'inspection', label: '内部检查与整改闭环', short: '检查' },
  { id: 'appendix', label: '附录依据与设备标准映射', short: '附录' },
];

const current = (clause: string, source = 'DB11/T 2552—2026') => ({ kind: 'current' as const, source, clause });
const old = (clause: string) => ({ kind: 'current' as const, source: '2004版《企业事业单位内部治安保卫条例》', clause });
const forward = (clause: string, note = '征求意见稿内容仅作前瞻性自查参考，不代表现行法定要求。') => ({ kind: 'forward' as const, source: '《单位内部治安保卫条例（修订征求意见稿）》', clause, note });
const appendix = (clause: string) => ({ kind: 'current' as const, source: 'DB11/T 2552—2026 附录', clause });

export const criteria: Criterion[] = [
  { id:'S-01', module:'scope', title:'单位适用范围已确认', prompt:'已确认本单位属于北京市行政区域内机关、团体、企业、事业单位，或已决定参照执行。', evidence:'单位基本情况、注册/办学/办医资料、适用性判断记录', weight:1, basis:[current('1 范围'), old('第1条'), forward('第1条')] },
  { id:'S-02', module:'scope', title:'重点单位候选特征已排查', prompt:'已排查国家安全、公共安全、国计民生、危险物品、重要数据、人员密集等重点单位特征，并留存判断依据。', evidence:'行业属性清单、公安/主管部门告知、重点单位认定材料', weight:3, critical:true, basis:[current('6.1 重点单位类别'), old('第13条'), forward('第23—24条')] },
  { id:'S-03', module:'scope', title:'多地机构和场站已纳入范围', prompt:'如在多地设有机构、设施、场站，已逐地纳入内部治安保卫责任与监督范围。', evidence:'分支机构/场站清单、逐地责任矩阵', weight:2, applies:p=>p.multiSite, basis:[forward('第6条'), current('4.1.2')] },
  { id:'G-01', module:'governance', title:'单位主要负责人承担第一责任', prompt:'已明确主要负责人是内部治安保卫工作第一责任人，其他责任人员对职责范围负责。', evidence:'责任制文件、任命文件、年度责任书', weight:3, critical:true, basis:[current('4.1.2、4.2.5'), old('第5条'), forward('第6条')] },
  { id:'G-02', module:'governance', title:'治安保卫纳入工作计划并有资源保障', prompt:'治安保卫已纳入年度/总体工作计划，并有经费、场地、装备和人员等必要条件。', evidence:'年度计划、预算、采购及资源配置记录', weight:2, basis:[current('4.1.5、4.5.1'), forward('第7条')] },
  { id:'G-03', module:'governance', title:'风险评估预警闭环已建立', prompt:'已定期开展安全防范风险评估，依据结果改进措施；无法达到要求时有主动报告机制。', evidence:'风险评估报告、预警记录、改进清单、报告记录', weight:3, critical:true, basis:[current('4.1.4、附录A')] },
  { id:'G-04', module:'governance', title:'网络、数据和个人信息保护责任已衔接', prompt:'治安保卫工作涉及的视频、登记、门禁等信息已落实网络安全、数据安全和个人信息保护责任。', evidence:'制度、权限清单、保留期限、访问审计记录', weight:3, critical:true, basis:[current('4.1.8'), forward('第11、20条')] },
  { id:'P-01', module:'people', title:'机构或专兼职治安保卫人员配置到位', prompt:'已根据工作需要设置治安保卫机构或配备专职/兼职治安保卫人员；重点单位已配置机构和专职人员。', evidence:'机构设置、岗位编制、人员名册、值守安排', weight:3, critical:true, applies:p=>true, basis:[current('4.2.2'), old('第6条'), forward('第13条')] },
  { id:'P-02', module:'people', title:'重点单位机构人员备案', prompt:'重点单位已按要求将机构、人员设置、配备及变更情况向主管公安机关/行业主管部门备案。', evidence:'备案回执、变更报备材料', weight:2, applies:p=>p.keyCandidate, basis:[old('第6条'), forward('第13条')] },
  { id:'P-03', module:'people', title:'保卫人员培训考核与年度全员培训', prompt:'保卫人员接受法律、业务、技能和专业知识培训考核；内部人员每年接受不少于1次安全防范教育培训。', evidence:'培训计划、签到、考试/考核记录、证书', weight:2, basis:[current('4.2.1、4.2.3、4.2.4'), old('第9条'), forward('第14、16条')] },
  { id:'P-04', module:'people', title:'重点单位重要岗位识别与背景核验', prompt:'重点单位已基于风险评估建立重要岗位人员清单，开展上岗前背景/资质核验，人员变动时调整或取消权限。', evidence:'岗位清单、核验记录、权限变更记录', weight:3, critical:true, applies:p=>p.keyCandidate, basis:[current('4.2.8—4.2.9'), forward('第26条')] },
  { id:'P-05', module:'people', title:'保卫人员依法、规范、文明履职', prompt:'已建立禁止非法限制人身自由、搜查、扣押、滥用/泄露视频和个人信息等行为的约束与问责机制。', evidence:'行为规范、培训记录、投诉处置和问责记录', weight:3, critical:true, basis:[old('第10—11条'), forward('第17—20条')] },
  { id:'P-06', module:'people', title:'岗位装备与职业保障', prompt:'已按风险配置防护、防卫、救生、通讯器材；重点岗位人员的保险和职业技能要求已评估落实。', evidence:'装备台账、领用记录、保险凭证、职业技能证书', weight:2, applies:p=>p.keyCandidate, basis:[current('4.2.3'), forward('第16、19、21条')] },
  { id:'R-01', module:'rules', title:'内部治安保卫制度体系完整', prompt:'制度覆盖门卫值班巡查、场所安全、重要物品、消防交通、培训、案件报告、检查考核奖惩和危险物品等事项。', evidence:'制度目录、有效版本、审批记录', weight:3, critical:true, basis:[current('4.3.1—4.3.2、附录C'), old('第8条'), forward('第9条')] },
  { id:'R-02', module:'rules', title:'新兴场景和设施运维制度已补齐', prompt:'制度已覆盖防范设施管理维护、营业/医疗/试验场所、涉密载体、重要活动和管控区域等内容。', evidence:'专项制度、作业规程、场景清单', weight:2, basis:[forward('第9条')] },
  { id:'R-03', module:'rules', title:'治安保卫工作档案可追溯', prompt:'已建立工作档案；重点单位档案包含基本情况、责任制、制度、岗位/部位清单、风险评估、工程报告、培训、演练和案事件记录。', evidence:'档案目录、抽查记录、电子归档', weight:2, applies:p=>p.keyCandidate, basis:[current('4.3.3—4.3.4、附录B/C')] },
  { id:'K-01', module:'risk', title:'重要部位、区域和周界已识别', prompt:'已识别限制区、非限制区、周界、重要部位、危险物品及人员密集场所，并形成清单与地图。', evidence:'区域/部位清单、平面图、风险分区资料', weight:3, critical:true, basis:[current('3、6.2'), old('第14条'), forward('第25条')] },
  { id:'K-02', module:'risk', title:'重要部位实施重点保护', prompt:'重点单位已根据风险和国家标准对重要部位配置必要的技术防范设施并实施重点保护。', evidence:'防护配置表、验收资料、巡检记录', weight:3, critical:true, applies:p=>p.keyCandidate, basis:[current('6.2—6.3、附录F'), old('第14条'), forward('第25条')] },
  { id:'K-03', module:'risk', title:'重点单位防范级别已判定', prompt:'重点单位已完成治安保卫等级和防范级别判定，并按一级/二级/三级要求组织防范。', evidence:'等级判定、公安/主管部门告知、差距评估', weight:3, applies:p=>p.keyCandidate, basis:[current('6.3、6.4—6.6')] },
  { id:'A-01', module:'general', title:'一般单位人力防范到位', prompt:'一般单位已安排门卫、值班、巡查、检查和隐患处置等必要人力防范。', evidence:'值班表、巡查计划、记录和隐患闭环', weight:2, applies:p=>!p.keyCandidate, basis:[current('5.2')] },
  { id:'A-02', module:'general', title:'一般单位实体防范和设施配置适配', prompt:'一般单位已按风险和附录D配置周界、门窗、锁具、重要部位屏障等实体防范设施。', evidence:'设施配置表、现场检查、维护记录', weight:2, applies:p=>!p.keyCandidate, basis:[current('5.3、附录D')] },
  { id:'A-03', module:'general', title:'一般单位电子防范适配', prompt:'一般单位已按需要配置入侵报警、视频监控、出入口控制或其他电子防范手段，并保持可用。', evidence:'系统清单、测试记录、故障维修记录', weight:2, applies:p=>!p.keyCandidate, basis:[current('5.4、8.1—8.7')] },
  { id:'A-04', module:'general', title:'防范设施运行维护有记录', prompt:'设施和系统有日常检查、故障报修、维护、备件和停用补偿措施。', evidence:'运维合同、工单、巡检表、故障复盘', weight:2, basis:[current('5.3—5.4、8.1')] },
  { id:'X-01', module:'access', title:'门卫、值班、巡查和检查制度落实', prompt:'门卫值班、巡逻检查按制度执行，记录完整并能追溯到人员、时间、区域和问题。', evidence:'值班表、交接班、巡查记录、检查记录', weight:2, basis:[current('5.2、9、附录H'), old('第8、11条'), forward('第9、17—18条')] },
  { id:'X-02', module:'access', title:'人员、物品、车辆出入控制有效', prompt:'已按需要检查有效证件，登记人员、物品和车辆，执行限制区授权和权限撤销。', evidence:'登记台账、门禁权限、访客记录、抽查记录', weight:3, critical:true, basis:[current('3、6.2'), old('第11条'), forward('第18条')] },
  { id:'X-03', module:'access', title:'隐患排查和整改记录闭环', prompt:'巡查检查发现的问题有责任人、措施、期限、复查结果和关闭记录。', evidence:'隐患台账、整改通知、复查记录', weight:3, critical:true, basis:[current('9、附录H'), old('第7、11条'), forward('第31、34—36条')] },
  { id:'D-01', module:'defense', title:'实体防范措施有效', prompt:'建筑物、屏障、门窗、锁具、围界等实体防范能够延迟或阻止风险事件，并按周期维护。', evidence:'现场照片索引、设施台账、维护和测试记录', weight:2, basis:[current('3、5.3、6.4—6.6')] },
  { id:'D-02', module:'defense', title:'视频监控和报警系统可用', prompt:'视频监控、入侵和紧急报警系统覆盖需要保护的区域，功能、联动、存储和故障告警有效。', evidence:'点位图、测试报告、存储策略、故障记录', weight:3, critical:true, basis:[current('8.2—8.3、附录G')] },
  { id:'D-03', module:'defense', title:'视频和登记信息安全使用', prompt:'视频图像、人员车辆登记和门禁数据有访问授权、留存、调取、复制和删除控制，不得删改、隐匿、滥用或泄露。', evidence:'权限矩阵、日志、调取审批、隐私告知', weight:3, critical:true, basis:[current('4.1.8、8.1'), forward('第20条')] },
  { id:'U-01', module:'unusual', title:'非常态防范启动、实施和解除机制', prompt:'重大会议、活动、节假日、预警或案事件发生时，能够按授权流程启动、升级和解除非常态防范。', evidence:'启动令、值班升级表、解除记录、复盘报告', weight:3, critical:true, basis:[current('4.1.7、7.1')] },
  { id:'U-02', module:'unusual', title:'非常态期间人力、实体、电子措施加强', prompt:'非常态状态下已增加巡逻值守、重点部位保护、出入口管控、设备值机或其他临时措施。', evidence:'专项方案、加岗表、设备加固/测试记录', weight:3, critical:true, basis:[current('7.2—7.4'), forward('第10条')] },
  { id:'T-01', module:'systems', title:'安全防范系统纳入总体规划并同步建设', prompt:'新建、改建、扩建项目已将安全防范工程纳入总体规划，并按要求同步建设、验收、运行。', evidence:'规划、设计、验收、移交资料', weight:3, critical:true, basis:[current('4.5.1、8.1')] },
  { id:'T-02', module:'systems', title:'系统技术要求逐项满足', prompt:'入侵报警、视频监控、出入口控制、电子巡查、停车库（场）和安全防范管理平台按第8章要求建设、联动和维护。', evidence:'系统架构、技术参数、检测/验收报告、联动测试', weight:3, critical:true, basis:[current('8.1—8.7、附录G')] },
  { id:'T-03', module:'systems', title:'重点单位效能评估与网络安全保护', prompt:'重点单位已开展安全防范系统效能评估，明确网络安全保护等级并采取相应防护措施。', evidence:'效能评估报告、等保定级/测评、整改报告', weight:3, critical:true, applies:p=>p.keyCandidate, basis:[current('4.5.3—4.5.4')] },
  { id:'T-04', module:'systems', title:'系统运行维护符合要求', prompt:'竣工移交后已持续开展安全防范系统运行与维护，并符合 DB11/T 855 等要求。', evidence:'运维制度、SLA、巡检工单、年度维护报告', weight:2, basis:[current('4.5.2、8.1')] },
  { id:'E-01', module:'emergency', title:'应急组织和预案要素完整', prompt:'已明确突发案事件应急组织、人员分工、处置流程、装备使用、目标保护、避险和疏散方案。', evidence:'应急预案、组织架构、通讯录、资源清单', weight:3, critical:true, basis:[current('4.4.1—4.4.2'), old('第15条'), forward('第27条')] },
  { id:'E-02', module:'emergency', title:'最小应急单元和先期处置能力', prompt:'重点单位已建立由固定人员和标准装备构成的最小应急单元，并能第一时间到达现场先期处置。', evidence:'单元编组、装备清单、拉动测试、演练记录', weight:3, critical:true, applies:p=>p.keyCandidate, basis:[current('4.1.9、4.4.4')] },
  { id:'E-03', module:'emergency', title:'演练、报警、现场保护与改进', prompt:'每年开展不少于1次应急演练；发生事件时能先期处置、疏散避险、报警、保护现场并形成复盘改进。', evidence:'演练计划、记录、问题清单、事件报告', weight:3, critical:true, basis:[current('4.4.3—4.4.4'), old('第15条'), forward('第17、27条')] },
  { id:'I-01', module:'inspection', title:'内部检查计划与责任明确', prompt:'已制定年度/专项内部检查计划，明确检查组织、人员、频次、对象和记录要求。', evidence:'检查计划、检查表、授权文件', weight:2, basis:[current('9、附录H')] },
  { id:'I-02', module:'inspection', title:'检查覆盖管理、人员、重点部位、设施和系统', prompt:'检查覆盖责任制、制度、机构人员、重要部位、应急、设施建设使用维护、系统运行和培训考核等内容。', evidence:'检查报告、抽查样本、问题统计', weight:3, critical:true, basis:[current('9、附录H'), forward('第31—32条')] },
  { id:'I-03', module:'inspection', title:'整改通知、复查和持续改进', prompt:'检查发现的问题已分级、定责、限期整改，整改后复查验证并归档，重大问题有临时防范措施和升级报告。', evidence:'整改台账、复查记录、延期申请、闭环报告', weight:3, critical:true, basis:[current('4.1.4、9'), forward('第34—37条')] },
  { id:'H-01', module:'appendix', title:'风险评估程序与职责清单已落地', prompt:'已按附录A开展风险评估，并按附录B落实单位内部治安保卫管理工作职责。', evidence:'风险评估工作底稿、职责矩阵、会议纪要', weight:2, basis:[appendix('A、B')] },
  { id:'H-02', module:'appendix', title:'制度、设施配置与检查表已映射', prompt:'附录C制度内容、附录D/F设施配置、附录E非限制区防护和附录H检查内容已映射到本单位控制清单。', evidence:'控制矩阵、设施配置表、检查表版本', weight:2, basis:[appendix('C、D、E、F、H')] },
  { id:'H-03', module:'appendix', title:'设备采用现行标准并留存检测资料', prompt:'安全防范设备采用附录G所列现行标准或适用的更高标准，并留存检测、验收、维护资料。', evidence:'设备型号标准、检测报告、验收资料、变更记录', weight:2, basis:[appendix('G')] },
];

export const basisLabel = (kind: BasisKind) => kind === 'forward' ? '前瞻参考' : kind === 'local' ? '地方要求' : '现行基线';
