import { pathToFileURL } from 'node:url';
import fs from 'node:fs';

const playwrightCandidates = [
  process.env.PLAYWRIGHT_PATH,
  `${process.env.USERPROFILE}/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.js`,
  `${process.env.USERPROFILE}/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/lib/mjs/index.js`
].filter(Boolean);
const playwrightPath = playwrightCandidates.find((candidate) => fs.existsSync(candidate));
if (!playwrightPath) {
  console.error('找不到 Playwright。请使用 Codex bundled Node，或设置 PLAYWRIGHT_PATH 指向 playwright/index.js。');
  process.exit(1);
}
const playwrightModule = await import(pathToFileURL(playwrightPath).href);
const { chromium } = playwrightModule.default || playwrightModule;

const repoUrl = (process.env.REPO_URL || 'https://github.com/chen54088/FREESUB')
  .replace(/^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/, '$2')
  .replace(/\\_/g, '_')
  .replace(/\s+/g, '');
const profile = process.env.PW_PROFILE || './.playwright-github';
let browser;
try {
  browser = await chromium.launchPersistentContext(profile, { headless: false });
} catch (error) {
  if (String(error).includes('Executable doesn't exist')) {
    console.error('本机没有 Playwright 浏览器内核。先运行：npx playwright install chromium，然后重新运行本脚本。');
  }
  throw error;
}
const page = await browser.newPage();
await page.goto(`${repoUrl}/settings`, { waitUntil: 'domcontentloaded' });

if (page.url().includes('/login')) {
  console.log('请在弹出的 GitHub 窗口完成登录/验证码，完成后回到仓库 Settings 页面。');
  await page.waitForURL(/github\.com\/.+\/.+\/settings/, { timeout: 0 });
}

await page.goto(`${repoUrl}/settings`, { waitUntil: 'networkidle' });
await page.getByRole('heading', { name: /Danger Zone/i }).scrollIntoViewIfNeeded().catch(() => {});
const change = page.getByText(/Change repository visibility/i).first();
await change.waitFor({ state: 'visible', timeout: 30000 });
await change.click();
await page.waitForTimeout(800);

const makePrivate = page.getByText(/Make private/i).last();
await makePrivate.waitFor({ state: 'visible', timeout: 30000 });
console.log('已打开 Make private 确认框。脚本停在最后确认前，请检查仓库名后按 Enter。');
process.stdin.setEncoding('utf8');
await new Promise(resolve => process.stdin.once('data', resolve));

await makePrivate.click();
await page.waitForTimeout(800);
const confirm = page.getByRole('button', { name: /Make private|I understand/i }).last();
if (await confirm.isVisible().catch(() => false)) {
  await confirm.click();
}
await page.waitForTimeout(2000);
console.log(`完成，当前页面：${page.url()}`);
await browser.close();
