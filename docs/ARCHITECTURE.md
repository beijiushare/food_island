# 架构与实现

> 配套：[`DESIGN.md`](DESIGN.md)（UI）、[`ENTRY.md`](ENTRY.md)（录入流程）、[`AI.md`](AI.md)（识别链路）、[`DATA.md`](DATA.md)（数据来源）。

## 定位

一个只做「饮食热量记录」的 Android 工具，动森风格。

- 一次记录 = 拍一张 / 打一句 / 点一下
- 单用户、离线优先、数据全在本机
- 定位是「大致参考」，不追求精确营养分析

## 技术栈

```
Vite 8 + React 19 + TypeScript
Capacitor 8（Android only）
Zustand            跨页面状态
Dexie              本地库（IndexedDB）
react-router-dom   HashRouter
pinyin-pro         中文检索
dayjs              日期
i18next            zh / en
animal-island-ui   动森风格组件库（0.8.0）
```

## 目录

```
src/
├── app/            路由、Shell、Android 返回键
├── pages/          today / add / stats / me
├── components/     自建组件（Stepper、ListItem、CalorieRing…）
├── features/
│   ├── ai/         提示词、解析、本地查表
│   ├── entry/      草稿 store、记录补完
│   ├── diary/      计算、日期、CSV
│   ├── memory/     最近吃过
│   ├── stats/      统计聚合
│   └── ui/         跨页面的 UI 状态
├── data/           Dexie schema、DAO、检索索引、别名
├── services/       AI 客户端、图片管线、导出、安全存储、更新检查
├── styles/         tokens.css + 全局样式
├── assets/         生成的 foods.json / dishes.json（不入库）
└── i18n/           zh / en 语言包
data-src/           成分表、调味品、菜谱的源数据
scripts/            数据构建、图标、校验、发布
android/            Capacitor Android 工程
```

## 数据层

**成分表**：`data-src/*.csv` → `npm run data:build` → `src/assets/foods.json`（1686 条）。
运行时懒加载进内存，全量遍历检索，0.1–0.5 ms，不需要倒排索引。

**检索**：`searchFoods(index, query, limit, options)`

- 默认模糊：名字 / 核心名 / 别名 / 拼音 / 包含 / bigram
- `exact: true`：只认名字或别名完全相等，用于组成匹配，避免「醋」命中「醋栗」

**DAO**（页面不直接碰 `db`，除 live query 订阅）：

```
src/data/dao/diary.ts     日期查询、增删改、CSV 导出取数
src/data/dao/photos.ts    照片引用
src/data/dao/settings.ts  目标、AI 配置、Key
```

**Dexie**：

```
diary:    id, date, [date+meal], createdAt
memory:   id, foodKey, [foodKey+scene], lastUsedAt
photos:   id, entryId, createdAt
settings: key
```

**图片**：只存相对路径（`photos/YYYY/MM/<uuid>.jpg`），文件在 `Directory.Data`。
删除是物理删除，不把二进制放进 IndexedDB。

**CSV**：导出全部记录，10 项营养，UTF-8 带 BOM。

## 识别边界

- AI 只判断「这道菜由什么组成、各多少克、每 100 g 营养」
- 本地表命中就用本地数值；未命中才用 AI 的每 100 g，标 `source: 'ai'`
- 总量永远由本地 `Σ(克数/100 × per100)` 算，AI 不给整餐总量

细节见 [`AI.md`](AI.md)。

## 录入

三条入口（输入 / 搜索 / 最近）+ 结果卡，都是独立页面。
拍照先建记录再识别，失败可重试。细节见 [`ENTRY.md`](ENTRY.md)。

## 统计

`features/stats/summary.ts` 按日期区间聚合：记录天数、日均、最高日、供能比、周/月分桶。
页面支持周/月切换与日历跳转。

## 平台

- **返回键**：`app/backButton.ts` 接管 `App.backButton`，按路由层级回退
- **键盘**：Capacitor Keyboard `resize: body`，输入框不被遮挡
- **状态栏**：暖米底 + 深色文字，`overlaysWebView: false`
- **权限**：INTERNET / CAMERA / READ_MEDIA_IMAGES；相机非必需（`uses-feature required=false`）
- **Key 存储**：`SecureStorePlugin`（EncryptedSharedPreferences + AndroidKeystore），浏览器退回 localStorage

## 关键约束

1. 数据可追溯：每条记录保留食物编码（命中本地表时）、组成快照、来源标记
2. 删除即删除：照片、记录都物理删除，不做软删除
3. 不依赖网络：除 AI 识别外，其余功能离线可用
4. 界面不自造精度：不显示置信度、健康评分这类没有依据的数字

## 风险

| 风险 | 说明 |
| --- | --- |
| AI 拆解偏差 | 油、调料由模型估，可能有量级误差；调料有上下限夹取 |
| 菜谱份量 | 配方按门店批量折算，和家常做法有差异；默认克数可改 |
| 成分表缺口 | 菜肴不在表内，只能拆原料；复合酱类依赖 AI 或菜谱值 |
| 单机数据 | 没有云同步，换机前必须导出 CSV |
