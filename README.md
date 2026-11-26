# 食岛 · Food Island

> 拍一张 / 打一句 / 点一下 —— 记下这一餐。

一个只做「饮食热量记录」的 Android 应用，动森风格。照片交给 AI 拆成原料和调料，营养数值查本地成分表，数据全部留在本机。

- 仓库：<https://github.com/beijiushare/food_island>
- 平台：Android 7.0+（minSdk 24），包名 `top.beijiu.foodisland`

## 特性

- **拍照即建档**：按下快门就先存记录和照片，识别失败也不会丢；可以随时重试
- **AI 只拆组成**：一道菜拆成基础原料 + 调料（番茄炒蛋 → 番茄 / 鸡蛋 / 油 / 盐 / 糖 / 酱油），量由 AI 估
- **本地优先算营养**：每个组成先查本地成分表（1686 条），查不到才用 AI 的每 100 g 估值，总量由本地乘加
- **菜谱库**：152 道常见菜按「每 100 g 配料比例」内置，搜索即可直接记整道菜
- **最近吃过**：按吃过次数排序，份量沿用上次
- **离线可用**：除 AI 识别外，其余功能不依赖网络
- **数据自持**：IndexedDB + 私有目录，支持导出 CSV
- **中英双语**：可切换语言，文案键有对齐检查
- **检查更新**：从 GitHub Releases 比较版本，打开浏览器下载

## 录入流程

```
+ → 输入（拍照 / 一句话）  搜索（成分表 + 菜谱）  最近（吃过次数）
        │                        │                    │
        └────────────┬───────────┴────────────────────┘
                     ▼
                  结果卡：改名字 / 克数 / 营养 / 日期 / 餐次 / 照片
                     ▼
                   保存 → 今天页
```

## 技术栈

```
Vite 8 · React 19 · TypeScript
Capacitor 8（Android）
Zustand · Dexie · react-router-dom
pinyin-pro · dayjs · i18next
animal-island-ui
```

## 快速开始

```bash
npm install

# 由 data-src 生成数据文件（生成物不入库，必须先跑）
npm run data:build        # CSV → src/assets/foods.json + dishes.json

npm run dev               # 浏览器调试（http://localhost:5199）
npm run build             # 产出 dist/
```

Android：

```bash
npx cap sync android
npx cap run android       # 安装到手机
npx cap open android      # 打开 Android Studio
```

### 检查

```bash
npm run typecheck         # 类型检查
npm run check:i18n        # 中英文案键与占位符对齐
npm run verify            # 纯逻辑回归：检索 / 解析 / 计算 / 统计 / AI 校验 / CSV / 菜谱
```

### 发布

```bash
npm run release -- 1.1.0                 # 改版本号 → 构建 → 打包 → 上传 GitHub Release
npm run release -- 1.1.0 --skip-publish  # 只出包，不上传
```

- `versionCode = major*10000 + minor*100 + patch`，不需要手改
- 上传需要安装 [GitHub CLI](https://cli.github.com/) 并 `gh auth login`
- APK 归档到 `.claude_dist/apk/`，App 的「我的 → 检查更新」读 Release 的 latest

## 项目结构

```
src/
├── app/            路由、外壳、Android 返回键
├── pages/          页面（today / add / stats / me）
│   └── add/        录入流程：菜单 / 输入 / 搜索 / 最近 / 结果卡
├── components/     自建组件（Stepper / ListItem / CalorieRing …）
├── features/
│   ├── ai/         提示词、解析、本地查表
│   ├── entry/      草稿 store、拍照后补完识别
│   ├── diary/      计算、日期、CSV
│   ├── memory/     最近吃过
│   └── stats/      统计聚合
├── data/           Dexie schema、DAO、成分表与菜谱索引
├── services/       AI 客户端、图片管线、导出、安全存储
├── styles/         设计令牌
└── i18n/           zh / en
data-src/           成分表与菜谱的原始数据（构建输入）
scripts/            数据构建、图标生成、校验
android/            Capacitor Android 工程
```

## 数据与口径

- 营养数据：能量、蛋白质、脂肪、碳水、膳食纤维、钠、钙、铁、维生素 C、胆固醇，全部是**每 100 g 可食部**
- 成分表：1686 条（1677 条食材 + 9 条调味品），本地检索，支持拼音与别名
- 菜谱：152 道，存的是「每 100 g 成品中各配料占多少克」，记录时默认按一份的克数起手，可改
- 带骨带壳的食物可以按「可食部」或「整重」计算
- AI 不返回整餐总量；组成查不到本地表时才用 AI 的每 100 g 估算，并在界面上标注来源

## 已知限制

- 营养数值是估算，不用于医疗或临床决策
- AI 识别需要自备 API Key（OpenAI 兼容接口），没有 Key 时只能用搜索和最近
- 菜品份量按公开菜谱折算，和家常做法会有差异

## 致谢

**数据**

- 《中国食物成分表 标准版（第 6 版）》— 中国疾病预防控制中心营养与健康所
- [china-food-composition-data](https://github.com/Sanotsu/china-food-composition-data) — 成分表的数字化整理
- [NutritionCalculatorOfHOC](https://github.com/Sibuxiangx/NutritionCalculatorOfHOC) — 调料数值与菜品配方比例（MIT）
- [CookLikeHOC](https://github.com/Gar-b-age/CookLikeHOC) — 菜品配方来源

**代码与参考**

- [animal-island-ui](https://github.com/guokaigdg/animal-island-ui) — 动森风格组件库（MIT）
- 技术栈：[Vite](https://vite.dev) · [React](https://react.dev/) · [Capacitor](https://capacitorjs.com) · [Dexie](https://dexie.org) · [Zustand](https://github.com/pmndrs/zustand) · [i18next](https://www.i18next.com) · [pinyin-pro](https://pinyin-pro.cn) · [dayjs](https://day.js.org)
- [Fud AI](https://github.com/apoorvdarshan/fud-ai) — API Key 加密存储与录入流程参考（MIT）

## 许可

[MIT](./LICENSE)
