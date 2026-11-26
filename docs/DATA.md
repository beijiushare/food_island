# 数据

## 来源

| 数据 | 来源 | 备注 |
| --- | --- | --- |
| 食物成分（1677 条） | 《中国食物成分表 标准版（第 6 版）》→ [china-food-composition-data](https://github.com/Sanotsu/china-food-composition-data) | 每 100 g 可食部 |
| 调味品（9 条） | [NutritionCalculatorOfHOC](https://github.com/Sibuxiangx/NutritionCalculatorOfHOC)（MIT） | 表中缺酱油、盐、糖、醋、蚝油等 |
| 菜谱（152 道） | 同上 → [CookLikeHOC](https://github.com/Gar-b-age/CookLikeHOC) | 原始配方来自老乡鸡溯源报告 |

## 字段

只保留 10 项营养，其余不再输出：

```
kcal / 蛋白质 / 脂肪 / 碳水 / 膳食纤维
钠 / 钙 / 铁 / 维生素 C / 胆固醇
```

全部是**每 100 g 可食部**。带骨带壳的食物另有 `edible`（可食部 %），记录时可按「可食部」或「整重」计算。

## 构建

```bash
npm run data:build
```

- 输入：`data-src/food_composition_full.csv`、`data-src/seasonings.csv`、`data-src/dishes.json`
- 输出：`src/assets/foods.json`、`src/assets/dishes.json`
- **输出是产物，不入库**（`.gitignore`），克隆后必须先跑这条命令
- 构建时自检：必需食物存在、foodCode 唯一、菜谱配料比例合计 ≈ 100

## 菜谱

存的是「每 100 g 成品里各配料占多少克」，不是门店份量：

```json
{
  "name": "西红柿炒鸡蛋",
  "servingGrams": 444,
  "components": [{ "name": "大豆油", "ratio": 9.38, "per100": { "kcal": 884 } }]
}
```

- `servingGrams` = 配方总重 ÷ 份数，只作为记录时的默认克数，用户可改
- 没有保留原项目的烹饪系数（炒 ×1.05、炸 ×1.15）；配料里已经含油，再乘会重复
- 少数菜使用复合酱（宫保鸡丁调味酱），本地表查不到，标 `recipe` 来源

## 版权

成分表数据版权归原作者所有；本项目为个人自用，不承诺数据准确性，不用于医疗或临床决策。
