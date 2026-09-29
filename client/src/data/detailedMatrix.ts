import type { Criterion, KeyProtectionLevel, Profile } from './criteria';
import { facilityMatrixCriteria } from './facilityMatrix';

const current = (clause: string) => ({ kind: 'current' as const, source: 'DB11/T 2552—2026', clause });
const appendix = (clause: string) => ({ kind: 'current' as const, source: 'DB11/T 2552—2026 附录', clause });

const levelOrder: Record<KeyProtectionLevel, number> = { '未确定': 0, '三级': 1, '二级': 2, '一级': 3 };
const isKey = (p: Profile) => p.keyCandidate;
const atLeast = (level: Exclude<KeyProtectionLevel, '未确定'>) => (p: Profile) => isKey(p) && levelOrder[p.keyProtectionLevel] >= levelOrder[level];
const gradeUnknown = (p: Profile) => isKey(p) && p.keyProtectionLevel === '未确定';

/**
 * 对应DB11/T 2552—2026 第5/6章及附录A/D/E/F的逐条审核矩阵。
 * 系统功能、参数、留存期和联动要求留在“系统技术”模块（第8章），此处仅审核防护空间、点位和配置。
 */
const matrixCore: Criterion[] = [
  // 风险评估（第4章/附录A）及第5章、第6章的章节化要求
  { id:'RM-01', module:'risk', title:'风险评估责任、计划与评估组织', prompt:'已明确本单位是风险评估责任主体；已制定评估计划，明确目的、任务、范围、预算和进度；自行、主管部门或受托第三方评估时，均已按附录A配置评估工作组和协调人员。', evidence:'风险评估计划、任务书、评估组名单/委托合同、协调人任命', weight:3, critical:true, basis:[current('4.1.4'), appendix('A.1、A.2.1.1—A.2.1.2')] },
  { id:'RM-02', module:'risk', title:'风险评估基础资料与识别范围', prompt:'评估通过资料查阅、现场对接、访谈等方式收集真实、完整、有效资料；风险识别覆盖被评估对象的全部区域及与风险相关联要素。', evidence:'资料清单、访谈/现场记录、区域边界图、评估底稿', weight:2, basis:[appendix('A.2.1.3、A.2.2.1')] },
  { id:'RM-03', module:'risk', title:'风险识别方法和风险清单', prompt:'已结合资料查阅、现场勘查、专家访谈、问卷、情景分析或历史事件复盘等方法开展识别；如实记录、分类去重、补齐缺项，并形成风险特征、影响范围、危害和风险清单。', evidence:'风险识别记录、方法说明、风险清单、现场照片/访谈纪要', weight:3, critical:true, basis:[appendix('A.2.2.2—A.2.2.3')] },
  { id:'RM-04', module:'risk', title:'风险分析、评价、管控优先级与报告报备', prompt:'已从发生可能性、后果严重程度、可控性三个维度分析每项风险；确定最终风险等级、不可接受风险和管控优先级；评估报告包含对象、依据、方法、过程、结果、结论对策及附件，并履行单位内部报备和年度复查、动态更新。', evidence:'风险分析评价表、风险等级清单、风险评估报告、报备/审批记录、年度复查记录', weight:3, critical:true, basis:[current('4.1.4'), appendix('A.2.3—A.2.6')] },
  { id:'RM-05', module:'general', title:'一般单位重点防护部位和区域识别', prompt:'一般单位已结合风险评估识别需要重点防护的部位和区域；识别范围与第6.2的重要部位和重点区域类型进行比对，并形成清单。', evidence:'重点防护部位/区域清单、平面图、评估结论', weight:2, applies:p=>!isKey(p), basis:[current('5.1.3、6.2')] },
  { id:'RM-06', module:'general', title:'专项场景风险与适用标准识别', prompt:'对人员密集区域、信息/数据中心、枪支弹药库室、危化品仓库、易制爆危化品储存、剧毒化学品/放射源存放等实际存在场景，已确认适用专项标准并形成防护要求。', evidence:'专项场景清单、适用标准清单、专项检查/评估资料', weight:3, critical:true, applies:p=>p.crowded || p.dataStorage || p.dangerous, basis:[current('5.1.4—5.1.10、6.4.1')] },
  { id:'RM-07', module:'key', title:'重点单位重要部位、重点区域和责任部门清单', prompt:'重点单位已按6.2识别涉密、关键决策、信息枢纽、关键生产、危险物品、供给保障、重要设备、财物集中、安保任务等重要部位，以及周界、周界出入口、重要部位所在建（构）筑物、人员密集区域等重点区域；每项均明确责任部门。', evidence:'重要部位/区域清单、责任部门矩阵、总平面图、风险分区图', weight:3, critical:true, applies:isKey, basis:[current('6.2.1、6.2.2、6.4.2')] },
  { id:'RM-08', module:'key', title:'重点单位限制区划分、风险防护设计与纵深防护', prompt:'重点单位已按公众开放情况划分限制区和非限制区；针对具体风险完成防护设计，按周界、缓冲区域、重要部位/区域逐层建立纵深防护体系；非限制区防护参考附录E。', evidence:'限制区/非限制区图、风险防护设计、纵深防护图、附录E对照表', weight:3, critical:true, applies:isKey, basis:[current('6.4.3—6.4.6'), appendix('E')] },
  { id:'RM-09', module:'key', title:'共用、入驻或租借场地风险评估', prompt:'如重点单位使用一般单位场地办公，已在入驻前评估共用重点区域且共用重要部位满足本单位防范级别；如向一般单位租借场地，已对租借风险评估并采取管控措施。无此场景可填“不适用”并说明。', evidence:'共用/租借区域清单、入驻前评估、边界协议、管控措施', weight:2, applies:isKey, basis:[current('6.4.7—6.4.8')] },

  // 重点：6.1、6.3、6.4.1、6.4.12—6.4.15
  { id:'KU-00', module:'key', title:'重点单位资格待判定', prompt:'尚未按重点单位模式审核时，应依据6.1逐项排查是否属于治安保卫重点单位；如已排除，应在本项选择“不适用”并写明排除依据。可通过本模块的“按重点单位待判定模式展开第6章”操作进入完整审核。', evidence:'6.1类别排查表、行业资质/业务范围、主管部门或公安机关告知、排除说明', weight:3, critical:true, applies:p=>!isKey(p), basis:[current('6.1')] },
  { id:'KU-01', module:'key', title:'重点单位类别判定及认定依据', prompt:'已对照6.1逐项判定是否属于党政/社会团体、重要新闻、国防科技、能源水利/城市生命线、金融、教育科研医疗、文博档案、物资储备、通信邮政、大型文体商贸、危险物品/菌毒、重点工程、重要高新技术或其他重点类别，并留存认定/排除依据。', evidence:'行业资质、主管部门/公安告知、业务范围、重点单位认定材料', weight:3, critical:true, applies:isKey, basis:[current('6.1')] },
  { id:'KU-02', module:'key', title:'治安保卫等级与防范级别已确认', prompt:'已确认重点单位适用的治安保卫等级和对应防范级别（三级、二级或一级）；审核画像中的选择仅用于筛选标准要求，不替代公安机关、主管部门或行业主管部门的正式认定。', evidence:'等级认定/告知材料、主管部门要求、内部差距分析', weight:3, critical:true, applies:isKey, basis:[current('6.3.1—6.3.3')] },
  { id:'KU-03', module:'key', title:'防范级别未确定时的人工复核', prompt:'重点单位尚未确认防范级别时，已将等级/级别确认列为待办并启动人工复核；在确认前，不将任何低等级控制结论视为已满足全部重点单位要求。', evidence:'复核任务、咨询/报送记录、临时风险控制措施', weight:3, critical:true, applies:gradeUnknown, basis:[current('6.3.1—6.3.3')] },
  { id:'KU-04', module:'key', title:'重点单位一般要求和监控中心', prompt:'重点单位已落实5.1.1、5.1.2、5.1.4—5.1.10的适用要求；已设置符合GB 50348的安防监控中心（室），并按照附录F核验常态防范设施配置。', evidence:'共用管理协议、专项合规资料、监控中心资料、附录F配置矩阵', weight:3, critical:true, applies:isKey, basis:[current('6.4.1、6.4.14—6.4.15'), appendix('F')] },
  { id:'KU-05', module:'key', title:'值班电话和危险物品遗失处置', prompt:'已向内部公开治安保卫值班电话并确保畅通；如涉及危险物品，已在遗失事件预案中明确处置和记录要求。无危险物品可将后半项标为不适用。', evidence:'公开电话截图/公告、值班测试记录、危险物品遗失预案和处置记录', weight:2, applies:isKey, basis:[current('6.4.12—6.4.13')] },

  // 第5章一般单位与第6章重点单位的访问、值守、巡查要求
  { id:'AC-01', module:'general', title:'共用周界和共用出入口的责任/授权', prompt:'如多个单位共用周界、建（构）筑物或出入口，已明确安全防范空间边界、各方工作责任和牵头单位；出入口各使用单位已明确访问控制负责人及本单位人员、访客出入授权。无共用场景可填“不适用”。', evidence:'共用场地协议、边界图、牵头单位/访问控制负责人任命、授权清单', weight:2, basis:[current('5.1.1—5.1.2')] },
  { id:'AC-02', module:'general', title:'一般单位巡查、访客和车辆出入管理', prompt:'一般单位定期开展治安秩序巡查；按实际需要配置防护装备，并对访客、车辆进行出入管理。', evidence:'巡查计划/记录、访客车辆登记、值班安排、防护装备台账', weight:2, applies:p=>!isKey(p), basis:[current('5.2.1—5.2.3')] },
  { id:'AC-03', module:'key', title:'重点单位访问控制程序与180日记录', prompt:'重点单位已制定重要部位和区域人员、交通工具访问控制程序；针对非授权出入设置防范措施；访客和机动车登记记录保存期限不少于180日。', evidence:'访问控制程序、权限清单、访客/车辆登记样本、留存策略/系统截图', weight:3, critical:true, applies:isKey, basis:[current('6.4.9')] },
  { id:'AC-04', module:'key', title:'重点单位重要物品与禁限带物品控制', prompt:'重点单位已制定重要物品仓储盘点、出入控制程序；已确定禁限带物品和单位管控物资清单，并设置对应防范措施。', evidence:'仓储盘点制度、物品出入记录、禁限带清单、现场标识/检查记录', weight:3, critical:true, applies:isKey, basis:[current('6.4.10')] },
  { id:'AC-05', module:'key', title:'重点单位安全检查活动规范', prompt:'对通行人员、携带物品和交通工具开展安全检查时，检查流程、人员、装备和记录宜符合GA/T 1799的相关要求。无安全检查活动可填“不适用”。', evidence:'安检流程、人员培训、设备台账、抽检记录', weight:2, applies:isKey, basis:[current('6.4.11')] },
  { id:'AC-06', module:'key', title:'三级及以上：专职比例、装备与年度训练', prompt:'治安保卫专职管理人员不少于单位总人数2‰；保卫执勤人员配备必要防护、防卫、救生装备和通信工具；治安保卫人员、保安员每年至少接受1次安全防范培训和1次应急预案演练。', evidence:'人员总数与专职人数测算、装备台账、年度培训和演练记录', weight:3, critical:true, applies:atLeast('三级'), basis:[current('6.5.1.1—6.5.1.3')] },
  { id:'AC-07', module:'key', title:'三级及以上：门卫值守、审核登记与重点区域巡查', prompt:'周界主要出入口有保卫人员值守并审核、登记人员、携带物品和车辆；其他出入口开启时有人值守；重要部位和区域巡查间隔不大于24h、每次不少于2人；高峰路段/人员密集区域配置保卫执勤人员。', evidence:'门岗排班、人员/物品/车辆登记、巡查路线与记录、重点时段加岗记录', weight:3, critical:true, applies:atLeast('三级'), basis:[current('6.5.1.4—6.5.1.6')] },
  { id:'AC-08', module:'key', title:'三级及以上：重要部位值守、监控中心值班和访客陪同', prompt:'重要部位所在建（构）筑物主要/应急出入口开启时宜有人值守并核验、登记、检查；安防监控中心有专人值班并配备装备通信工具；访客进入重要部位时有内部人员陪同。', evidence:'门岗/监控中心排班、装备清单、访客陪同记录', weight:2, applies:atLeast('三级'), basis:[current('6.5.1.7—6.5.1.9')] },
  { id:'AC-09', module:'key', title:'二级及以上：人员比例、半年度训练和12小时巡查', prompt:'专职治安保卫管理人员不少于单位总人数3‰；每半年至少组织1次安全防范教育培训和1次应急预案演练；保卫执勤巡查间隔不大于12h。', evidence:'人员比例测算、半年度培训/演练记录、巡查记录', weight:3, critical:true, applies:atLeast('二级'), basis:[current('6.6.1.1—6.6.1.3')] },
  { id:'AC-10', module:'key', title:'二级及以上：门卫室双人值守和每日电子巡视', prompt:'周界主要出入口设置独立门卫室（传达室），单位运营时段值守不少于2人；安防监控中心（室）值机人员每日利用系统电子巡视，发现异常记录并及时报告。', evidence:'门卫室平面/照片、排班表、电子巡视记录、异常处置记录', weight:3, critical:true, applies:atLeast('二级'), basis:[current('6.6.1.4—6.6.1.5')] },
  { id:'AC-11', module:'key', title:'一级：独立机构、24小时值守和6小时巡查', prompt:'设置独立治安保卫机构；周界主要出入口不少于2名保卫执勤人员24h值守；巡查间隔不大于6h；重要部位楼层宜有人值守；安防监控中心24h在岗值守、每班不少于2人。', evidence:'机构文件、24h排班、岗亭记录、巡查记录、监控中心交接班记录', weight:3, critical:true, applies:atLeast('一级'), basis:[current('6.7.1.1—6.7.1.5')] },

  ];

// 附录D（20行）和附录F（58行）逐行矩阵补充第5章/第6章设施要求。
export const detailedMatrixCriteria: Criterion[] = [...matrixCore, ...facilityMatrixCriteria];

