#!/usr/bin/env node
/**
 * 用 Vite 的 SSR 构建把 scripts/verify/index.ts 打包成 node 可直接跑的脚本，
 * 然后执行。这样不用引入 tsx / ts-node 之类的额外依赖。
 */

import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, '.verify');
const VITE_BIN = path.join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js');

execFileSync(
  process.execPath,
  [
    VITE_BIN,
    'build',
    '--ssr',
    'scripts/verify/index.ts',
    '--outDir',
    '.verify',
    '--logLevel',
    'error',
  ],
  { cwd: ROOT, stdio: 'inherit' },
);

execFileSync(process.execPath, [path.join(OUT, 'index.js')], { cwd: ROOT, stdio: 'inherit' });
