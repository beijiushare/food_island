# 录入流程

> 加号打开菜单，三个入口都是独立页面（不是弹窗），Android 返回键按路由回退。

## 页面

```
今天页「+ 添加午餐」
  /add?date=YYYY-MM-DD&meal=lunch     菜单页：输入 / 搜索 / 最近
    /add/input    拍一张，或打一句话
    /add/search   成分表 1686 条 + 菜谱 152 道
    /add/recent   最近吃过（次数 → 最近）
      └→ /add/review   结果卡（新建）
  /add/entry/:id       结果卡（编辑已有记录）
```

## 三条路径

**输入**
- 拍一张照 → 立刻写入一条 `status: 'recognizing'` 的记录（照片同时落盘）→ 跳记录页
- 记录页自动补完：AI 拆组成 → 本地查表 → 状态变 `ready`；失败改 `failed`，可重试
- 只有文字时：配了 Key 走 AI 拆组成；没配 Key 提示去设置

**搜索**
- 成分表：按名字 / 拼音 / 别名检索，点一条进结果卡
- 菜谱：按菜名搜索，选中后按每 100 g 配料比例 × 默认克数生成组成，默认克数取配方折算值，可改

**最近**
- 按吃过次数降序、上次时间降序；份量沿用上次使用的克数

## 数据模型

```ts
// DiaryEntry
status?: 'recognizing' | 'ready' | 'failed';
error?: string;
errorCode?: string;
components?: EntryComponent[];
nutrientsManual?: boolean;

interface EntryComponent {
  name: string;
  grams: number;
  foodCode: string | null;
  nutrients: Nutrients;        // 已按克数折算
  per100?: Nutrients | null;   // 改克数时就地重算
  source?: 'table' | 'ai' | 'recipe' | 'manual';
  kind?: 'ingredient' | 'seasoning';
  clamped?: boolean;
}
```

一道菜一行：`name` 是菜名，`grams` 是组成克数之和，`nutrients` 是组成营养之和。
改外层克数 → 所有组成按比例缩放；改某条组成 → 外层跟着重算。手改过营养后锁定，不再自动重算。

## 照片

- 拍照即写入 `Directory.Data`，数据库只存相对路径
- 删照片是真的删文件：结果卡里删、保存时丢弃多余照片、离开流程未保存，都会删
- 编辑已有记录时，删照片在保存时生效（避免改完不保存就把图弄丢）

## 识别状态

```
recognizing ──成功──> ready
     │
     └──失败──> failed ──重试──> recognizing
```

- 进入记录页时若状态是 `recognizing`，自动补一次
- App 被杀 / 断网导致卡住：超过 2 分钟的记录在下次打开首页时标记为 `failed`
- 失败只改状态，记录和照片都保留
