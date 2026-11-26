# 发布

## 版本号

`android/app/build.gradle` 里的 `versionCode` / `versionName` 是唯一来源。

规则：`versionCode = major*10000 + minor*100 + patch`

```
1.0.0 → 10000
1.0.1 → 10001
1.1.0 → 10100
```

`npm run release` 会自动改这两个值，不需要手改。

## 签名

- keystore：`android/app/foodisland-release.jks`（不进 git）
- 口令：`android/keystore.properties`（不进 git）
- **keystore 必须单独备份**：丢了就无法覆盖升级，只能卸载重装

## 出包

```bash
npm run release -- 1.1.0                 # 改版本 → 校验 → 构建 → 打包 → 上传 Release
npm run release -- 1.1.0 --skip-publish  # 只出包，不上传
```

脚本做的事：

1. 改 `build.gradle` 的 versionCode / versionName，同步 `package.json`
2. 跑 typecheck、`check:i18n`、`verify`、`data:build`
3. `vite build` → `cap sync android` → `gradlew assembleRelease`
4. APK 归档到 `.claude_dist/apk/food-island-v<版本>-arm64-v8a.apk`
5. 调用 `gh release create`（已存在同名 tag 时改为 `gh release upload --clobber`）

上传需要安装 [GitHub CLI](https://cli.github.com/) 并 `gh auth login`。

## 更新检查

App 请求：

```
GET https://api.github.com/repos/beijiushare/food_island/releases/latest
```

- 取 `tag_name` 与本机 `versionName` 比较
- 新版取 `assets[]` 里第一个 `.apk` 的 `browser_download_url`，交给系统浏览器
- 未认证限流 60 次/小时；没有 Release 时返回 404，视为已是最新
- Android 无法静默安装，下载后由系统安装器接管

## 注意

- 只为 `arm64-v8a` 打包（`abiFilters`）
- 包名 `top.beijiu.foodisland` 不能变，否则是另一个应用
- APK 与 keystore 都不入库
