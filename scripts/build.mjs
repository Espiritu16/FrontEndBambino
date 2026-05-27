import { spawnSync } from 'node:child_process';

const rawArgs = process.argv.slice(2).filter((arg) => arg !== '--');
const hasConfiguration = rawArgs.some((arg) => arg === '--configuration' || arg.startsWith('--configuration='));
const args = ['build', ...rawArgs];

if (!hasConfiguration) {
  args.push('--configuration', 'production');
}

const result = spawnSync('./node_modules/.bin/ng', args, {
  stdio: 'inherit',
  shell: process.platform === 'win32'
});

if ((result.status ?? 1) !== 0) {
  process.exit(result.status ?? 1);
}

const seoResult = spawnSync('node', ['./scripts/generate-static-seo-pages.mjs'], {
  stdio: 'inherit',
  shell: process.platform === 'win32'
});

process.exit(seoResult.status ?? 1);
