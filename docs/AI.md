# 识别链路

> AI 只负责「这道菜由什么组成、各多少克、每 100 g 营养」；总量和最终数值由本地算。

## 流程

```
拍照 → 建记录（status=recognizing，照片落盘）
        ↓ 进入记录页
   analyzeEntry()
        读照片 → analyzeDish() → parseDish() → resolveDish()
                                              ├─ 本地精确命中 → 用成分表
                                              └─ 没命中 → 用 AI 的 per100
        ↓
   写回记录（name / grams / nutrients / components / status=ready）
```

文字输入走同一套：`analyzeDish(profile, { text })`。

## 模型输出

```json
{
  "dish": "西红柿炒鸡蛋",
  "grams": 450,
  "components": [
    {
      "name": "番茄", "grams": 300, "kind": "ingredient",
      "per100": { "kcal": 15, "protein": 0.9, "carb": 3.3, "fat": 0.2 }
    },
    { "name": "大豆油", "grams": 42, "kind": "seasoning", "per100": { "kcal": 884, "protein": 0, "carb": 0, "fat": 99.9 } }
  ]
}
```

- 单一食材（蒸米饭、白水煮玉米）components 只列自己
- 调料 `kind: "seasoning"`，量也由模型给
- `per100` 只用于本地查不到时的兜底，命中本地表就丢弃 AI 的数值

## 本地解析

- 组成匹配走**精确模式**：只认「名字 / 核心名 / 别名」完全相等；单字不做模糊匹配
- 别名表：`src/data/alias.ts`（盐 → 精盐、油 → 豆油、淀粉 → 玉米淀粉…）
- 组成的口语映射：`src/data/ingredient-alias.ts`（油 / 食用油 / 植物油 → 豆油）
- 本地命中 → `source: 'table'`；兜底 → `source: 'ai'`；菜谱 → `source: 'recipe'`

## 调料夹限

AI 给的调料克数按常识区间夹住，超出标 `clamped`，界面显示「已限量」：

| 类别 | 区间 |
| --- | --- |
| 油 | 1–60 g |
| 盐 | 0.2–10 g |
| 糖 | 0.5–60 g |
| 酱油 / 醋 / 料酒 / 蚝油 | 1–40 g |
| 酱类 | 1–50 g |
| 鸡精 / 味精 | 0.2–10 g |
| 淀粉 | 1–30 g |
| 香料 | 0.1–5 g |

## 配置与错误

- 配置项：Base URL / 模型 / API Key / 附加请求头（单行 `名字: 值`）
- Key 存在 Android `EncryptedSharedPreferences`（`SecureStorePlugin`），不进 IndexedDB
- 错误码：`no-key` / `unauthorized` / `rate-limit` / `timeout` / `network` / `server`，界面按语言显示文案
- 没配 Key：开发环境返回示例结果（`import.meta.env.DEV`），正式包直接标 `failed`，提示去设置
- 请求超时 20 秒；失败不删记录，也不删照片

## 相关文件

```
src/features/ai/recognize.ts     提示词、解析、本地/兜底解析
src/features/entry/analyze.ts    记录补完（读照片 → 写回）
src/services/ai-client.ts        OpenAI 兼容客户端与错误码
src/data/foods.ts                检索打分与 exact 模式
src/data/alias.ts                别名表
src/data/ingredient-alias.ts     组成口语映射
```
