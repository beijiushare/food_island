# 食岛 · Food Island

一个只做「饮食热量记录」的 Android 个人工具，动森（Animal Crossing）风格。

> 拍一张 / 打一句 / 点一下 —— 记下这一餐。

## 为什么

原来用的开源项目 Fud AI 功能齐全，但有四个问题：饮水记录不合理、部分 AI 供应商不适配、AI 对话不现代、中文份量单位支持很浅（只有 `slice` / `cup` / `can` 这类西餐体系）。同时为了健身功能带了 1.2 GB 的动作图库，而我从不使用。

所以这里只保留「记饮食」这一件事，并按中文饮食习惯重做份量体系。

## 它不是什么

- 不是健身 / 训练工具
- 不是精确营养分析（定位是「大致参考」）
- 不需要账号、不上传云端、没有社交

## 文档

| 文件 | 内容 |
| --- | --- |
| [`AGENTS.md`](./AGENTS.md) | 项目规则、技术栈、禁止事项 |
| [`docs/01-技术文档.md`](./docs/01-技术文档.md) | 架构、数据层、AI 集成、里程碑 |
| [`docs/02-设计系统.md`](./docs/02-设计系统.md) | 动森风格规范、组件映射、自建组件 |
| [`docs/03-交接提示词.md`](./docs/03-交接提示词.md) | 新会话启动提示词 |
| [`data-src/README.md`](./data-src/README.md) | 成分表原始数据说明 |

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
npm run data:build        # CSV → foods.json
npm run dev               # 浏览器调试

npm run build
npx cap sync android
npx cap run android       # 真机
```

## 数据来源

食物成分数据衍生于《中国食物成分表 标准版（第 6 版）》，经公开项目二次整理。
本项目为个人自用工具，不对外分发数据文件。

## 状态

P1 数据层完成（1677 条 → `src/assets/foods.json`，检索验收通过），当前在做 P2 记录层。进度见 `AGENTS.md` 末尾。
