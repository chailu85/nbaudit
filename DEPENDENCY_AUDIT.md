# 生产依赖审计记录

**日期**：2026-10-03  
**范围**：`pnpm audit --prod --json`，以及静态构建产物 `dist/public/`。

## 当前部署边界

本项目已配置为**静态、local-first 审核工具**：审核档案只保存在浏览器本地存储，可由用户主动导入/导出 JSON，页面加载不会创建浏览器端 tRPC/React Query 客户端，也不会发起后台 API 请求。

本轮已移除：

- 浏览器入口中的 `@trpc/*`、`@tanstack/react-query`、`superjson` 运行时初始化；
- 默认调试采集器、`/__manus__/logs` 端点和静态 `debug-collector.js` 资产。

静态产物仍使用的核心浏览器依赖为 React、Lucide、DOCX 与 XLSX；其中 DOCX/XLSX 仅在用户主动点击导出按钮后动态加载。

## 审计结果与风险处置

`pnpm audit --prod` 当前仍返回告警。这主要因为模板遗留的服务端、数据库、认证和 UI 依赖仍被列在 `dependencies` 中，尽管静态发布产物和浏览器入口均不引用它们。**这些告警不能据此表述为“当前静态站点可被利用的漏洞”。**

| 分类 | 当前结论 | 处置 |
|---|---|---|
| 静态产物未引用的模板服务端依赖（tRPC、Express、Drizzle、Axios、AWS SDK 等） | 不在浏览器静态产物路径；包清单仍会使 `pnpm audit --prod` 报告它们 | 后续可在弃用完整服务端/动态发布脚本后，将其改为开发依赖或删除；删除前需确认不再需要 `pnpm build` 的服务端输出。 |
| `xlsx` | 属于用户主动导出 Excel 的浏览器功能，审计有上游 SheetJS 历史告警 | 已实施严格 JSON 导入边界；Excel 仅从本机结构化审核状态生成，不解析用户上传的 Excel。建议在兼容替代库完成导出格式回归后再迁移。 |
| `docx` | 用户主动导出 Word 的浏览器功能 | 继续跟踪上游安全公告；未发现项目读取外部 DOCX 的功能。 |

## 发布前复核命令

```bash
pnpm check
pnpm test
pnpm build:static
pnpm audit --prod --json
find dist/public -type f | sort
```

审计命令的非零退出代表**依赖生态告警需要治理**，并不自动证明静态产物存在可利用路径；发布决策须同时核对实际产物、数据流和可达接口。
