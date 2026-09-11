import { chromium } from 'playwright';

const repoUrl = process.env.REPO_URL || 'https://github.com/chen54088/FREESUB';
const profile = process.env.PW_PROFILE || './.playwright-github';
const browser = await chromium.launchPersistentContext(profile, { headless: false });
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
