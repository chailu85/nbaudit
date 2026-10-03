# A04 可执行控制规范（实施与验收稿）

日期：2026-10-03。针对原审计A04的P1缺口，形成 **118项控制设计**，供业务核准、Manus实施和测试验收。**中国国内法律、法规、标准为主线；国外方法仅作带特殊标注的核验补充，不计国内合规分。项目源码尚未实现这些变化**。功能基线为9d824806206d082f171edae699aad3c138828f36；本地审计包无Git，不能独立证明与该提交逐字一致，沿用原审计的限制。

关联：[原审计A04](E:/Documents/neibaoaudit-codex-audit-bundle/AUDIT_REPORT.md:112)、[原始映射表](E:/Documents/neibaoaudit-codex-audit-bundle/REQUIREMENTS_TRACEABILITY.md)、[结构化控制清单](E:/Documents/neibaoaudit-codex-audit-bundle/A04_CONTROL_CATALOG.json)。JSON是新需求目录，**不能直接导入现有v1审核档案**。自然语言适用条件须转为经过测试的筛选逻辑。

## 1. 七个主题的实施结论

| 主题 | 实施要求 | 已核实的关键边界 |
|---|---|---|
| 屏障 | 高度、连续性、攀爬借助物、穿越点、材质固定/防护能力独立核验 | 重点三级/二级≥2m、一级≥2.5m，含防攀爬设施；外侧与两侧不同。一般单位不统一套重点高度。 |
| 防盗门 | 按部位/每樘门核等级、产品实装一致、闭锁和疏散 | 二级/一级门卫室对外门≥3级；1低5高；旧甲级不自动换算。防盗等级不能代防火性能。 |
| 一级 | 独立组织、值守、周期、屏障、平台、身份及各点位新增要求 | 继承二级三级，正文与附录F共同核验；表F23建筑周边入侵探测单列。应/宜保留。 |
| 档案 | 按类型核真实性、签名、可取回、保存与删除/留置 | 报警/巡查90d，门禁/重点访客机动车180d，视频30d；网络日志六个月，影响评估资料三年，各有范围。 |
| 视频/个人信息 | 场所分类、提示、目的依据、告知、同意、涉密邻接单位同意、权限、委托及人脸独立 | 同意不是全部处理的唯一依据；单位授权不能代个人同意；799号令第9条有明确例外。 |
| 频率 | 年/半年、24/12/6h、每日、季度、15d、维护间隔与合同SLA分别审核 | DB855日常维护≤三个月；不能把全部“定期”改成法定月度/季度。 |
| 外部标准 | 版本、主体/阶段、具体条款、子控制、证据及未覆盖细则分别管理 | GB55029全部条文强制，具体条件分别适用；核题录不等于完整实施控制。 |

### 1.1 强度、口径与版本冲突

