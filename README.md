# 食岛 · Food Island

> 拍一张 / 打一句 / 点一下 —— 记下这一餐。

一个只做「饮食热量记录」的 Android 应用，动森风格。照片交给 AI 拆成原料和调料，营养数值查本地成分表，数据全部留在本机。

<https://github.com/beijiushare/food_island>

## 特性

- **拍照即建档**：按下快门就先存记录和照片，识别失败也不会丢；可以随时重试
- **AI 只拆组成**：一道菜拆成基础原料 + 调料（番茄炒蛋 → 番茄 / 鸡蛋 / 油 / 盐 / 糖 / 酱油），量由 AI 估
- **本地优先算营养**：每个组成先查本地成分表（1686 条），查不到才用 AI 的每 100 g 估值，总量由本地乘加
- **菜谱库**：152 道常见菜按「每 100 g 配料比例」内置，搜索即可直接记整道菜
- **最近吃过**：按吃过次数排序，份量沿用上次
- **离线可用**：除 AI 识别外，其余功能不依赖网络
- **数据自持**：IndexedDB + 私有目录，支持导出 CSV
- **中英双语**：可切换语言，文案键对齐检查


## 下载

Android 7.0+（arm64）：[GitHub Releases](https://github.com/beijiushare/food_island/releases/latest)

## 快速开始

```bash
npm install

# 由 data-src 生成数据文件
npm run data:build        # CSV → src/assets/foods.json + dishes.json

npm run dev               # 浏览器调试（http://localhost:5199）
npm run build             # 产出 dist/
```


### 检查

```bash
npm run typecheck         # 类型检查
npm run check:i18n        # 中英文案键与占位符对齐
```


## 数据与口径

- 营养数据：能量、蛋白质、脂肪、碳水、膳食纤维、钠、钙、铁、维生素 C、胆固醇，全部是**每 100 g 可食部**
- 成分表：1686 条（1677 条食材 + 9 条调味品），本地检索，支持拼音与别名
- 菜谱：152 道，存的是「每 100 g 成品中各配料占多少克」，记录时默认按配方折算的克数起手，可改
- 带骨带壳的食物可以按「可食部」或「整重」计算
- AI 不返回整餐总量；组成查不到本地表时才用 AI 的每 100 g 估算，并在界面上标注来源

## 已知限制

- 营养数值是估算，不用于医疗或临床决策
- AI 识别需要自备 API Key（OpenAI 兼容接口），没有 Key 时只能用搜索和最近
- 菜品份量按公开菜谱折算，和家常做法会有差异

## 文档

开发和维护看 [`docs/README.md`](./docs/README.md)。

## 致谢

**代码与参考**

- [animal-island-ui](https://github.com/guokaigdg/animal-island-ui) 
- [Vite](https://vite.dev) 
- [React](https://react.dev/) 
- [Capacitor](https://capacitorjs.com) 
- [Dexie](https://dexie.org) 
- [Zustand](https://github.com/pmndrs/zustand) 
- [i18next](https://www.i18next.com) 
- [pinyin-pro](https://pinyin-pro.cn) 
- [dayjs](https://day.js.org)
- [Fud AI](https://github.com/apoorvdarshan/fud-ai)

**数据**

- 《中国食物成分表 标准版（第 6 版）》— 中国疾病预防控制中心营养与健康所
- [china-food-composition-data](https://github.com/Sanotsu/china-food-composition-data) 
- [NutritionCalculatorOfHOC](https://github.com/Sibuxiangx/NutritionCalculatorOfHOC)
- [CookLikeHOC](https://github.com/Gar-b-age/CookLikeHOC)

## 许可

[MIT](./LICENSE)
