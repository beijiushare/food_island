# data-src

本目录存放**原始数据**，只在构建时读取，不参与打包。

## food_composition_full.csv

| 项 | 值 |
| --- | --- |
| 记录数 | 1677 |
| 列数 | 37 |
| 编码 | UTF-8（无 BOM） |
| 大小 | 343 KB |
| 来源 | 公开项目 `china-food-composition-data`，衍生于《中国食物成分表 标准版（第 6 版）》第二册「各类食物一般营养成分」 |
| 整理方式 | 双视觉模型识别 + 自动校验 + 人工复核 |

### 用法

```bash
npm run data:build
```

由 `scripts/build-foods.mjs` 转成 `src/assets/foods.json`，并：

- 清洗 `—` / `Tr` / `899*` / `un`
- 预计算检索键（拼音、首字母、bigram）
- 输出精简后的扁平结构

### 注意

- **不要直接改这个 CSV**。需要修正数据请在 `scripts/build-foods.mjs` 里加补丁层，保留原始文件可比对。
- 本目录的 `.csv` 在 `.gitignore` 里做了例外（`!data-src/*.csv`），需要入库以便复现构建。
- 数据版权归《中国食物成分表》原作者所有，本项目仅个人自用，不对外分发数据文件。