- 法律义务先确认主体、场所、活动及例外，不从某类公共场所推到所有摄像头。
- GB55029全部条文强制，按工程建设、运行阶段与条款条件展开。公告明确与其不一致的其他工程建设标准有关规定以本规范为准；废止的是指定旧强制条文，不是GB50348整本作废。[公告及原文](https://cgj.dazhou.gov.cn/uploadfile/1/Attachment/4b3cea19d3.pdf)
- DB2552和DB855为推荐性地方标准。保留“标准应满足项”和“建议改进”；是否因法律引用、行业要求、合同或采用而约束具体单位，需业务/法律专家复核，不能统一标现行法定义务。[DB2552状态](https://std.samr.gov.cn/db/search/stdDBDetailed?id=5A032B884C1C403EE06397BE0A0A9B90)、[DB855状态](https://std.samr.gov.cn/db/search/stdDBDetailed?id=39559AE48D01AF23E06397BE0A0A31A2)
- ASIS PSP用于风险、功能、性能、实施及生命周期方法，不产生中国法定义务。采用官方公开2022版知识纲要，不声称其规定通用围栏尺寸或检查频率。[官方纲要](https://www.asisonline.org/globalassets/certification/documents/physical-security-professional----bok.pdf)
- 注日期引用保留指定版，如GB17565—2022、GA/T1127—2025；不注日期按DB第2章跟踪最新有效版及修改单，核准后更新控制版本。遇强制标准转换，结合公告、实施日期与工程状态判断，不能简单自动采用“更新/更严”覆盖所有旧规则。
- 安防、隐私、消防、水利等适用要求同时满足。内部批准/风险接受不能豁免强制要求；冲突标待专业核准并落实临时保护。GB55029 1.0.4的创新技术论证不等于普通审核员可直接NA。

### 1.2 五种画像

| 画像 | 要求展示与最低范围 | 结论限制 |
|---|---|---|
| 非重点 | 第5章general；第6章资格项KU-00始终保留；独立法律/工程条件仍判定 | 自选非重点不等于资格排除证明，不得出现key为0项 |
| 已认定重点、未定级 | key展示第6章共同要求及三级最低，保留等级待定任务 | 不得隐藏三级底线后给完整核查结论；更高等级范围待定 |
| 三级 | 第6章共同/三级应宜；技术隐私按实际条件 | 不套二级门等级、一级2.5m等 |
| 二级 | 继承三级并增二级；巡查≤12h，指定门≥3级 | 一级新增不倒灌二级 |
| 一级 | 继承二/三级并查全部一级；巡查≤6h、屏障≥2.5m、平台等 | 低等级全符合不覆盖一级缺失，宜仍为建议 |

DB6.3.3明确三级是重点最低、二级在三级基础上、一级在二级基础上。GB“高风险保护对象”、DB“重点单位”、公共视频第7/9条、人脸处理、涉密相邻关系分别建字段，不能合并成一个标签。[DB原件](E:/Documents/neibaoaudit-codex-audit-bundle/reference/DB11T2552-2026鍗曚綅鍐呴儴瀹夊叏闃茶寖閫氱敤瑕佹眰.pdf)

第5章全部general，第6章全部key；其他章节进入既有对应模块，不引入独立access/defense。重点通过6.4.1承接5.1.5等并关联展示，避免重复计分。GD-01—20、KF-01—58保留ID及原表序号；新增控制用legacyLinks连接，不冒称附录新增行。

## 2. 取证、判定和整改

**证据**：记录对象/点位编号、证据编号或受控保管位置、日期、提供/核验人、方法、实测值、范围和版本。配置结合实际检索/回放/运行验证。原视频、人脸模板、身份证、真实密码、涉密图纸不复制进工具；localStorage仅存脱敏摘要与证据索引，真实档案由单位受控保管。

**结论**：有多子断言的控制组分别存结论、证据和整改，全部适用子断言通过才符合。必需设备未设为缺口，不能NA；无资料/范围未知/等级不明标未审核或待核验。合法NA有事实、依据、证据及复核。部分符合用于已证实的部分满足，不代替未核验。

**数值**：显式单位；拒绝负值、NaN/Infinity和错误单位，比较前不舍入。高度地面基准、坡度、测法与仪器不确定性记录；临界值无法确认待复测，不造法定误差。

**保存**：核策略容量及实际取回。新系统历史不足时证明投用以来完整性和目标容量，显示“历史长度尚未成熟”，不伪造投用前记录。自然日、日历月、季度、半年、年与工作日分开计算。正在进行的期间与完成期间分开，不能在季度未结束时因尚无本季度检查立即判逾期。

**整改**：具体对象/缺口、责任、期限及来源、措施、临时保护、进度、复核证据和关闭时间齐备。整改期限按法定明确时限或批准计划；不臆造统一7/15/30日。采购计划不是验收，关闭整改不自动改原答案。

**评分**：DB现行基线、国内补充现行义务、方法成熟度、前瞻参考分开。ASIS/内部新增指标与征求意见稿不改现行基线。硬性缺口与百分比并列，风险与关键项策略业务核准，不把宜硬编码为高风险关键项。权重/分母版本化并说明拆分变化；父总览与子项不双计；重复点位不扩分母稀释缺口，资产级问题仍可见。

## 3. 控制清单

下表为可读目录。每条的责任、整改步骤、复核验收、测试条件、结构化数值和旧项关联详见JSON。包含多断言的行必须展开子结果，不能仍用一个“有/无”掩盖。

### 3.1 实体屏障及结构

| 控制ID／题目 | 适用与验收 | 最低证据／责任 | 原始依据 |
|---|---|---|---|
| A04-BAR-01 一般单位周界屏障采用情况 | 非重点单位；实际存在周界。5.3.1及D1为宜；记录风险评估、采用或替代决定，不统一强制2m/2.5m。 | 边界图、风险与采用决定<br>保卫部门 | [DB2552 5.3.1、D表序号1](E:/Documents/neibaoaudit-codex-audit-bundle/reference/DB11T2552-2026鍗曚綅鍐呴儴瀹夊叏闃茶寖閫氱敤瑕佹眰.pdf)（PDF9/印刷5）：标准宜 |
| A04-BAR-02 重点屏障最小有效高度 | 已确认重点；未定级按三级最低；所有周界段。三级/二级≥2m，一级≥2.5m，含防攀爬设施；取全线最低值，不用平均或比较前舍入。 | 逐段实测、点位/照片、日期和测量人<br>设施/保卫部门 | [DB2552 6.5.2.1](E:/Documents/neibaoaudit-codex-audit-bundle/reference/DB11T2552-2026鍗曚綅鍐呴儴瀹夊叏闃茶寖閫氱敤瑕佹眰.pdf)（PDF12/印刷8）：标准应<br>[DB2552 6.7.2.1](E:/Documents/neibaoaudit-codex-audit-bundle/reference/DB11T2552-2026鍗曚綅鍐呴儴瀹夊叏闃茶寖閫氱敤瑕佹眰.pdf)（PDF15/印刷11）：标准应 |
| A04-BAR-03 重点周界连续性 | 重点单位全部周界、出入口连接处。逐段无未防护断点；开口、门、连接与穿越点有保护。不从本条臆造统一网孔/缝隙尺寸。 | 完整段清单、踏勘、开口及验收<br>设施部门 | [DB2552 6.5.2.1](E:/Documents/neibaoaudit-codex-audit-bundle/reference/DB11T2552-2026鍗曚綅鍐呴儴瀹夊叏闃茶寖閫氱敤瑕佹眰.pdf)（PDF12/印刷8）：标准应 |
| A04-BAR-04 攀爬可借助物排查 | 三级/二级查外侧；一级查两侧。对应侧无可供攀爬物/设施，核查树木、堆物、临建设备；安全清距按批准风险设计，不造统一米数。 | 位置/双侧照片、清理或迁移记录<br>后勤/保卫部门 | [DB2552 6.5.2.1、6.7.2.1](E:/Documents/neibaoaudit-codex-audit-bundle/reference/DB11T2552-2026鍗曚綅鍐呴儴瀹夊叏闃茶寖閫氱敤瑕佹眰.pdf)（PDF12、15/印刷8、11）：标准应 |
| A04-BAR-05 河道涵洞地下穿越点防护 | 重点单位存在周界地下穿越点。逐点设置封堵等防护；兼顾批准的排水、检修、应急需求；未调查不能NA。 | 穿越点清单、设计、现场验收<br>设施部门 | [DB2552 6.5.2.3、F序号7](E:/Documents/neibaoaudit-codex-audit-bundle/reference/DB11T2552-2026鍗曚綅鍐呴儴瀹夊叏闃茶寖閫氱敤瑕佹眰.pdf)（PDF13、24/印刷9、20）：标准应 |
| A04-BAR-06 材质结构固定及抗风险能力 | 适用GB55029；设置或要求实体屏障。按风险核准材质、结构、固定和防护能力；车辆屏障依车型重量速度等设计验证；不设万能钢板厚度/抗冲撞等级。 | 风险及设计、材料证明、安装验收及状态<br>设计/设施部门 | [GB55029 3.1.3(1)、3.4.2、3.4.3(1)(4)](E:/Documents/neibaoaudit-codex-audit-bundle/.audit-work/a04-sources/gb55029-notice-government.pdf)（PDF8/印刷3）：国家强制 |
| A04-BAR-07 高风险建筑可进入孔洞防护 | GB高风险保护对象；孔洞可容纳防范对象进入。洞口、管沟管廊、吊顶、风管槽盒管道等逐项封闭或阻挡；高风险认定独立于DB重点标签。 | 穿透点清单、尺寸、设计/隐蔽验收<br>设施部门 | [GB55029 3.4.4(3)](E:/Documents/neibaoaudit-codex-audit-bundle/.audit-work/a04-sources/gb55029-notice-government.pdf)（PDF12/印刷7）：国家强制 |
| A04-BAR-08 锐利防护设施警示 | GB55029适用；触碰易伤害的锐利设施。安装区域有警示；不把刀刺作为所有单位必选，设计兼顾公众及应急。 | 设施与警示照片、安全检查<br>设施部门 | [GB55029 3.4.6](E:/Documents/neibaoaudit-codex-audit-bundle/.audit-work/a04-sources/gb55029-notice-government.pdf)（PDF13/印刷8）：国家强制 |
| A04-BAR-09 低位室外空气进气口隔离 | 二级/一级重要建筑进气口低于2.5m。每个高度<2.5m的室外进气口设置隔离；此处2.5m是触发高度，不是围栏合格高度。 | 进气口清单、高度、隔离验收<br>设施 | [DB2552 6.6.2.3、F序号25](E:/Documents/neibaoaudit-codex-audit-bundle/reference/DB11T2552-2026鍗曚綅鍐呴儴瀹夊叏闃茶寖閫氱敤瑕佹眰.pdf)（PDF14、24/印刷10、20）：标准应 |

### 3.2 防盗门与疏散

| 控制ID／题目 | 适用与验收 | 最低证据／责任 | 原始依据 |
|---|---|---|---|
| A04-DOOR-01 门卫室对外门防盗等级 | 二级/一级门卫室、传达室每樘与外界相通门。按GB17565—2022等级≥3；3/4/5满足等级条件，1/2不满足；旧甲级、普通钢门名称不能自动代替。 | 点位、铭牌型号等级、整门对应检测、安装一致性<br>设施/采购部门 | [DB2552 6.6.2.2、F序号19](E:/Documents/neibaoaudit-codex-audit-bundle/reference/DB11T2552-2026鍗曚綅鍐呴儴瀹夊叏闃茶寖閫氱敤瑕佹眰.pdf)（PDF14、24/印刷10、20）：标准应<br>[DOORGRADES 等级说明](https://scjgj.beijing.gov.cn/zwxx/gs/202512/t20251231_4381843.html)：官方说明（非条文本身） |
| A04-DOOR-02 成套门安装与闭锁有效 | 工程采用防盗门；适用GB/采用DB855。门框门扇、锁、铰链及固定闭锁与批准设计/成套产品证明一致；改装重新核验，锁具证书不能证明整门等级。 | 成套报告、实装验收、改装/维护及实测<br>设施部门 | [GB55029 2.0.3、3.4.5、4.0.2](E:/Documents/neibaoaudit-codex-audit-bundle/.audit-work/a04-sources/gb55029-notice-government.pdf)（PDF7、12、16/印刷2、7、11）：国家强制<br>[DB855 6.14、C表C.1门类](E:/Documents/neibaoaudit-codex-audit-bundle/.audit-work/a04-sources/db855-official.pdf)（PDF12/印刷9）：标准应 |
| A04-DOOR-03 其他部位门风险定级 | 重要部位、其他出入口或特殊库室。逐门明确防盗/防弹/防爆等需求及行业或设计依据；不把门卫≥3级扩展所有门，不以门卫等级替代特殊库室标准。 | 门资产清单、风险、行业适用与设计<br>设计/保卫部门 | [GB55029 3.4.4(4)、3.4.5](E:/Documents/neibaoaudit-codex-audit-bundle/.audit-work/a04-sources/gb55029-notice-government.pdf)（PDF12/印刷7）：国家强制 |
| A04-DOOR-04 紧急疏散无需凭证 | 疏散通道门禁控制点。紧急情况下无需刷卡、刷脸、密码即可通行，按批准疏散/消防方案实测；防盗等级不等于防火性能。 | 疏散图、联动方案、紧急释放测试<br>消防/设施部门 | [GB55029 3.1.6、3.5.3(2)](E:/Documents/neibaoaudit-codex-audit-bundle/.audit-work/a04-sources/gb55029-notice-government.pdf)（PDF9、14/印刷4、9）：国家强制<br>[DB2552 8.4.2](E:/Documents/neibaoaudit-codex-audit-bundle/reference/DB11T2552-2026鍗曚綅鍐呴儴瀹夊叏闃茶寖閫氱敤瑕佹眰.pdf)（PDF16/印刷12）：标准应 |

### 3.3 一级专属控制

| 控制ID／题目 | 适用与验收 | 最低证据／责任 | 原始依据 |
|---|---|---|---|
| A04-L1-01 独立保卫机构 | 一级重点单位。独立机构有正式设置、职责人员及报告关系；继承二级专职管理人员3‰。 | 组织决定、职责及配置<br>单位负责人/人事 | [DB2552 6.7.1.1](E:/Documents/neibaoaudit-codex-audit-bundle/reference/DB11T2552-2026鍗曚綅鍐呴儴瀹夊叏闃茶寖閫氱敤瑕佹眰.pdf)（PDF14/印刷10）：标准应 |
| A04-L1-02 主出入口双人24h值守 | 一级每个周界主要出入口。每个出入口全天各时段至少2名保卫执勤人员实际在岗，缺岗有替补。 | 各门班表、签到交接与抽查<br>保卫部门 | [DB2552 6.7.1.2](E:/Documents/neibaoaudit-codex-audit-bundle/reference/DB11T2552-2026鍗曚綅鍐呴儴瀹夊叏闃茶寖閫氱敤瑕佹眰.pdf)（PDF14/印刷10）：标准应 |
| A04-L1-03 重要楼层人员值守建议 | 一级重要部位所在楼层。逐楼层核准采用；为宜，未采用列建议，不擅自变为法定强制。 | 楼层风险、采用及安排<br>保卫部门 | [DB2552 6.7.1.4](E:/Documents/neibaoaudit-codex-audit-bundle/reference/DB11T2552-2026鍗曚綅鍐呴儴瀹夊叏闃茶寖閫氱敤瑕佹眰.pdf)（PDF14/印刷10）：标准宜 |
| A04-L1-04 监控中心双人24h每班值守 | 一级安防监控中心/室。24h每班至少2名值机人员在岗；轮换休息不使在岗人数不足。 | 班表、签到交接、缺岗记录<br>监控运行部门 | [DB2552 6.7.1.5](E:/Documents/neibaoaudit-codex-audit-bundle/reference/DB11T2552-2026鍗曚綅鍐呴儴瀹夊叏闃茶寖閫氱敤瑕佹眰.pdf)（PDF14/印刷10）：标准应 |
| A04-L1-05 误侵入点广播建议 | 一级存在易误侵入周界位置。按点位核准广播警示采用及效果，为宜。 | 点位、采用决定与可听性测试<br>设施/保卫部门 | [DB2552 6.7.2.2、F序号3](E:/Documents/neibaoaudit-codex-audit-bundle/reference/DB11T2552-2026鍗曚綅鍐呴儴瀹夊叏闃茶寖閫氱敤瑕佹眰.pdf)（PDF15、24/印刷11、20）：标准宜 |
| A04-L1-06 重要建筑周边屏障建议 | 一级重要部位所在建筑。单查建筑周边屏障风险及采用，为宜；周界围栏不能冒充此建筑措施。 | 建筑位置、采用与验收<br>设施部门 | [DB2552 6.7.2.3、F序号22](E:/Documents/neibaoaudit-codex-audit-bundle/reference/DB11T2552-2026鍗曚綅鍐呴儴瀹夊叏闃茶寖閫氱敤瑕佹眰.pdf)（PDF15、24/印刷11、20）：标准宜 |
| A04-L1-07 重要摄像机IV级数据安全建议 | 一级重要部位区域摄像机。按GA/T1127—2025对应IV级核验，宜；不是等保四级。全文/项目未核准时待专家，不造细则。<br>**外部标准全文及III/IV含义需业务/法律专家复核。** | 对应型号固件及IV检测项目<br>信息安全部门 | [DB2552 6.7.3.1](E:/Documents/neibaoaudit-codex-audit-bundle/reference/DB11T2552-2026鍗曚綅鍐呴儴瀹夊叏闃茶寖閫氱敤瑕佹眰.pdf)（PDF15/印刷11）：标准宜 |
| A04-L1-08 一级安防平台必设 | 一级重点单位。已设置且可使用；未安装属缺口不可NA；8.7功能、权限、故障独立性另按子控制审。 | 架构、验收、实际使用与功能<br>保卫/信息部门 | [DB2552 6.7.3.2](E:/Documents/neibaoaudit-codex-audit-bundle/reference/DB11T2552-2026鍗曚綅鍐呴儴瀹夊叏闃茶寖閫氱敤瑕佹眰.pdf)（PDF15/印刷11）：标准应 |
| A04-L1-09 主出入口身份识别 | 一级周界主要出入口。门禁识别人员身份并依授权放行；不得把身份识别等于必须人脸。 | 方案、身份授权及功能实测<br>保卫/信息部门 | [DB2552 6.7.3.3](E:/Documents/neibaoaudit-codex-audit-bundle/reference/DB11T2552-2026鍗曚綅鍐呴儴瀹夊叏闃茶寖閫氱敤瑕佹眰.pdf)（PDF15/印刷11）：标准应 |
| A04-L1-10 车底成像安检建议 | 一级有车辆主出入口。按风险采用车底成像等装置，为宜；不得替代已继承二级安检区/探测设施。 | 采用决定及功能测试<br>安检部门 | [DB2552 6.7.3.3、F序号16](E:/Documents/neibaoaudit-codex-audit-bundle/reference/DB11T2552-2026鍗曚綅鍐呴儴瀹夊叏闃茶寖閫氱敤瑕佹眰.pdf)（PDF15、24/印刷11、20）：标准宜 |
| A04-L1-11 制高点视频建议及效果 | 一级有适合制高点；选择采用。配置为宜，采用后的监视及回放清晰显示区域人员活动车辆行驶；配置/效果分子断言。 | 点位、采用、昼夜监视回放<br>监控运行部门 | [DB2552 6.7.3.4、F序号21](E:/Documents/neibaoaudit-codex-audit-bundle/reference/DB11T2552-2026鍗曚綅鍐呴儴瀹夊叏闃茶寖閫氱敤瑕佹眰.pdf)（PDF15、24/印刷11、20）：标准宜 |
| A04-L1-12 重要建筑入口入侵探测 | 一级重要部位所在建筑入口。每个适用入口探测有效；二级宜升级一级应，内部探测不能替代入口。 | 入口清单、探测报警测试<br>设施/保卫部门 | [DB2552 6.7.3.5(a)、F序号29](E:/Documents/neibaoaudit-codex-audit-bundle/reference/DB11T2552-2026鍗曚綅鍐呴儴瀹夊叏闃茶寖閫氱敤瑕佹眰.pdf)（PDF15、24/印刷11、20）：标准应 |
| A04-L1-13 重要建筑执勤岗紧急报警 | 一级重要建筑保卫执勤岗。每个相应岗可触达报警且有效，门卫报警不能替代。 | 岗位点位、报警及联动测试<br>设施/保卫部门 | [DB2552 6.7.3.5(b)、F序号38](E:/Documents/neibaoaudit-codex-audit-bundle/reference/DB11T2552-2026鍗曚綅鍐呴儴瀹夊叏闃茶寖閫氱敤瑕佹眰.pdf)（PDF15、25/印刷11、21）：标准应 |
| A04-L1-14 建筑入口及重要楼层门禁建议 | 一级相应建筑入口/重要楼层。两类位置分别核验采用，为宜；重要部位入口二级已应，不能合并覆盖。 | 分位置点位/采用决定、门禁实测<br>保卫/设施部门 | [DB2552 6.7.3.5(c)、F序号28、35](E:/Documents/neibaoaudit-codex-audit-bundle/reference/DB11T2552-2026鍗曚綅鍐呴儴瀹夊叏闃茶寖閫氱敤瑕佹眰.pdf)（PDF15、24、25/印刷11、20、21）：标准宜 |
| A04-L1-15 共用重要建筑管理边界门禁 | 一级且多单位共用重要建筑。划清管理边界并设置门禁；物业统一管理不自动豁免。 | 责任协议、边界图、授权/功能<br>单位负责人/物业/保卫 | [DB2552 6.7.3.5(d)](E:/Documents/neibaoaudit-codex-audit-bundle/reference/DB11T2552-2026鍗曚綅鍐呴儴瀹夊叏闃茶寖閫氱敤瑕佹眰.pdf)（PDF15/印刷11）：标准应 |
| A04-L1-16 重要部位入口访客安检建议 | 一级重要部位有来访。逐入口核验安检区和手持金属探测等采用，为宜；周界主入口二级应另查。 | 点位、采用、检查流程/测试<br>安检/保卫部门 | [DB2552 6.7.3.6、F序号40](E:/Documents/neibaoaudit-codex-audit-bundle/reference/DB11T2552-2026鍗曚綅鍐呴儴瀹夊叏闃茶寖閫氱敤瑕佹眰.pdf)（PDF15、25/印刷11、21）：标准宜 |
| A04-L1-17 重要建筑周边入侵探测 | 一级重要部位所在建筑周边。附录F序号23为一级应，独立核验周边探测；不能以入口/内部探测替代。 | 周边点位、探测报警实测<br>设施/保卫 | [DB2552 6.4.15、表F序号23](E:/Documents/neibaoaudit-codex-audit-bundle/reference/DB11T2552-2026鍗曚綅鍐呴儴瀹夊叏闃茶寖閫氱敤瑕佹眰.pdf)（PDF12、24/印刷8、20）：标准应 |

### 3.4 档案与记录

| 控制ID／题目 | 适用与验收 | 最低证据／责任 | 原始依据 |
|---|---|---|---|
| A04-REC-01 所有单位基础工作档案 | 所有单位。收集整理机构、制度、监督检查等档案；一般单位不能因非重点隐藏；目录不等于资料存在。 | 目录及资料编号日期、检索核验<br>保卫/档案部门 | [DB2552 4.3.3](E:/Documents/neibaoaudit-codex-audit-bundle/reference/DB11T2552-2026鍗曚綅鍐呴儴瀹夊叏闃茶寖閫氱敤瑕佹眰.pdf)（PDF8/印刷4）：标准应 |
| A04-REC-02 重点单位逐类完整档案 | 重点含未定级。逐类核验基本情况、责任制、制度、重要岗位/部位区域清单、风险评估、措施、工程检验、效能评估、培训奖惩、预案演练、案事件。每类独立结果。 | 分类型目录、实际资料、无事件等说明<br>保卫/档案部门 | [DB2552 4.3.4](E:/Documents/neibaoaudit-codex-audit-bundle/reference/DB11T2552-2026鍗曚綅鍐呴儴瀹夊叏闃茶寖閫氱敤瑕佹眰.pdf)（PDF8/印刷4）：标准应 |
| A04-REC-03 巡查检查双签归档 | 所有单位有巡查检查。记录执行人员及主管签名并归档；9.4未定统一年限，另批准分类保存表。 | 双签记录、归档检索<br>保卫部门 | [DB2552 9.4](E:/Documents/neibaoaudit-codex-audit-bundle/reference/DB11T2552-2026鍗曚綅鍐呴儴瀹夊叏闃茶寖閫氱敤瑕佹眰.pdf)（PDF17/印刷13）：标准应 |
| A04-REC-04 重点访客和机动车记录180日 | 重点实际访客、机动车登记。两类分别实际可检索≥180d；未建记录不可NA。 | 分类策略、到期前取回样本<br>保卫部门 | [DB2552 6.4.9](E:/Documents/neibaoaudit-codex-audit-bundle/reference/DB11T2552-2026鍗曚綅鍐呴儴瀹夊叏闃茶寖閫氱敤瑕佹眰.pdf)（PDF12/印刷8）：标准应 |
| A04-REC-05 报警四类记录90日 | 设置或要求设置报警系统。布防、撤防、故障、报警四类分别可检索≥90d。 | 四类策略与边界样本<br>监控运行部门 | [DB2552 8.2.5](E:/Documents/neibaoaudit-codex-audit-bundle/reference/DB11T2552-2026鍗曚綅鍐呴儴瀹夊叏闃茶寖閫氱敤瑕佹眰.pdf)（PDF16/印刷12）：标准应 |
| A04-REC-06 门禁四类记录180日 | 设置或要求设置门禁系统。操作、故障、配置、通行分别保存≥180d。 | 四类策略与可取回样本<br>信息/监控部门 | [DB2552 8.4.3](E:/Documents/neibaoaudit-codex-audit-bundle/reference/DB11T2552-2026鍗曚綅鍐呴儴瀹夊叏闃茶寖閫氱敤瑕佹眰.pdf)（PDF16/印刷12）：标准应 |
| A04-REC-07 电子巡查记录90日 | 设置或要求电子巡查系统。保存≥90d并可核路线时间人员；制度不替代实际记录。 | 策略与边界样本<br>保卫/监控部门 | [DB2552 8.5.2](E:/Documents/neibaoaudit-codex-audit-bundle/reference/DB11T2552-2026鍗曚綅鍐呴儴瀹夊叏闃茶寖閫氱敤瑕佹眰.pdf)（PDF16/印刷12）：标准应 |
| A04-REC-08 视频原始完整与30日保存 | DB视频系统或GB适用工程；799第7条另有独立义务。实时原始完整，实际可回放≥30d，按通道码率容量核验。第9条不因799第17条自动适用30日，但独立DB/GB依据仍另判。 | 配置、容量、最早与连续录像回放<br>信息/监控部门 | [DB2552 8.3.1](E:/Documents/neibaoaudit-codex-audit-bundle/reference/DB11T2552-2026鍗曚綅鍐呴儴瀹夊叏闃茶寖閫氱敤瑕佹眰.pdf)（PDF16/印刷12）：标准应<br>[GB55029 3.5.2(5)](E:/Documents/neibaoaudit-codex-audit-bundle/.audit-work/a04-sources/gb55029-notice-government.pdf)（PDF14/印刷9）：国家强制<br>[VIDEO799 17、9](https://www.mee.gov.cn/zcwj/gwywj/202502/t20250211_1102044.shtml)：法律义务 |
| A04-REC-09 维护记录保存分支与签名 | 适用/已采用DB855运维。签字归档；6.8原文三年或系统使用期，保留批准分支、起算与证明；未核准待专家。内部可更严取较长者，勿称唯一原文要求。<br>**分支内涵及起算需业务/法律专家复核。** | 维护报告/签名、保存分支审批、取回证明<br>维护/档案部门 | [DB855 6.7、6.8](E:/Documents/neibaoaudit-codex-audit-bundle/.audit-work/a04-sources/db855-official.pdf)（PDF6/印刷3）：标准应 |
| A04-REC-10 工程竣工资料完整移交 | GB工程竣工验收移交。验收合格后编制完整竣工资料并移交，图纸实装一致；不合格不得交付。 | 设计、隐蔽验收、检验试运行、质量验收与签收<br>建设/施工/档案部门 | [GB55029 5.0.3—5.0.5](E:/Documents/neibaoaudit-codex-audit-bundle/.audit-work/a04-sources/gb55029-notice-government.pdf)（PDF17/印刷12）：国家强制 |
| A04-REC-11 影响评估及记录至少三年 | 个人信息法55触发事项；实际人脸识别等。相应处理前做影响评估；评估报告和处理情况记录≥3年，不延长所有视频/脸模板为三年。 | 事前评估审批、处理记录、保存策略<br>个人信息保护/法务 | [PIPL 55、56](https://www.cac.gov.cn/2021-08/20/c_1631050028355286.htm)：法律义务<br>[FACE2025 9](https://www.cac.gov.cn/2025-03/21/c_1744174262156096.htm)：法律义务 |
| A04-REC-12 相关网络日志六个月 | 依法适用网络运营者与相应日志。相关网络运行安全日志≥六个日历月，独立于门禁180日和报警90日；审核SPA不能替代运行日志。 | 主体/范围认定、配置与边界日志<br>网络安全部门 | [CSL2026 23(3)](https://sdca.miit.gov.cn/zwgk/fgbz/art/2026/art_4815dd4ec11d454783b83a91502a3cc7.html)：法律义务 |
| A04-REC-13 到期删除与合法留置 | 个人信息/视频按类别。登记最低依据、必要期限、起算、删除、依法留置及解除。第7条视频依17条30日后目的实现删除；其余独立适用，不一律永久留或30日删全部。 | 分类保存表、用途/留置审批、删除验证<br>法务/信息/档案 | [PIPL 19、47](https://www.cac.gov.cn/2021-08/20/c_1631050028355286.htm)：法律义务<br>[VIDEO799 17、9](https://www.mee.gov.cn/zcwj/gwywj/202502/t20250211_1102044.shtml)：法律义务 |
| A04-REC-14 整改及临时防范闭环记录 | 重点检查发现问题；其他单位按采用制度。记对象原因责任期限措施、整改期保护及复核；严重且客观无法达标及时上报。关闭不自动改符合。 | 问题单、保护、整改/复核、上报<br>保卫/责任部门 | [DB2552 9.6](E:/Documents/neibaoaudit-codex-audit-bundle/reference/DB11T2552-2026鍗曚綅鍐呴儴瀹夊叏闃茶寖閫氱敤瑕佹眰.pdf)（PDF17/印刷13）：标准应 |
| A04-REC-15 案事件和危险物品丢失记录 | 重点单位发生事件/危险物品丢失。按预案处理留事件、动作、报告后续等资料，无事件真实说明。 | 事件/处置与上报编号<br>保卫部门 | [DB2552 6.4.13、4.3.4](E:/Documents/neibaoaudit-codex-audit-bundle/reference/DB11T2552-2026鍗曚綅鍐呴儴瀹夊叏闃茶寖閫氱敤瑕佹眰.pdf)（PDF8、12/印刷4、8）：标准应 |
| A04-REC-16 设备台账变更可追溯 | 适用/采用DB855系统。型号点位责任、投停用、版本维护可追溯；更换设备有批准方案/测试。 | 台账、批准更换方案与复测<br>运行/维护部门 | [DB855 4.4、6.5](E:/Documents/neibaoaudit-codex-audit-bundle/.audit-work/a04-sources/db855-official.pdf)（PDF5、6/印刷2、3）：标准应 |

### 3.5 视频及个人信息

| 控制ID／题目 | 适用与验收 | 最低证据／责任 | 原始依据 |
|---|---|---|---|
| A04-PRI-01 显著视频采集提示 | 公共区域采集；重点通过6.4.1承接5.1.5。显著可读提示并衔接可获取的处理说明，设备参数合格不能替代提示。 | 点位/标识照片、处理说明<br>保卫/个人信息保护 | [DB2552 5.1.5](E:/Documents/neibaoaudit-codex-audit-bundle/reference/DB11T2552-2026鍗曚綅鍐呴儴瀹夊叏闃茶寖閫氱敤瑕佹眰.pdf)（PDF9/印刷5）：标准应<br>[PIPL 26](https://www.cac.gov.cn/2021-08/20/c_1631050028355286.htm)：法律义务<br>[VIDEO799 13、9](https://www.mee.gov.cn/zcwj/gwywj/202502/t20250211_1102044.shtml)：法律义务 |
| A04-PRI-02 逐处理活动合法依据 | 视频访客门禁车辆身份等个人信息。逐活动登记目的、最小范围、依据和期限；同意及第13条其他依据分别判断，内部授权不是法律处理依据。 | 活动台账、法务必要性与依据<br>个人信息保护/法务 | [PIPL 6、13](https://www.cac.gov.cn/2021-08/20/c_1631050028355286.htm)：法律义务 |
| A04-PRI-03 禁设图像采集区域排除 | 公共采集区域；非公共依独立隐私要求。排除第8条禁止房间内部等及可窥视窃听隐私区域；同意不豁免禁止设置。 | 全点位/FOV、禁区排查、调整证明<br>保卫/法务 | [VIDEO799 8、33](https://www.mee.gov.cn/zcwj/gwywj/202502/t20250211_1102044.shtml)：法律义务 |
| A04-PRI-04 相邻军队涉密单位事先同意 | 邻接军事禁区管理区或国家机关等涉密周边。安装前征得相关单位同意与范围点位对应，不由本单位secret布尔值决定；不是员工个人同意。 | 邻接图、事先同意文件/范围<br>保密/保卫/负责人 | [DB2552 5.1.5](E:/Documents/neibaoaudit-codex-audit-bundle/reference/DB11T2552-2026鍗曚綅鍐呴儴瀹夊叏闃茶寖閫氱敤瑕佹眰.pdf)（PDF9/印刷5）：标准应<br>[VIDEO799 10、9](https://www.mee.gov.cn/zcwj/gwywj/202502/t20250211_1102044.shtml)：法律义务 |
| A04-PRI-05 处理告知具体内容 | 个人信息处理且无法定告知例外。告知主体联系方式、目的方式类别、保存与权利途径，变化更新；例外留法律依据。 | 说明版本、获取途径、例外审批<br>个人信息保护 | [PIPL 17、18](https://www.cac.gov.cn/2021-08/20/c_1631050028355286.htm)：法律义务 |
| A04-PRI-06 同意与单独同意核验 | 适用同意依据/依法单独同意事项。同意自愿知情明确可撤回，变更重新核验；敏感信息和其他目的等单独同意与其他依据关系由法务确认。<br>**同意与其他合法依据关系需业务/法律专家复核。** | 依据批准、同意版本时间、撤回验证摘要<br>个人信息保护/法务 | [PIPL 13—16、26、28—30](https://www.cac.gov.cn/2021-08/20/c_1631050028355286.htm)：法律义务<br>[FACE2025 6](https://www.cac.gov.cn/2025-03/21/c_1744174262156096.htm)：法律义务 |
| A04-PRI-07 监看导出配置删除最小权限 | 实际视频/个人信息系统；重点承接要求。角色分离与最小权限，离岗转岗撤改权限；第9条例外不排除个人信息法/DB独立保护。 | 角色矩阵、越权拒绝与撤权验证<br>信息安全/保卫 | [DB2552 5.1.5、8.7.2](E:/Documents/neibaoaudit-codex-audit-bundle/reference/DB11T2552-2026鍗曚綅鍐呴儴瀹夊叏闃茶寖閫氱敤瑕佹眰.pdf)（PDF9、17/印刷5、13）：标准应<br>[PIPL 51](https://www.cac.gov.cn/2021-08/20/c_1631050028355286.htm)：法律义务<br>[VIDEO799 16、9](https://www.mee.gov.cn/zcwj/gwywj/202502/t20250211_1102044.shtml)：法律义务 |
| A04-PRI-08 视频调用登记 | 799第7条系统；其他场景独立依据。16第二款适用时登记事由内容、调用人单位姓名等；第9条被排除款不能直接套用，内控另标来源。 | 调用审批/登记、账号操作对应<br>监控/个人信息保护 | [VIDEO799 16第二款、9](https://www.mee.gov.cn/zcwj/gwywj/202502/t20250211_1102044.shtml)：法律义务 |
| A04-PRI-09 委托权限保密与终止 | 委托安防建设运维或个人信息处理。约定范围期限保护监督；终止返还删除与撤权，运维不超范围留存；影响评估另审。 | 合同保密、权限终止、返还删除摘要<br>法务/采购/信息 | [PIPL 21](https://www.cac.gov.cn/2021-08/20/c_1631050028355286.htm)：法律义务<br>[VIDEO799 15第二款、19、9](https://www.mee.gov.cn/zcwj/gwywj/202502/t20250211_1102044.shtml)：法律义务 |
| A04-PRI-10 人脸必要性与非人脸替代 | 实际算法人脸识别；普通录像不自动触发。评估必要性最小影响；存在等效非人脸方式时提供合理便利替代，国家另规例外留依据。 | 算法用途、替代评估与非人脸测试<br>个人信息保护/保卫 | [FACE2025 4、10](https://www.cac.gov.cn/2025-03/21/c_1744174262156096.htm)：法律义务 |
| A04-PRI-11 人脸存储传输与安全 | 实际人脸算法。第8条设备内存储、不经互联网外传默认规则及法定/同意例外核验；第14条保护子项分别验证；不将模板录入SPA。 | 数据流、例外审批、加密权限/审计摘要<br>信息安全/个人信息保护 | [FACE2025 8、14](https://www.cac.gov.cn/2025-03/21/c_1744174262156096.htm)：法律义务 |
| A04-PRI-12 第7条视频投入后备案 | 799第7条系统；不含第9条例外。新投用之日起30日内备案，变更及时办理，信息实装一致；2025既有系统90日过渡不在2026重新起算。 | 投用日、回执信息及变更<br>负责人/保卫 | [VIDEO799 14、9](https://www.mee.gov.cn/zcwj/gwywj/202502/t20250211_1102044.shtml)：法律义务 |
| A04-PRI-13 人脸十万人触发备案 | 存储人脸达到10万人；主体人数口径核准。按第15条触发30个工作日内省级网信备案及相应变化终止要求；不把十万条模板当然等同十万人。 | 计数、触发日、备案回执<br>个人信息保护/法务 | [FACE2025 15](https://www.cac.gov.cn/2025-03/21/c_1744174262156096.htm)：法律义务 |
| A04-PRI-14 FOV及隐私保护实际有效 | 设置视频；实际采集范围。位置角度范围限于必要目的，邻户非目标及音频单查；调整遮蔽须对显示/存储实际验证，并保持所需防护。 | FOV与预置位、昼夜验证、遮蔽/调整<br>保卫/个人信息保护 | [DB2552 5.1.5](E:/Documents/neibaoaudit-codex-audit-bundle/reference/DB11T2552-2026鍗曚綅鍐呴儴瀹夊叏闃茶寖閫氱敤瑕佹眰.pdf)（PDF9/印刷5）：标准应<br>[VIDEO799 13](https://www.mee.gov.cn/zcwj/gwywj/202502/t20250211_1102044.shtml)：法律义务<br>[PIPL 6](https://www.cac.gov.cn/2021-08/20/c_1631050028355286.htm)：法律义务 |

### 3.6 频率与时限

| 控制ID／题目 | 适用与验收 | 最低证据／责任 | 原始依据 |
|---|---|---|---|
| A04-FRQ-01 内部人员年度培训 | 所有单位内部人员。每年≥1次安全防范教育培训，核验人员覆盖；管理人员专业定期培训另查。 | 内容日期、参加覆盖与考核<br>人事/保卫 | [DB2552 4.2.1](E:/Documents/neibaoaudit-codex-audit-bundle/reference/DB11T2552-2026鍗曚綅鍐呴儴瀹夊叏闃茶寖閫氱敤瑕佹眰.pdf)（PDF8/印刷4）：标准应 |
| A04-FRQ-02 重点人员分级教育培训 | 重点单位，分治安保卫人员与保安员。三级两类每年≥1次；二级/一级原文半年对象为治安保卫人员每半年≥1次，保安员继承年度。角色范围不得无依据扩展。 | 角色清单、每期培训及参加覆盖<br>保卫/人事 | [DB2552 6.5.1.3、6.6.1.2](E:/Documents/neibaoaudit-codex-audit-bundle/reference/DB11T2552-2026鍗曚綅鍐呴儴瀹夊叏闃茶寖閫氱敤瑕佹眰.pdf)（PDF12、14/印刷8、10）：标准应 |
| A04-FRQ-03 重点人员分级预案演练 | 重点角色范围同FRQ-02。三级两类每年≥1次；二级以上治安保卫人员每半年≥1次，保安员继承年度。培训不能替代演练。 | 预案场景、实际参与、过程及复盘改进<br>保卫 | [DB2552 6.5.1.3、6.6.1.2](E:/Documents/neibaoaudit-codex-audit-bundle/reference/DB11T2552-2026鍗曚綅鍐呴儴瀹夊叏闃茶寖閫氱敤瑕佹眰.pdf)（PDF12、14/印刷8、10）：标准应 |
| A04-FRQ-04 单位年度应急演练 | 所有单位。每年≥1次，有实施和改进记录，演练方案不等于完成。 | 实施、复盘与改进跟踪<br>负责人/保卫 | [DB2552 4.4.3](E:/Documents/neibaoaudit-codex-audit-bundle/reference/DB11T2552-2026鍗曚綅鍐呴儴瀹夊叏闃茶寖閫氱敤瑕佹眰.pdf)（PDF8/印刷4）：标准应 |
| A04-FRQ-05 重点巡查最大间隔 | 重点重要部位和区域；未定级按三级最低。三级≤24h、二级≤12h、一级≤6h。取相邻及末次到审计时最大间隔，不用月平均次数。 | 路线点位、完整时间序列、漏巡及替补<br>保卫 | [DB2552 6.5.1.5、6.6.1.3、6.7.1.3](E:/Documents/neibaoaudit-codex-audit-bundle/reference/DB11T2552-2026鍗曚綅鍐呴儴瀹夊叏闃茶寖閫氱敤瑕佹眰.pdf)（PDF12、14/印刷8、10）：标准应 |
| A04-FRQ-06 重点每次巡查至少两人 | 重点各级重要部位区域巡查。每次至少2人，核实际同行；电子打点数量不是人数。 | 人员时间路线及抽验<br>保卫 | [DB2552 6.5.1.5、6.3.3](E:/Documents/neibaoaudit-codex-audit-bundle/reference/DB11T2552-2026鍗曚綅鍐呴儴瀹夊叏闃茶寖閫氱敤瑕佹眰.pdf)（PDF11、12/印刷7、8）：标准应 |
| A04-FRQ-07 重点每日巡查和夜间安排 | 重点单位。每日治安巡查、结合实际组织夜间巡查，与小时间隔同时满足；9.1不把所有单位/每晚一律固定。 | 每日记录、夜间风险及执行<br>保卫 | [DB2552 9.1](E:/Documents/neibaoaudit-codex-audit-bundle/reference/DB11T2552-2026鍗曚綅鍐呴儴瀹夊叏闃茶寖閫氱敤瑕佹眰.pdf)（PDF17/印刷13）：标准应 |
| A04-FRQ-08 一般定期巡查检查批准周期 | 一般单位。制定风险适配的明确周期、对象、人员、日期；原文定期无统一数值，月/季内部周期明确标来源。 | 批准频率表与到期执行<br>保卫 | [DB2552 5.2.1、9.2](E:/Documents/neibaoaudit-codex-audit-bundle/reference/DB11T2552-2026鍗曚綅鍐呴儴瀹夊叏闃茶寖閫氱敤瑕佹眰.pdf)（PDF9、17/印刷5、13）：标准应 |
| A04-FRQ-09 重点季度检查覆盖H | 重点含未定级。每日历季度≥1次，覆盖附录H并归档；设备维护不能替代体系检查。 | 季度表、H子项、双签及整改<br>保卫 | [DB2552 9.2](E:/Documents/neibaoaudit-codex-audit-bundle/reference/DB11T2552-2026鍗曚綅鍐呴儴瀹夊叏闃茶寖閫氱敤瑕佹眰.pdf)（PDF17/印刷13）：标准应 |
| A04-FRQ-10 特定变更后15日内检查 | 重点确定/变更重要部位或修改相关制度。触发到完成≤15d；起算节假日截止按核准口径；其他变更不直接套c项。 | 触发文件日、专项检查结果日<br>保卫 | [DB2552 9.3(c)](E:/Documents/neibaoaudit-codex-audit-bundle/reference/DB11T2552-2026鍗曚綅鍐呴儴瀹夊叏闃茶寖閫氱敤瑕佹眰.pdf)（PDF17/印刷13）：标准应 |
| A04-FRQ-11 其他变更及事件及时检查 | 重点9.3 a/b/d/e触发。责任制、机构/管理人员重大变化及事件后及时；非常态进入或可能进入前检查；内部SLA不冒称统一15d。 | 触发台账、批准SLA与检查<br>保卫 | [DB2552 9.3(a)(b)(d)(e)](E:/Documents/neibaoaudit-codex-audit-bundle/reference/DB11T2552-2026鍗曚綅鍐呴儴瀹夊叏闃茶寖閫氱敤瑕佹眰.pdf)（PDF17/印刷13）：标准应 |
| A04-FRQ-12 二级以上每日电子巡视 | 二级/一级监控值机。每日用系统电子巡视，异常记录及时报；与实体巡查分开。 | 巡视与异常报告关联<br>监控运行 | [DB2552 6.6.1.5、6.3.3](E:/Documents/neibaoaudit-codex-audit-bundle/reference/DB11T2552-2026鍗曚綅鍐呴儴瀹夊叏闃茶寖閫氱敤瑕佹眰.pdf)（PDF11、14/印刷7、10）：标准应 |
| A04-FRQ-13 日常维护间隔不超过三个月 | 适用/采用DB855系统。连续维护间隔≤3个日历月，按GA/T1081相关要求制定作业、形成报告，效果按C；不能仅说每季度，也不机械换90d。 | 计划、日期序列、报告与效果验证<br>维护单位 | [DB855 6.10、6.14](E:/Documents/neibaoaudit-codex-audit-bundle/.audit-work/a04-sources/db855-official.pdf)（PDF6/印刷3）：标准应 |
| A04-FRQ-14 故障响应修复SLA | 适用/采用DB855；实际故障。合同/管理核准响应修复时限，分级优先高故障，修后跟踪；无统一48h法定维修期。 | SLA、工单、临时保护及修后跟踪<br>运行/维护 | [DB855 6.11](E:/Documents/neibaoaudit-codex-audit-bundle/.audit-work/a04-sources/db855-official.pdf)（PDF6/印刷3）：标准应 |
| A04-FRQ-15 弱口令漏洞与更新计划 | 有账号的系统设备。不使用弱口令、定期更新并处理漏洞；周期按批准策略，原文无统一90日。审核不收集实际密码。 | 脱敏策略、配置核验、更新及漏洞闭环<br>信息安全 | [DB2552 8.1.4](E:/Documents/neibaoaudit-codex-audit-bundle/reference/DB11T2552-2026鍗曚綅鍐呴儴瀹夊叏闃茶寖閫氱敤瑕佹眰.pdf)（PDF16/印刷12）：标准应<br>[GB55029 2.0.4](E:/Documents/neibaoaudit-codex-audit-bundle/.audit-work/a04-sources/gb55029-notice-government.pdf)（PDF7/印刷2）：国家强制 |
| A04-FRQ-16 风险与效能评估周期 | 重点单位。按批准周期分别做风险/系统效能评估，使用巡查检查整改结果调整措施；原文无全国统一年度频率。 | 批准周期、两类评估、调整执行<br>保卫 | [DB2552 9.7](E:/Documents/neibaoaudit-codex-audit-bundle/reference/DB11T2552-2026鍗曚綅鍐呴儴瀹夊叏闃茶寖閫氱敤瑕佹眰.pdf)（PDF17/印刷13）：标准应 |
| A04-FRQ-17 保卫管理人员定期专业培训 | 各单位治安保卫管理人员。专业/法律培训按批准周期实施，与内部人员每年教育分别成立。 | 岗位、内容周期及记录<br>人事/保卫 | [DB2552 4.2.4](E:/Documents/neibaoaudit-codex-audit-bundle/reference/DB11T2552-2026鍗曚綅鍐呴儴瀹夊叏闃茶寖閫氱敤瑕佹眰.pdf)（PDF8/印刷4）：标准应 |

### 3.7 GB55029核心控制

| 控制ID／题目 | 适用与验收 | 最低证据／责任 | 原始依据 |
|---|---|---|---|
| A04-GB-01 保护目标及风险需求 | GB适用工程设计/改造。明确对象区域目标风险，按风险确定点位功能性能，设备数量不代需求。 | 目标风险需求、批准设计<br>建设/设计/保卫 | [GB55029 1.0.3、3.1.1、3.1.2](E:/Documents/neibaoaudit-codex-audit-bundle/.audit-work/a04-sources/gb55029-notice-government.pdf)（PDF6、8/印刷1、3）：国家强制 |
| A04-GB-02 高风险设计前现场勘察 | GB高风险对象设计前。现场勘察先于设计且与实场对应；认定依据独立于DB重点标签。 | 认定、勘察与设计日期成果<br>建设/设计 | [GB55029 3.1.2](E:/Documents/neibaoaudit-codex-audit-bundle/.audit-work/a04-sources/gb55029-notice-government.pdf)（PDF8/印刷3）：国家强制 |
| A04-GB-03 高风险监控中心选址 | GB高风险保护对象系统。设中心并远离粉尘油烟有害气体、易燃易爆生产贮存、强震强噪声场所。 | 位置环境、批准设计<br>建设/设施 | [GB55029 3.1.8](E:/Documents/neibaoaudit-codex-audit-bundle/.audit-work/a04-sources/gb55029-notice-government.pdf)（PDF9/印刷4）：国家强制 |
| A04-GB-04 高风险中心视频 | GB高风险中心及独立设备区。视频清楚显示出入及室内活动，独立设备区按相应要求另验。 | 点位及监视回放<br>监控/设施 | [GB55029 3.1.9(1)(5)](E:/Documents/neibaoaudit-codex-audit-bundle/.audit-work/a04-sources/gb55029-notice-government.pdf)（PDF9/印刷4）：国家强制 |
| A04-GB-05 高风险中心内外通信 | GB高风险中心/独立设备区。配内外通信并验证联络。 | 通信方案及可达测试<br>监控/设施 | [GB55029 3.1.9(2)(5)](E:/Documents/neibaoaudit-codex-audit-bundle/.audit-work/a04-sources/gb55029-notice-government.pdf)（PDF9/印刷4）：国家强制 |
| A04-GB-06 中心对外报警与接收核实 | GB高风险中心；双接公安条件单判。紧急报警可向外发送；同时接入中心和公安接警时值机核实公安接收。普通报警不无依据强制联网公安。 | 发送接收验证及核实记录<br>监控/保卫 | [GB55029 3.1.9(3)(5)、6.0.4](E:/Documents/neibaoaudit-codex-audit-bundle/.audit-work/a04-sources/gb55029-notice-government.pdf)（PDF9、18/印刷4、13）：国家强制 |
| A04-GB-07 分离中心线缆保护 | 高风险中心值守区设备区独立且不相邻。两区传输线缆保护与路径可验。 | 图纸线缆保护/隐蔽验收<br>设施/施工 | [GB55029 3.1.9(4)](E:/Documents/neibaoaudit-codex-audit-bundle/.audit-work/a04-sources/gb55029-notice-government.pdf)（PDF9/印刷4）：国家强制 |
| A04-GB-08 独立设备区探测和门禁 | 高风险中心独立设备区。除视频通信报警外入侵探测、门禁分别验证。 | 设备区点位和分项实测<br>设施/监控 | [GB55029 3.1.9(5)](E:/Documents/neibaoaudit-codex-audit-bundle/.audit-work/a04-sources/gb55029-notice-government.pdf)（PDF9/印刷4）：国家强制 |
| A04-GB-09 高风险专用传输网络 | GB高风险保护对象系统。采用专用传输网络，边界和隔离有设计核准及验证，不以普通VLAN标签自动宣称满足。 | 架构专用边界、隔离验证<br>信息安全/设计 | [GB55029 3.2.4](E:/Documents/neibaoaudit-codex-audit-bundle/.audit-work/a04-sources/gb55029-notice-government.pdf)（PDF11/印刷6）：国家强制 |
| A04-GB-10 设备材料检验与进场查验 | GB系统设备材料安装。检验合格，进场查验质量证明合格后安装，型号批次对应实装。 | 检验资料及进场验收<br>采购/施工/建设 | [GB55029 2.0.3、4.0.2](E:/Documents/neibaoaudit-codex-audit-bundle/.audit-work/a04-sources/gb55029-notice-government.pdf)（PDF7、16/印刷2、11）：国家强制 |
| A04-GB-11 跨传输网络边界安全 | 不同网络系统设备联网。每个跨网边界有对应管理措施，远程维护等实际路径入清单。 | 联网清单、边界配置和访问测试<br>信息安全 | [GB55029 2.0.4](E:/Documents/neibaoaudit-codex-audit-bundle/.audit-work/a04-sources/gb55029-notice-government.pdf)（PDF7/印刷2）：国家强制 |
| A04-GB-12 无人值守周界门均衡防护 | 与周界相连且无人值守出入口。出入口屏障防护能力与周界相当，薄弱旁门单查。 | 所有旁门风险设计与状态<br>设施/保卫 | [GB55029 3.1.4(1)](E:/Documents/neibaoaudit-codex-audit-bundle/.audit-work/a04-sources/gb55029-notice-government.pdf)（PDF8/印刷3）：国家强制 |
| A04-GB-13 报警防拆功能 | GB报警系统。探测器和控制指示设备防拆报警实际有效。 | 防拆触发和显示测试<br>设施/监控 | [GB55029 3.5.1(2)](E:/Documents/neibaoaudit-codex-audit-bundle/.audit-work/a04-sources/gb55029-notice-government.pdf)（PDF13/印刷8）：国家强制 |
| A04-GB-14 报警线路短断路与切电 | GB报警系统。断路短路及探测器电源切断等各情景分别报警，测试安全受控。 | 线路及分情景验证<br>设施/监控 | [GB55029 3.5.1(3)](E:/Documents/neibaoaudit-codex-audit-bundle/.audit-work/a04-sources/gb55029-notice-government.pdf)（PDF13/印刷8）：国家强制 |
| A04-GB-15 报警权限布撤旁路胁迫 | GB报警系统。参数/用户权限、布防撤防旁路胁迫等各功能分别留结果和整改，全部适用子断言通过才全符合。 | 功能与角色矩阵、分项测试<br>监控/信息 | [GB55029 3.5.1(4)(5)](E:/Documents/neibaoaudit-codex-audit-bundle/.audit-work/a04-sources/gb55029-notice-government.pdf)（PDF13/印刷8）：国家强制 |
| A04-GB-16 报警类别准确指示 | GB报警系统。入侵紧急防拆故障等准确指示，与点位及事件记录对应。 | 不同类别触发显示<br>监控/设施 | [GB55029 3.5.1(1)(6)](E:/Documents/neibaoaudit-codex-audit-bundle/.audit-work/a04-sources/gb55029-notice-government.pdf)（PDF13/印刷8）：国家强制 |
| A04-GB-17 报警事件记录不可更改 | GB报警系统。操作报警警情处置有记录且不能更改，核完整性权限，不只核有日志。 | 机制权限、更改拒绝测试<br>信息安全/监控 | [GB55029 3.5.1(7)](E:/Documents/neibaoaudit-codex-audit-bundle/.audit-work/a04-sources/gb55029-notice-government.pdf)（PDF13/印刷8）：国家强制 |
| A04-GB-18 报警控制器响应≤2s | GB报警系统。按批准测法核报警控制器响应≤2s，定义起止点；不是保安到场时限。 | 方案仪器及时间原始结果<br>检验/设施 | [GB55029 3.5.1(8)](E:/Documents/neibaoaudit-codex-audit-bundle/.audit-work/a04-sources/gb55029-notice-government.pdf)（PDF13/印刷8）：国家强制 |
| A04-GB-19 报警备用供电≥8h | GB报警系统。实际必要负载正常运行≥8h，核容量状态和受控验证，不只看UPS铭牌。 | 负载续航、电池状态与验证<br>设施/检验 | [GB55029 3.5.1(9)](E:/Documents/neibaoaudit-codex-audit-bundle/.audit-work/a04-sources/gb55029-notice-government.pdf)（PDF13/印刷8）：国家强制 |
| A04-GB-20 视频覆盖和用途图像有效 | GB视频保护区域部位目标。逐点昼夜监看回放满足用途，覆盖完整；分辨率不能代实际识别。 | 目标点位矩阵、昼夜验证摘要<br>监控/设计 | [GB55029 3.5.2(1)、3.1.3(3)、3.1.4(4)](E:/Documents/neibaoaudit-codex-audit-bundle/.audit-work/a04-sources/gb55029-notice-government.pdf)（PDF8、9、13/印刷3、4、8）：国家强制 |
| A04-GB-21 视频授权控制调看管理 | GB视频系统。前端控制调整、实时调看依授权，显示设备用户日志管理分子结果。 | 功能权限、日志样本<br>监控/信息 | [GB55029 3.5.2(2)(3)(4)(6)](E:/Documents/neibaoaudit-codex-audit-bundle/.audit-work/a04-sources/gb55029-notice-government.pdf)（PDF13、14/印刷8、9）：国家强制 |
| A04-GB-22 门禁外置部件线缆防护 | GB门禁受控区外部件/执行线缆。外部件防拆、外执行线缆封闭保护，两类分别验证。 | 图纸防护、安装验收<br>设施 | [GB55029 3.5.3(1)(5)](E:/Documents/neibaoaudit-codex-audit-bundle/.audit-work/a04-sources/gb55029-notice-government.pdf)（PDF14/印刷9）：国家强制 |
| A04-GB-23 断电开启门禁备用48h | GB断电开启型门禁点。备用保障执行装置≥48h；不套所有门，紧急疏散释放另查，不得续航锁死逃生。 | 锁型点位、负载续航和验证<br>设施/检验 | [GB55029 3.5.3(3)](E:/Documents/neibaoaudit-codex-audit-bundle/.audit-work/a04-sources/gb55029-notice-government.pdf)（PDF14/印刷9）：国家强制 |
| A04-GB-24 一卡通安防门禁独立管理 | GB共用非安防凭证/一卡通。门禁独立管理，消费业务权限不自动赋安防通行。 | 架构边界与权限实测<br>信息安全/保卫 | [GB55029 3.5.3(4)](E:/Documents/neibaoaudit-codex-audit-bundle/.audit-work/a04-sources/gb55029-notice-government.pdf)（PDF14/印刷9）：国家强制 |
| A04-GB-25 停车阻挡防砸有效 | GB停车管理执行装置。用批准安全测试实测防砸停止/回升，无人员危险。 | 安全方案及功能结果<br>设施 | [GB55029 3.5.4(2)](E:/Documents/neibaoaudit-codex-audit-bundle/.audit-work/a04-sources/gb55029-notice-government.pdf)（PDF14/印刷9）：国家强制 |
| A04-GB-26 停车紧急人工开启 | GB停车管理执行装置。紧急能人工开启，规程工具和培训可用。 | 规程及实际开闸测试<br>设施/保卫 | [GB55029 3.5.4(3)](E:/Documents/neibaoaudit-codex-audit-bundle/.audit-work/a04-sources/gb55029-notice-government.pdf)（PDF14/印刷9）：国家强制 |
| A04-GB-27 人体安检图像隐私 | GB人体安全检查设备。输出图像有隐私保护，不因安检免隐私。 | 输出权限与隐私验证<br>安检/个人信息保护 | [GB55029 3.5.5(1)](E:/Documents/neibaoaudit-codex-audit-bundle/.audit-work/a04-sources/gb55029-notice-government.pdf)（PDF14/印刷9）：国家强制 |
| A04-GB-28 微剂量X射线工位≤0.5μSv/h | GB微剂量X射线安检。正常工作时工作人员工作位置周围剂量当量率≤0.5μSv/h，由具备能力人员按方法测量，其他辐射法规另判。 | 工位工况、仪器方法和报告<br>职业健康/检验 | [GB55029 3.5.5(2)](E:/Documents/neibaoaudit-codex-audit-bundle/.audit-work/a04-sources/gb55029-notice-government.pdf)（PDF15/印刷10）：国家强制 |
| A04-GB-29 安检防爆处置设施 | GB安全检查系统。有防爆处置设施及状态/处置方案，类型按批准风险设计。 | 清单状态与处置方案<br>安检/保卫 | [GB55029 3.5.5(3)](E:/Documents/neibaoaudit-codex-audit-bundle/.audit-work/a04-sources/gb55029-notice-government.pdf)（PDF15/印刷10）：国家强制 |
| A04-GB-30 在线电子巡查异常报警 | GB电子巡查；在线式额外条件。按方案管理路线时间人员统计；在线偏离方案及时报警，离线不直接套在线条件。 | 配置异常模拟、报警/统计<br>保卫/信息 | [GB55029 3.5.7](E:/Documents/neibaoaudit-codex-audit-bundle/.audit-work/a04-sources/gb55029-notice-government.pdf)（PDF15/印刷10）：国家强制 |
| A04-GB-31 隐蔽验收与永久线缆编号 | GB施工隐蔽工程。覆盖前验收合格再下工序；接续/两端/检修孔等线缆编号永久标识按原文各位置验证。 | 隐蔽签认顺序日期、标识竣工图<br>施工/建设 | [GB55029 4.0.3、4.0.4](E:/Documents/neibaoaudit-codex-audit-bundle/.audit-work/a04-sources/gb55029-notice-government.pdf)（PDF16/印刷11）：国家强制 |
| A04-GB-32 试运行≥30日 | GB初步验收通过或项目建设完成后。触发后试运行≥30d，有运行及故障记录；不是视频存储30日。 | 初验/完成日、起止日志及结论<br>建设/运行 | [GB55029 4.0.7](E:/Documents/neibaoaudit-codex-audit-bundle/.audit-work/a04-sources/gb55029-notice-government.pdf)（PDF16/印刷11）：国家强制 |
| A04-GB-33 高风险检验及竣工验收放行 | GB工程；高风险检验条件单判。高风险工程检验，检验审功能性能；竣工施工/技术验收资料审查和质量结论分别通过，不合格不得交付。 | 认定检验、各环节验收及结论<br>建设/检验/验收 | [GB55029 5.0.1—5.0.5](E:/Documents/neibaoaudit-codex-audit-bundle/.audit-work/a04-sources/gb55029-notice-government.pdf)（PDF17/印刷12）：国家强制 |
| A04-GB-34 运维人员经费制度保障 | GB已移交运行系统。实施运维，批准方案保障人员经费制度技术；岗位日常值机现场处置保密培训考核各有子结果。 | 方案、作业书及保障执行<br>建设/运行/维护 | [GB55029 6.0.1—6.0.3](E:/Documents/neibaoaudit-codex-audit-bundle/.audit-work/a04-sources/gb55029-notice-government.pdf)（PDF18/印刷13）：国家强制 |
| A04-GB-35 特殊期运维与临时保护 | GB维护；特殊期触发时。日常/故障/特殊保障按方案执行；特殊期协调增员备件等落实，故障期间临时保护；GB原文无统一月季度周期。 | 方案、人员备件与保护执行<br>运行/维护 | [GB55029 6.0.5](E:/Documents/neibaoaudit-codex-audit-bundle/.audit-work/a04-sources/gb55029-notice-government.pdf)（PDF18/印刷13）：国家强制<br>[DB855 6.12](E:/Documents/neibaoaudit-codex-audit-bundle/.audit-work/a04-sources/db855-official.pdf)（PDF6/印刷3）：标准应 |

### 3.8 国内控制的国际核验方法补充（不计国内合规分）

| 控制ID／题目 | 适用与验收 | 最低证据／责任 | 原始依据 |
|---|---|---|---|
| A04-PSP-01 资产威胁脆弱性场景评估<br>**国际方法补充｜非中国法定义务；不计国内合规分** | 单位采用PSP方法。记录资产/损失、威胁、脆弱性、现有措施、后果及剩余风险接受人，未知不标零风险。 | 场景台账、方法、接受审批<br>风险/保卫 | [ASISPSP Domain1 Tasks1—5](E:/Documents/neibaoaudit-codex-audit-bundle/.audit-work/a04-sources/asis-psp-bok-2022.pdf)：最佳实践 |
| A04-PSP-02 分层及最薄弱路径<br>**国际方法补充｜非中国法定义务；不计国内合规分** | 单位采用PSP/Sandia方法。逐周界缓冲重要资产核探测/评估、延迟、响应，后门共享/维护通道等薄弱路径独立验证，缺口整改或审批。 | 分层路径及覆盖验证<br>设计/保卫 | [ASISPSP Domain2 Tasks1—2](E:/Documents/neibaoaudit-codex-audit-bundle/.audit-work/a04-sources/asis-psp-bok-2022.pdf)：最佳实践<br>[SANDIA Detection delay response methods](https://www.sandia.gov/cmc/ttd/physical-protection-systems/)：最佳实践 |
| A04-PSP-03 发现后保护延迟与响应匹配<br>**国际方法补充｜非中国法定义务；不计国内合规分** | 批准场景的效能验证。同一有效发现起点，剩余保护时间≥核验+通信+动员+到场+实施处置时间+批准余量；同时验证探测可靠性和响应能力。工程指标由单位批准，无统一法定秒数。<br>**时序是本文工程化建议，不是ASIS考试纲要条文或美国核设施规则直接移植。** | 受控时序、假设不确定性、能力和余量<br>设计/保卫 | [SANDIA Physical protection systems principles](https://www.sandia.gov/cmc/ttd/physical-protection-systems/)：最佳实践 |
| A04-PSP-04 CPTED照明视线及安全通行<br>**国际方法补充｜非中国法定义务；不计国内合规分** | 采用CPTED场地。按用途核昼夜视线照明、自然监视、边界导向维护，兼顾隐私疏散；不臆造纲要统一照度/尺寸。 | 踏勘、批准用途指标、测试与改进<br>设计/设施/保卫 | [ASISPSP Domain2 Task1、Task2 CPTED](E:/Documents/neibaoaudit-codex-audit-bundle/.audit-work/a04-sources/asis-psp-bok-2022.pdf)：最佳实践 |
| A04-PSP-05 故障状态与实际可用性<br>**国际方法补充｜非中国法定义务；不计国内合规分** | 采用PSP生命周期方法。批准断电断网关键故障/人工接管场景；在线率、有效探测、误报、恢复、响应各有分母时窗数据源和目标。 | 故障验证、指标定义实际结果<br>运行/信息/保卫 | [ASISPSP Domain2 Tasks1—2、Domain3 Task5](E:/Documents/neibaoaudit-codex-audit-bundle/.audit-work/a04-sources/asis-psp-bok-2022.pdf)：最佳实践 |
| A04-PSP-06 需求到实装生命周期验收<br>**国际方法补充｜非中国法定义务；不计国内合规分** | 采用PSP采购实施方法。需求关联设计产品位置、验收用例、运维责任和退役，采购前定验收，变更替代批准复验。 | 需求设计资产测试矩阵及变更<br>建设/采购/设计/运行 | [ASISPSP Domain2 Task3、Domain3 Tasks1—5](E:/Documents/neibaoaudit-codex-audit-bundle/.audit-work/a04-sources/asis-psp-bok-2022.pdf)：最佳实践 |

## 4. 一级要求不得被低等级项目覆盖

以下新增/加强项均单独留结论；共用规则只更新等级阈值，不重复计分。二级已经成为“应”的门卫门、安检区、重要部位门禁/内部探测等继续继承，不因本表没重复罗列而删除。

| 原始位置 | 一级新增/加强 | 强度 | 控制 |
|---|---|---|---|
| 6.7.1.1 | 独立治安保卫机构 | 应 | L1-01 |
| 6.7.1.2 | 各周界主要出入口双人24h值守 | 应 | L1-02 |
| 6.7.1.3 | 巡查最大间隔6h | 应 | FRQ-05，同时继承FRQ-06每次两人 |
| 6.7.1.4 | 重要部位楼层值守 | 宜 | L1-03 |
| 6.7.1.5 | 监控中心24h、每班双人 | 应 | L1-04 |
| 6.7.2.1 | 周界≥2.5m、两侧无攀爬借助物 | 应 | BAR-02/04 |
| 6.7.2.2 | 易误侵入位置广播 | 宜 | L1-05 |
| 6.7.2.3 | 重要建筑周边屏障 | 宜 | L1-06 |
| 6.7.3.1 | 重要摄像机GA/T1127—2025 IV数据安全 | 宜 | L1-07；不是等保四级 |
| 6.7.3.2 | 设置安防管理平台 | 应 | L1-08；无平台不可NA |
| 6.7.3.3 | 主出入口人员身份识别 | 应 | L1-09；不指定必须刷脸 |
| 6.7.3.3 | 车底成像等安检 | 宜 | L1-10 |
| 6.7.3.4 | 制高点视频及采用后图像效果 | 设置宜；采用后效果应 | L1-11分子断言 |
| 6.7.3.5(a) / F29 | 重要建筑入口入侵探测，二级宜升级应 | 应 | L1-12 |
| 6.7.3.5(b) / F38 | 重要建筑执勤岗紧急报警 | 应 | L1-13 |
| 6.7.3.5(c) / F28/35 | 建筑入口、重要楼层门禁 | 宜 | L1-14 |
| 6.7.3.5(d) | 多单位共用重要建筑的边界门禁 | 条件应 | L1-15 |
| 6.7.3.6 / F40 | 重要部位入口安检区/手持探测等 | 宜 | L1-16 |
| 6.4.15 / F23 | 重要建筑**周边**入侵探测 | 一级应；其他级别该表为/ | L1-17 |

原始依据：[DB正文PDF14—15页及附录F PDF24—25页](E:/Documents/neibaoaudit-codex-audit-bundle/reference/DB11T2552-2026鍗曚綅鍐呴儴瀹夊叏闃茶寖閫氱敤瑕佹眰.pdf)。一级仍继承二级3‰专职治安保卫管理人员和相关培训/演练要求。人员总数分母、角色范围与兼职/外包计入口径需业务核准；不能把“治安保卫人员”和“保安员”当同一角色。

## 5. 保存期限和频率落地说明

DB855 6.10明确日常维护间隔不超过**三个月**；6.8维护记录保存为**三年或系统使用期**。软件保留两个原文分支及审批，不擅自解释成必须较长者。可由单位选择更严内部保存策略，但需记录其依据、必要性与个人信息保护约束。[DB855 PDF6/印刷3](https://dbba.sacinfo.org.cn/portal/download/23e87a331baf31176115ea55907885f5903c95e7f764c77f963f68b71cc5b333)

对只有“定期/及时”的要求，落成批准计划：任务类型、对象、责任人、周期/触发、下一到期日、完成证据、异常升级。建议的更细安排，例如班前状态确认、月度抽测、年度综合效能评估，必须标成**内部风险管理目标**，不能假称DB/GB法定数值。内部计划变更须留审批与历史，不能事后修改周期消除已逾期事实。

档案目录不等于履行所有记录义务；视频录像不是审核SPA的备份文件；localStorage不是法定安防档案系统。报告应明确“已核验证据索引”及真正存放位置，禁止通过云日志/遥测/错误上报泄露审核信息。

## 6. 外部标准映射与尚未核准的细则

下表的“待拆分”不能显示成完整实现，更不能凭一个“符合相关标准”勾选通过。既有工程的设计施工是否追溯适用，要结合投用/改造日期、工程范围和实施规定专业复核；现行运行维护责任独立审查，不能一律因系统早于2022而NA。

| 标准及核准版本 | 适用与映射状态 | 后续动作 |
|---|---|---|
| [GB 55029—2022 安全防范工程通用规范](https://cgj.dazhou.gov.cn/uploadfile/1/Attachment/4b3cea19d3.pdf)；2022 | 按建设/运行阶段和具体条件。A04核心控制设计；不是全规范已实现证明 | 对全条款建立子控制覆盖，仍未覆盖的细则留可见待办 |
| [GB 17565—2022 防盗安全门通用技术条件](https://openstd.samr.gov.cn/bzgk/std/newGbInfo?hcno=A75C1C66CB989D0A40BFA7A262C93290)；2022注日期 | 指定门卫室对外门；其他门独立依据。≥3级安装要求核准；产品全文细则未取得 | 取得受控全文、产品等级指标和实装一致性证明 |
| [DB11/T 855—2025 安全防范系统运行与维护要求](https://dbba.sacinfo.org.cn/portal/download/23e87a331baf31176115ea55907885f5903c95e7f764c77f963f68b71cc5b333)；2025 | 安全防范系统建设使用运行维护。6.8、6.10等已核准；B/C全文条目仍需逐项控制 | 批准保存分支，按实际资产展开附录B/C，勿只列标准名称 |
| [GB 35114—2017 公共安全视频监控联网信息安全技术要求](https://std.samr.gov.cn/gb/search/gbDetailed?id=71F772D82107D3A7E05397BE0A0AB82A)；2017 | 适用公共安全视频联网信息安全。metadata_verified_detailed_controls_pending | 取得全文，按实际系统拆分认证、密钥/传输等原文要求与测试 |
| [GB 37300—2018 公共安全重点区域视频图像信息采集规范](https://openstd.samr.gov.cn/bzgk/std/newGbInfo?hcno=D232F9374137D1ADB95733694B51F504)；2018 | 适用公共安全重点区域。metadata_verified_detailed_controls_pending | 取得全文，拆部位、采集类别、技术/设备控制 |
| [GB/T 28181—2022 视频联网信息传输交换控制](https://openstd.samr.gov.cn/bzgk/std/std_list?p.p1=0&p.p2=GB%2FT28181-2022&p.p90=circulation_date&p.p91=desc)；2022 | 对应视频联网接口协议。metadata_verified_detailed_controls_pending | 取得全文，拆实际接口与协议用例，不把保留接口等于必须上传 |
| [GB/T 32581—2016 入侵和紧急报警系统技术要求](https://openstd.samr.gov.cn/bzgk/std/std_list?p.p1=0&p.p2=GBT32581&p.p90=circulation_date&p.p91=desc)；2016 | 相应入侵报警系统。metadata_verified_detailed_controls_pending | 取得全文及等级，拆GB55029未覆盖细则 |
| [GB/T 37078—2018 出入口控制系统技术要求](https://openstd.samr.gov.cn/bzgk/std/newGbInfo?hcno=6BC49FE7D57E99B665A9839D881151E3)；2018 | 适用门禁系统。metadata_verified_detailed_controls_pending | 取得全文核分级功能环境及测试 |
| [GA/T 1127—2025 安全防范视频监控摄像机](https://ywtb.mps.gov.cn/gabzh/portal/stdDetail/310039)；2025注日期 | 二级重要摄像机III或以上宜，一级IV宜。metadata_verified_detailed_controls_pending | 核原文等级及产品报告，不用等保替代 |
| [GB 55037—2022 建筑防火通用规范](https://sjw.qingdao.gov.cn/cxjsj3/cxjsj200/cxjsj_hydt2/202305/t20230526_7204041.html)；2022 | 建筑消防疏散按用途工程阶段。metadata_verified_detailed_controls_pending | 消防专业核准原文和防火门/疏散指标；本轮疏散先用GB55029/DB确切条文 |


题录已核对只代表版本/名称状态，不代表技术正文已核准。GB55029核心控制已依据原文设计，**本文件不声称完成GB55029全部细则、其他全部交叉标准及特殊行业标准的无遗漏实现**。全规范还须建立“条款→子控制→范围→证据→用例→代码”覆盖账；没覆盖的要求保留可见待办和负责人。

原文目前还需专业展开的例子包括：GB55029的特殊环境勘察/施工、反恐重点目标条件选型、楼寓对讲各功能、全部保护部位/目标的配置性能；DB855附录B/C按真实资产的全部运维检查；GB35114、GB37300、GB17565产品细则和GA/T1127等级细则。不得以本清单已有118项抵消这些未完成事项。

### 6.1 国际方法如何转成验收

ASIS纲要提出CPTED、纵深防护、4Ds（威慑、探测、延迟、拒止）、功能/性能需求和生命周期评估。结合Sandia探测—延迟—响应方法，把“有围栏/有摄像头”升级为：风险场景是否被及时发现，是否可可靠判断，发现后是否留下足够响应时间，以及执行人员是否有实际处置能力。[ASIS](https://www.asisonline.org/globalassets/certification/documents/physical-security-professional----bok.pdf)、[Sandia](https://www.sandia.gov/cmc/ttd/physical-protection-systems/)

本文工程化时序建议为：

> 同一有效发现起点：剩余保护时间 ≥ 核验时间 + 通信时间 + 动员时间 + 到场时间 + 实施处置时间 + 批准余量。

这不是法定公式，也不单独证明体系有效。延迟30秒、总响应45秒即使围栏高度达标，仍存在响应前失守的效能缺口；探测前延迟不能重复加到发现后时间。实际目标、余量、探测可靠性、误报及响应能力由单位风险设计批准。受控验证不进行未经授权的穿透破坏或制造人身危险。

## 7. 给Manus的实施任务和完成条件

### 7.1 当前缺口对应代码位置

| 位置 | 改动任务 |
|---|---|
| [facilityMatrix.ts:49](E:/Documents/neibaoaudit-codex-audit-bundle/client/src/data/facilityMatrix.ts:49) | KF-01关联高度/连续性/攀爬子控制；按等级覆盖阈值，父项不双计 |
| [facilityMatrix.ts:67](E:/Documents/neibaoaudit-codex-audit-bundle/client/src/data/facilityMatrix.ts:67) | KF-19限定二/一级门卫室对外门，增加GB2022等级和实装证据 |
| [facilityMatrix.ts:116](E:/Documents/neibaoaudit-codex-audit-bundle/client/src/data/facilityMatrix.ts:116) | ST-01等通用组拆GB55029具体适用控制，保存外部标准未覆盖账 |
| [facilityMatrix.ts:122](E:/Documents/neibaoaudit-codex-audit-bundle/client/src/data/facilityMatrix.ts:122) | 一级平台“必须设置”与8.7功能子项分开，无平台不可NA |
| [criteria.ts:52](E:/Documents/neibaoaudit-codex-audit-bundle/client/src/data/criteria.ts:52) | R-03一般档案对所有单位适用，重点档案逐类增强 |
| [criteria.ts:63](E:/Documents/neibaoaudit-codex-audit-bundle/client/src/data/criteria.ts:63) | I-01由笼统频次改明确周期/触发及证据；15日仅相应事件 |
| [detailedMatrix.ts:23](E:/Documents/neibaoaudit-codex-audit-bundle/client/src/data/detailedMatrix.ts:23) | 视频隐私与涉密邻接同意分别触发，不依赖仅本单位secret标志 |
| [scoring.ts:12](E:/Documents/neibaoaudit-codex-audit-bundle/client/src/lib/scoring.ts:12) | 适用依据逐条条件化；未定级最低、权重版本、父子去重、四口径隔离 |
| [reportExport.ts:64](E:/Documents/neibaoaudit-codex-audit-bundle/client/src/lib/reportExport.ts:64) | 屏幕/Word/Excel/JSON共同报告模型，新增字段完整保留；覆盖原A09/A10缺口 |

行号是本地审计基线中的位置，不承诺未来修改后的行号仍相同。先复核Manus使用的代码提交/文件内容再实施。

### 7.2 数据字段与迁移

每个控制及每个适用对象至少具备：ID/旧项关联、模块、对象和点位、控制版本、来源/条款/版本/实施时点、应宜/法律强度、口径、**各依据自己的适用条件与排除**、阈值及单位、子断言、最低证据、责任部门、判定、待复核原因、NA依据、整改责任/期限来源/措施/状态、复核证据/人/日期。

不能只要某控制存在一个现行或法律来源，就把其所有内容都变成现行法定义务。先算每个来源的有效适用，再形成对应义务和结论；第799号令第9条例外与DB/GB独立依据必须能分别展示。

新建控制集版本及答案版本。原“有屏障/有门/有制度”答案在新增高度/等级/记录未核验前标需重新复核，不自动迁成符合；保留旧原始答案和历史快照。画像变更重算适用性，隐藏答案保存历史但不贡献当前分数/分母。撤销NA、重新打开整改均可追踪。

JSON导入检查新字段类型/范围/单位、已知ID、长度和文件大小，拒绝危险原型键；不要因扩展标准或字段破坏已有只读审计中的安全边界。实现自然语言适用条件不能使用eval。保存失败应明确告知，不能显示已保存。

### 7.3 报告和文件导出

屏幕、Word、Excel与JSON共享报告行：条款、来源版本、模块、口径、强度、对象位置、适用理由、结论、实测/阈值、证据索引、NA/复核原因、整改责任/措施/期限/状态、复核和关闭信息。Excel可用独立列/子表，Word可用逐项卡片；均不能丢字段。

报告摘要包括控制集版本、画像及等级认定、已审/未审/范围待定数、适用分母及变化、独立硬性缺口、建议改进、专家待确认事项。单位未定级、缺关键必需控制或范围未核准时，不把100%表述为完整合规证明。ASIS和前瞻单列，不修改现行基线。

### 7.4 必须新增的自动化测试

以下是实施方须新增的测试规格；本次只完成文档/目录校验，**未把这些测试写进或运行于项目源码**。

| 测试ID | 条件/动作 | 预期 |
|---|---|---|
| A04-T01 | 非重点画像、全部特殊标签false | KU-00保留；一般工作档案可见；无重点高度强制 |
| A04-T02 | 已确认重点、等级未定 | 三级最低控制可见；等级待定原因在四种报告/导出保留 |
| A04-T03 | 三级→二级→一级 | 应满足义务逐级递进；建议升应准确；无独立access/defense |
| A04-T04 | 屏障1.999/2.0/2.4/2.499/2.5m | 按等级比较，不提前舍入；最低段决定高度结论 |
| A04-T05 | 一段缺口/一级内侧有攀爬物 | 相关子控制失败，不被其他段高度通过覆盖 |
| A04-T06 | 二级进气口2.499/2.5m | 前者触发隔离，后者本款不触发 |
| A04-T07 | 指定门2022版1/2/3/4/5级、旧甲级 | 1/2失败3/4/5满足等级；旧版待专业核验 |
| A04-T08 | 三级普通办公室门/二级门卫室外门 | 不混范围；不把门卫3级套所有门 |
| A04-T09 | 一级无平台、用户选NA | 保留缺口，拒绝用未安装作为NA |
| A04-T10 | 一级仅有重要建筑入口探测 | F23周边控制仍缺；内部/入口不能代周边 |
| A04-T11 | 一级单人值机夜班或仅白天门双人 | 对应人数/24h控制失败，低级项目不覆盖 |
| A04-T12 | 未采用一级宜项 | 进入建议，不擅自按强制关键项降风险 |
| A04-T13 | 一般只有制度档案无检查资料 | 档案与实施记录分别给缺口 |
| A04-T14 | 报警89/90d、门禁179/180d、视频29/30d | 按对象边界判断；全部类别核验 |
| A04-T15 | 六个月涉及181—184日等区间 | 按日历月；不能固定180日代网络日志 |
| A04-T16 | DB855维护季度各一次但间隔超三个月 | 不符合间隔；非简单季度计数 |
| A04-T17 | DB855记录保存分支未批准 | 待专家，不把或静默改且/较长者 |
| A04-T18 | 三级24h、二级12h、一级6h，各超1s | 等界通过，超界失败，含末次至审核时 |
| A04-T19 | 每年次数凑齐但半年/季度有空期 | 对应完成期间失败；进行中未逾期不误报 |
| A04-T20 | 9.3c变更第15/16日完成，其他变更 | c项界值分别通过/逾期；其他事件不自动15日 |
| A04-T21 | 公共视频第7条、第9条、非公共、未知 | 来源逐条路由；第9条不套被排除义务但独立法律/DB/GB仍审 |
| A04-T22 | 本单位非涉密、相邻涉密 | 事先相关单位同意触发，不以个人同意替代 |
| A04-T23 | 禁采房间有个人同意 | 不能通过；提示/同意/禁区控制独立 |
| A04-T24 | 普通视频 vs 真正人脸算法；一级证卡识别 | 正确触发；非人脸身份方案不扣未刷脸 |
| A04-T25 | 人脸99999/100000人；30工作日 | 按人数与工作日边界，不用模板数量和自然日替代 |
| A04-T26 | 报警响应2/2.001s、备电7.99/8h | 按GB具体指标判，非保安到场SLA |
| A04-T27 | 断电开启门禁47.99/48h；断电闭锁 | 条件适用准确；仍独立测试紧急疏散 |
| A04-T28 | 试运行29/30d、录像保存30d | 试运行独立，不用录像存储证据代替 |
| A04-T29 | key=false、GB高风险=true | 高风险工程条件仍生效 |
| A04-T30 | 一个控制多来源且仅部分适用 | 不用“有一个法律来源”把所有要求一律强制 |
| A04-T31 | 父/子均有答、多个同类资产 | 不双计分母，单点缺口仍显示 |
| A04-T32 | 开关实践/前瞻，画像变更及旧答案迁移 | 现行基线不受实践/前瞻影响；隐藏不计；新增内容待复核 |
| A04-T33 | 权限拒绝、日志取回、新系统历史未成熟 | 权限和完整性实测分别保留；不虚造历史 |
| A04-T34 | 更新整改→待复核→关闭→重开 | 证据与历史留存；关闭不自动改符合 |
| A04-T35 | 使用中文长文本及多来源/子项做屏幕、真实Word/Excel/JSON导出 | 逐字段一致，全部复核原因/整改/强度不丢失 |
| A04-T36 | 导入负高度、错误单位、危险键、超大文件 | 验证拒绝并给可理解错误，不污染原型/覆盖有效档案 |
| A04-T37 | 静态生产运行整个流程 | 无审核数据网络上传；localStorage失败有明确提示 |
| A04-T38 | 标准仅题录/细则待办 | 不显示完整映射/已合规；专家待核事项导出保留 |

执行顺序：先修适用性与分级/口径，再迁移子控制和答案，再统一整改与报告，最后运行上述新增测试及原check/test/build:static。任一步未完成不得把A04标已修复。118项需求目录不是“118项控制已在软件实现”的证明。

## 8. 原始来源与复核事项

- **DB2552**：[DB11/T 2552—2026 单位内部安全防范通用要求](https://std.samr.gov.cn/db/search/stdDBDetailed?id=5A032B884C1C403EE06397BE0A0A9B90)。推荐性地方标准；用户原件相关正文、附录D/F已核对。2026-10-01实施；标准内应/宜分别保留，不统一称法定义务。 [本地原件](E:/Documents/neibaoaudit-codex-audit-bundle/reference/DB11T2552-2026鍗曚綅鍐呴儴瀹夊叏闃茶寖閫氱敤瑕佹眰.pdf)；SHA-256：d5f3e571f5d2675d47f97bf6bf82359306f5c7f38b71eb3d731b9ec77ff9a565。
- **GB55029**：[GB 55029—2022 安全防范工程通用规范](https://cgj.dazhou.gov.cn/uploadfile/1/Attachment/4b3cea19d3.pdf)。强制性工程建设规范；政府转载公告及原文；PDF第6—18页逐页目视核对。2022-10-01实施；全部条文强制，工程阶段和条款条件分别适用。 [本地原件](E:/Documents/neibaoaudit-codex-audit-bundle/.audit-work/a04-sources/gb55029-notice-government.pdf)；SHA-256：159e3eb0a798440b54302070e4f4d7acd95b329590035f7a87432974dd8c69fb。
- **GB17565**：[GB 17565—2022 防盗安全门通用技术条件](https://openstd.samr.gov.cn/bzgk/std/newGbInfo?hcno=A75C1C66CB989D0A40BFA7A262C93290)。强制性产品标准；现行题录、替代2007版及2024-01-01实施已核对；全文未取得。≥3级由DB原文确定；不推断厚度/防破坏时间全部细则。
- **DOORGRADES**：[北京市市场监管局防盗门等级说明](https://scjgj.beijing.gov.cn/zwxx/gs/202512/t20251231_4381843.html)。监管部门说明；官方正文已核对。2022版1级最低5级最高；旧甲乙丙丁不能无依据自动换算。
- **DB855**：[DB11/T 855—2025 安全防范系统运行与维护要求](https://dbba.sacinfo.org.cn/portal/download/23e87a331baf31176115ea55907885f5903c95e7f764c77f963f68b71cc5b333)。推荐性地方标准；国家备案平台原始PDF全文提取，第5—6页目视核对。原件2025-06-24发布2025-10-01实施；6.8的或不可擅自改成且/较长者。 [本地原件](E:/Documents/neibaoaudit-codex-audit-bundle/.audit-work/a04-sources/db855-official.pdf)；SHA-256：cac4cbec5a9c88f189da441b6303b8d0c5f848108ec6b0ad0306726755c1ed3c。
- **VIDEO799**：[公共安全视频图像信息系统管理条例 国务院令799号](https://www.mee.gov.cn/zcwj/gwywj/202502/t20250211_1102044.shtml)。行政法规；官方全文已核对。2025-04-01施行；第9条场所排除第11/14/15/16第二款/17条强制要求，独立法律标准另判。
- **PIPL**：[中华人民共和国个人信息保护法](https://www.cac.gov.cn/2021-08/20/c_1631050028355286.htm)。法律；官方全文已核对。处理依据、提示、个人同意、单独同意、单位授权分开；影响评估资料三年并非视频三年。
- **FACE2025**：[人脸识别技术应用安全管理办法](https://www.cac.gov.cn/2025-03/21/c_1744174262156096.htm)。部门规章；官方全文已核对。2025-06-01施行；身份识别不等于必须人脸识别。
- **CSL2026**：[中华人民共和国网络安全法 2025修正2026施行文本](https://sdca.miit.gov.cn/zwgk/fgbz/art/2026/art_4815dd4ec11d454783b83a91502a3cc7.html)。法律；工信部门修正后全文已核对。现行第23条第3项相关网络日志至少六个月；不是旧第21条或固定180日。
- **ASISPSP**：[ASIS PSP Body of Knowledge updated 2022](https://www.asisonline.org/globalassets/certification/documents/physical-security-professional----bok.pdf)。国际方法参考；ASIS官方公开知识纲要全文已核对。评估、设计、实施、生命周期方法；不产生中国法定义务或通用尺寸/频率。 [本地原件](E:/Documents/neibaoaudit-codex-audit-bundle/.audit-work/a04-sources/asis-psp-bok-2022.pdf)；SHA-256：8114be4aefe4b271e025355fc8a796e339df221a4ff50c0f5e1a97feba3300ef。
- **SANDIA**：[Sandia Physical Protection Systems](https://www.sandia.gov/cmc/ttd/physical-protection-systems/)。国际科学方法参考；实验室官方方法说明已核对。探测、延迟、响应的系统工程方法；本文时序表达为工程化建议。
- **GB35114**：[GB 35114—2017 公共安全视频监控联网信息安全技术要求](https://std.samr.gov.cn/gb/search/gbDetailed?id=71F772D82107D3A7E05397BE0A0AB82A)。强制性标准题录；官方题录现行、2024复审继续有效；本轮未逐条核验全文。需业务/法律专家复核详细适用与细则。
- **GB37300**：[GB 37300—2018 公共安全重点区域视频图像信息采集规范](https://openstd.samr.gov.cn/bzgk/std/newGbInfo?hcno=D232F9374137D1ADB95733694B51F504)。强制性标准题录；官方题录现行；本轮未逐条核验全文。需业务/法律专家复核详细适用与细则。
- **GBT28181**：[GB/T 28181—2022 视频联网信息传输交换控制](https://openstd.samr.gov.cn/bzgk/std/std_list?p.p1=0&p.p2=GB%2FT28181-2022&p.p90=circulation_date&p.p91=desc)。推荐性国家标准题录；官方题录现行、2023-07-01实施；全文未逐条核验。需业务/法律专家复核详细适用与细则。
- **GBT32581**：[GB/T 32581—2016 入侵和紧急报警系统技术要求](https://openstd.samr.gov.cn/bzgk/std/std_list?p.p1=0&p.p2=GBT32581&p.p90=circulation_date&p.p91=desc)。推荐性国家标准题录；官方题录现行；全文未逐条核验。需业务/法律专家复核详细适用与细则。
- **GBT37078**：[GB/T 37078—2018 出入口控制系统技术要求](https://openstd.samr.gov.cn/bzgk/std/newGbInfo?hcno=6BC49FE7D57E99B665A9839D881151E3)。推荐性国家标准题录；官方题录现行；全文未逐条核验。需业务/法律专家复核详细适用与细则。
- **GAT1127**：[GA/T 1127—2025 安全防范视频监控摄像机](https://ywtb.mps.gov.cn/gabzh/portal/stdDetail/310039)。推荐性行业标准题录；官方题录2025-10-13发布2026-02-01实施现行；全文未取得。需业务/法律专家复核详细适用与细则。
- **GB55037**：[GB 55037—2022 建筑防火通用规范](https://sjw.qingdao.gov.cn/cxjsj3/cxjsj200/cxjsj_hydt2/202305/t20230526_7204041.html)。强制性工程规范实施信息；政府2023-06-01实施信息；全文映射本轮未完成。需业务/法律专家复核详细适用与细则。

需要业务/法律/专业人员核准：重点资格与等级、GB高风险与工程阶段范围、DB采用约束、表F与正文衔接的特殊例外、实体高度现场测法及特殊行业门指标、DB855保存分支/起算、公共场所第7/9条分类、敏感个人信息同意与其他依据关系、网络运营者与日志范围、15日计时口径、权重风险策略，以及尚未取得全文的外部标准细则。

本次仅新增需求文档、目录和审计工作资料，没有改变原项目代码/锁文件或先前审计报告。校验结果见[文档与原文件完整性检查](E:/Documents/neibaoaudit-codex-audit-bundle/.audit-work/a04-qa.json)。

## 9. 中国合规主线与补充要求的产品标注（业务口径修订）

本节按用户最新明确要求更新：本项目是**中国国内法律、法规、标准为基础的合规安保审计**。国外知识仅补充已核准国内条款不足够具体的现场检查、效能验证和证据方法。不得以“ASIS要求”新增未标注的国内必达条件，也不建立与中国合规主线并列的外国合规认证。

### 9.1 补充控制如何进入工具

每个国际方法补充项先列国内关联条款、现有控制ID、具体补充原因和是否已有适用的国内行业/项目细则。若中国适用细则已给指标，优先按国内细则核验；不得凭“国际更严格”覆盖中国口径。本文六项PSP/科学方法已在JSON补充domesticAnchors、supplementOf、supplementReason。

国内依据只说明原则而未直接给出统一数值时，补充方法中的测试场景、目标、余量、采样和周期由单位专业人员批准，明确其“方法/单位内控”性质。**同一关联关系不使国外来源成为中国法定义务**。国际方法可以帮助发现国内控制的证据缺口，但“未达到国外补充目标”本身不能自动改为国内法规或标准不符合；国内结论须另有适用的国内依据和证据。

### 9.2 成品网站和导出中的持续标注

| 来源性质 | 必须展示的标签 | 分数与结论口径 |
|---|---|---|
| 国内法律/行政法规/规章 | 中国法规依据＋具体名称/条款 | 按适用义务核查 |
| 国内标准 | 中国标准依据＋强制/推荐性＋条文应/宜 | 按国内标准及采用范围核查，不能都称法定 |
| ASIS PSP、Sandia等国外方法 | **国际方法补充｜非中国法定义务** | **不计入国内合规分**，进入补充观察/效能改进 |
| 单位自行采用的目标、频率、SLA | **单位内控/合同约定｜非统一法定要求** | 单列内控结果与批准依据，不冒称全国法定要求 |
| 本文工程化核验建议 | **核验方法建议｜非独立法规义务** | 说明服务于何国内条款；额外目标不混进国内必达阈值 |

标签须出现在审核题目附近、详情、筛选、整改列表、屏幕报告、Word、Excel和JSON。不能仅藏在帮助页面或文末免责声明。用文字图标与颜色共同区分，不仅依赖颜色；收起/移动端/打印状态仍能识别。

补充项详情至少显示：关联国内依据、国际来源及版本、补充目的、核验方法、单位批准的目标、是否内部采用、整改建议。整改项标题及每条导出行保留来源类型；Excel单独列，Word每条标签，JSON保留originCategory、uiBadge、contributesToDomesticScore和domesticAnchors。

默认界面以国内合规任务为主。补充项可通过“显示补充核验”展开，但隐藏/显示不改国内分数、分母、国内关键项计数或国内合规风险结论。未做国际补充不能标“未完成中国合规审核”。发现重大实际效能风险可醒目单列“补充方法发现的效能风险”，其性质与国内法定/标准缺口区别清楚，不因不计国内分而丢弃问题。

原JSON的external_current指**DB基线之外的国内现行依据**，不是国外要求；成品不使用含混“外部要求”标签代替来源分类。practice为补充方法，forward为征求意见前瞻，两者均不得影响国内现行基线。

### 9.3 新增验收测试

| 测试ID | 条件/动作 | 预期 |
|---|---|---|
| A04-T39 | 展示六项国外方法、收起/移动端/打印 | 每项保持“国际方法补充｜非中国法定义务”，关联国内依据与不计分说明可见 |
| A04-T40 | 补充项符合→不符合→未审；显示/隐藏切换 | 国内得分、分母、关键项与国内合规风险结论全部不变；补充问题单独留存 |
| A04-T41 | 同一国内屏障项关联国际时序目标；仅额外目标未达 | 不能自动把国内屏障高度判不符合；按国内独立证据给国内结论，效能风险另列 |
| A04-T42 | 补充问题进入整改并导出Word/Excel/JSON及屏幕报告 | 来源标签、国内关联、内部采用依据及不计分字段完整；不冒称现行法定义务 |

以上标注是必须实现的产品要求。本次更新了需求文档和目录，**尚未修改成品网站源码**，实施方须按这四组测试验收。
