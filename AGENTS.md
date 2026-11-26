# AGENTS.md

本文件是食岛项目的强制规则，优先级高于任何默认行为。

## 先读什么

- 文档索引：[`docs/README.md`](docs/README.md)
- 动代码前：[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)（架构、模块边界、目录）
- 动 UI 前：[`docs/DESIGN.md`](docs/DESIGN.md) + [`参考/animal-island-ui/AI_USAGE.md`](参考/animal-island-ui/AI_USAGE.md)
- `animal-island-ui` 的 props 只能照 `AI_USAGE.md` 写，不要发明

## 项目边界

- 只做「饮食热量记录」：拍一张 / 打一句 / 点一下
- 不做健身训练、社交、云同步、账号体系
- 单用户、离线优先、数据全在本地
- 定位是「大致参考」，不是精确营养分析

## 代码规范

- 一律 TypeScript，不用 `any`（必要时 `unknown` + 类型守卫）
- 组件用函数式 + hooks；不要 class component
- 跨页面状态用 Zustand，页面内用 `useState`；不要把表单状态塞进全局 store
- 数据访问只走 `src/data/` 的 DAO，页面不直接 `db.xxx`（除 watch 订阅）
- 样式用单文件 CSS，类名 BEM 风格；不使用 Tailwind
- 颜色/圆角/阴影只能来自 `src/styles/tokens.css`，禁止裸色值
- 中文文案先进 `i18n`，不写死在 JSX 里

## 禁止事项

1. 不引入第二套 UI 库（MUI / Ant Design / shadcn / Tailwind UI），风格会崩
2. 不改 `参考/` 下任何文件，也不要把它纳入 git
3. 不覆盖库自带的 3D 底部投影（`box-shadow: 0 Npx 0 0 #bdaea0`）
4. 不做暗色模式
5. 营养数值优先查本地成分表；本地查不到的组成才用 AI 的每 100 g 估算，且必须标 `source: 'ai'`；AI 永远不能直接给整餐总量
6. 不把图片存进 IndexedDB，只存路径
7. 不用 `100vh`，用 `100dvh` / `env(safe-area-inset-*)`
8. 不用 emoji 当图标，用 `Icon` 组件或自绘 SVG
9. 不写「为了以后扩展」的空抽象，自用项目先跑通

## 工作方式

- 先读代码和文档再改；不确定就停下来问，不要猜
- 大改分阶段提交，保证可以单独回退
- 改完至少跑 `npm run typecheck`；涉及检索/计算/识别时跑 `npm run verify`
- 不提交生成物与本地文件：`src/assets/foods.json`、`src/assets/dishes.json`、`.claude_temp/`、`.claude_dist/`、APK、keystore、`参考/`
- 文档里的路径、命令、字段必须能在当前仓库里找到对应实现

## 测试方式

- 浏览器与真机交互由人工验收，不引入 Playwright / Cypress
- 验收清单见 [`docs/TESTING.md`](docs/TESTING.md)
- 一次只给一个测试项：操作步骤、预期结果、需要提供的截图或日志
