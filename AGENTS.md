# AGENTS.md

> 本文件由 opencode 自动加载。开工前先读完 `docs/` 下三份文档，再动手写代码。

## 项目是什么

**食岛（Food Island）** —— 一个只做「饮食热量记录」的 Android 个人工具。

- 一次记录 = 拍一张照片 / 打一句话 / 点一下历史记录
- 不做：健身训练、社交、云同步、账号体系、本地大模型
- 单用户、离线优先、数据全在本地
- 定位是「大致参考」，不是「精确营养分析」

## 必读顺序（不要跳）

| 顺序 | 文件 | 作用 |
| --- | --- | --- |
| 1 | `docs/01-技术文档.md` | 架构、数据层、AI 集成、里程碑。**动代码前必读** |
| 2 | `docs/02-设计系统.md` | 动森风格规范、组件映射、自建组件清单。**动 UI 前必读** |
| 3 | `参考/animal-island-ui/AI_USAGE.md` | 组件 API 手册，只能照这里写 props |

## 技术栈（已锁定，不要替换）

```
Vite 8 + React 19 + TypeScript
Capacitor 8（Android only）
Zustand            状态
Dexie              本地库（IndexedDB）
react-router-dom   HashRouter
pinyin-pro         中文检索
dayjs              日期
i18next            中/英文
animal-island-ui   动森风格组件库
```

## 命令

```bash
npm install
npm run dev                    # 浏览器调试（大多数 UI 在这里调）
npm run build
npx cap sync android
npx cap run android            # 装到手机
npx cap open android           # 打开 Android Studio

npm run data:build             # data-src/*.csv → src/assets/foods.json
```

## 目录约定

```
src/
├── app/            路由与外壳
├── pages/          页面（每个页面一个目录）
├── components/     自建组件（动森风格缺口组件放这里）
├── features/       业务逻辑（按领域分，不放 UI）
├── data/           Dexie schema、DAO、foods.json 索引
├── services/       AI、图片、导出
├── styles/         tokens.css + 全局样式
├── assets/         foods.json 等静态数据
└── i18n/           语言包
```

## 代码规范

- 一律 TypeScript，不用 `any`（必要时 `unknown` + 类型守卫）
- 组件用函数式 + hooks；不要 class component
- 状态：跨页面用 Zustand，页面内用 `useState`；**不要把表单状态塞进全局 store**
- 数据访问只走 `src/data/` 的 DAO，页面不直接 `db.xxx`（除 watch 订阅）
- 样式：CSS Modules 或单文件 CSS，类名用 BEM 风格；**不使用 Tailwind**（参考库是 Less，混用会打架）
- 颜色/圆角/阴影只能来自 `src/styles/tokens.css`，禁止写裸色值
- 中文文案先进 `i18n`，不写死在 JSX 里

## 禁止事项

1. **不要引入第二套 UI 库**（MUI / Ant Design / shadcn / Tailwind UI 都不行），风格会崩
2. **不要改 `参考/` 下任何文件**，它是只读参考；也不要把它纳入 git
3. **不要给 `animal-island-ui` 组件发明 props**，只能用 `参考/animal-island-ui/AI_USAGE.md` 里列出的
4. **不要覆盖库自带的 3D 底部投影**（`box-shadow: 0 Npx 0 0 #bdaea0`），那是它的识别度
5. **不要做暗色模式**（v1 不做）
6. **不要让 AI 返回营养数值**，营养一律从本地成分表查（见技术文档 §5.1）
7. **不要把图片存进 IndexedDB**，只存路径（见技术文档 §5.4）
8. **不要用 `100vh`**，用 `100dvh` / `env(safe-area-inset-*)`
9. **不要用 emoji 当图标**，用 `Icon` 组件或自绘 SVG
10. **不要写"为了以后扩展"的空抽象**，自用项目，先跑通再说

## 当前进度

```
[x] 技术选型
[x] 数据源评估（1677 条中国食物成分表）
[x] 交互与估算逻辑设计（无实测模式）
[x] 设计系统规范
[x] 脚手架：Vite 8 + React 19 + TS + 动森令牌 + Shell/BottomNav/Fab
[x] P1 数据层：CSV → foods.json + 检索索引（1677 条，验收通过）
[x] P2 记录层：手录 + 每日汇总 + 导出 CSV（验收通过）
[ ] P3 记忆层：一键复用 + 修正回写
[ ] P4 解析层：文字 → 克数
[ ] P5 AI 层：拍照识别 + 档位判断
```

开工前先确认当前在哪个阶段，不要跳到后面去做。
