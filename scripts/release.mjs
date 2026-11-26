#!/usr/bin/env node
/**
 * 本地发版：改版本号 → 构建 → 打包 APK → 传到 GitHub Releases
 *
 * 用法：
 *   npm run release -- 1.1.0
 *   npm run release -- 1.1.0 --skip-publish   # 只构建，不上传
 *
 * 版本号规则：versionCode = major*10000 + minor*100 + patch
 */

import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const GRADLE = path.join(ROOT, 'android', 'app', 'build.gradle');
const PACKAGE = path.join(ROOT, 'package.json');
const DIST = path.join(ROOT, '.claude_dist', 'apk');

const args = process.argv.slice(2);
const version = args.find((arg) => /^\d+\.\d+\.\d+$/.test(arg));
const skipPublish = args.includes('--skip-publish');

if (!version) {
  console.error('用法：npm run release -- <版本号>  例如 1.1.0');
  process.exit(1);
}

const [major, minor, patch] = version.split('.').map(Number);
const versionCode = major * 10000 + minor * 100 + patch;
const tag = `v${version}`;

function run(command, commandArgs, cwd = ROOT) {
  console.log(`\n$ ${command} ${commandArgs.join(' ')}`);
  execFileSync(command, commandArgs, { cwd, stdio: 'inherit' });
}

function runGradle() {
  console.log('\n$ gradlew assembleRelease');
  const result =
    process.platform === 'win32'
      ? spawnSync(process.env.ComSpec ?? 'cmd.exe', ['/c', 'gradlew.bat', 'assembleRelease'], {
          cwd: path.join(ROOT, 'android'),
          stdio: 'inherit',
        })
      : spawnSync('./gradlew', ['assembleRelease'], {
          cwd: path.join(ROOT, 'android'),
          stdio: 'inherit',
        });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

// ---------------------------------------------------------------- 1. 版本号

const gradleText = fs.readFileSync(GRADLE, 'utf8');
const alreadySet =
  new RegExp(`versionCode\\s+${versionCode}\\b`).test(gradleText) &&
  gradleText.includes(`versionName "${version}"`);

if (!alreadySet) {
  const nextGradle = gradleText
    .replace(/versionCode \d+/, `versionCode ${versionCode}`)
    .replace(/versionName "[^"]*"/, `versionName "${version}"`);

  if (nextGradle === gradleText) {
    console.error('没能改到 build.gradle 里的 versionCode / versionName');
    process.exit(1);
  }
  fs.writeFileSync(GRADLE, nextGradle);
}

const pkg = JSON.parse(fs.readFileSync(PACKAGE, 'utf8'));
pkg.version = version;
fs.writeFileSync(PACKAGE, JSON.stringify(pkg, null, 2) + '\n');

console.log(`版本 ${version}（versionCode ${versionCode}）`);

// ---------------------------------------------------------------- 2. 构建

run(process.execPath, ['node_modules/typescript/bin/tsc', '-b', '--noEmit'], ROOT);
run(process.execPath, ['scripts/check-i18n.mjs'], ROOT);
run(process.execPath, ['scripts/verify.mjs'], ROOT);
run(process.execPath, ['scripts/build-foods.mjs'], ROOT);
run(process.execPath, ['node_modules/vite/bin/vite.js', 'build'], ROOT);
run(process.execPath, ['node_modules/@capacitor/cli/bin/capacitor', 'sync', 'android'], ROOT);
runGradle();

// ---------------------------------------------------------------- 3. 归档

const built = path.join(ROOT, 'android', 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk');
if (!fs.existsSync(built)) {
  console.error('没找到 app-release.apk，构建可能失败了');
  process.exit(1);
}

fs.mkdirSync(DIST, { recursive: true });
const target = path.join(DIST, `food-island-v${version}-arm64-v8a.apk`);
fs.copyFileSync(built, target);
console.log(`\n✓ APK → ${path.relative(ROOT, target)}（${(fs.statSync(target).size / 1024 / 1024).toFixed(1)} MB）`);

// ---------------------------------------------------------------- 4. 发布

if (skipPublish) {
  console.log('\n跳过上传。手动上传：');
  console.log(`  gh release create ${tag} "${target}" --title ${tag} --generate-notes`);
  process.exit(0);
}

const gh = spawnSync('gh', ['--version']);
if (gh.status !== 0) {
  console.error('\n没装 GitHub CLI（gh），APK 已构建完成。');
  console.error(`装好后运行：gh release create ${tag} "${target}" --title ${tag} --generate-notes`);
  process.exit(1);
}

const exists = spawnSync('gh', ['release', 'view', tag], { stdio: 'ignore' });
if (exists.status === 0) {
  console.log(`\nRelease ${tag} 已存在，上传新 APK 覆盖`);
  run('gh', ['release', 'upload', tag, target, '--clobber']);
} else {
  run('gh', ['release', 'create', tag, target, '--title', tag, '--generate-notes']);
}

console.log(`\n✓ 发布完成：https://github.com/beijiushare/food_island/releases/tag/${tag}`);
