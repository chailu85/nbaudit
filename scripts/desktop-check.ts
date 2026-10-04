import { chromium, type Browser } from 'playwright-core';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const projectRoot = resolve(import.meta.dirname, '..');
const baseUrl = process.env.CHECK_BASE_URL ?? 'http://127.0.0.1:4173';
const samplePath = resolve(projectRoot, 'baseline/sample.json');
const cases = [
  { width: 1280, height: 800, rootFont: 15, contentWidth: 1040 },
  { width: 1920, height: 1080, rootFont: 16, contentWidth: 1280 },
  { width: 2560, height: 1440, rootFont: 18, contentWidth: 1600 },
] as const;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function waitForServer(url: string) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      // Preview server is still starting.
    }
    await sleep(250);
  }
  throw new Error(`预览服务未能启动：${url}`);
}

function startPreview() {
  return spawn('pnpm', ['exec', 'vite', 'preview', '--host', '127.0.0.1', '--port', '4173', '--strictPort'], {
    cwd: projectRoot,
    stdio: 'ignore',
  });
}

async function importSample(page: import('playwright-core').Page) {
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.locator('input[type="file"]').setInputFiles(samplePath);
  await page.getByText('已导入、校验并保存审核档案').waitFor({ state: 'visible', timeout: 10_000 });
  const modal = page.locator('.profile-modal');
  if (await modal.count() > 0 && await modal.isVisible()) {
    await modal.getByRole('button', { name: '取消', exact: true }).click();
  }
  await page.getByRole('heading', { name: /改版前基线样例单位/ }).waitFor({ state: 'visible', timeout: 10_000 });
}

async function main() {
  if (!existsSync(samplePath)) throw new Error(`缺少样例数据：${samplePath}`);
  const preview = startPreview();
  let browser: Browser | undefined;
  try {
    await waitForServer(baseUrl);
    browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
    for (const item of cases) {
      const context = await browser.newContext({ viewport: { width: item.width, height: item.height }, timezoneId: 'Asia/Shanghai' });
      const page = await context.newPage();
      await importSample(page);
      const metrics = await page.evaluate(() => {
        const root = document.documentElement;
        const content = document.querySelector<HTMLElement>('.main-content');
        const rail = document.querySelector<HTMLElement>('.topbar');
        if (!content || !rail) throw new Error('缺少桌面框架节点');
        return {
          rootFont: Number.parseFloat(getComputedStyle(root).fontSize),
          contentWidth: Math.round(content.getBoundingClientRect().width),
          sidebarWidth: Math.round(rail.getBoundingClientRect().width),
          horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth || document.body.scrollWidth > document.body.clientWidth,
        };
      });
      const expectedSidebar = item.rootFont * 15;
      const failures = [
        Math.abs(metrics.rootFont - item.rootFont) > 0.01 && `根字号=${metrics.rootFont}px，期望=${item.rootFont}px`,
        Math.abs(metrics.contentWidth - item.contentWidth) > 1 && `内容区=${metrics.contentWidth}px，期望=${item.contentWidth}px`,
        Math.abs(metrics.sidebarWidth - expectedSidebar) > 1 && `侧栏=${metrics.sidebarWidth}px，期望=${expectedSidebar}px`,
        metrics.horizontalOverflow && '检测到横向滚动条',
      ].filter(Boolean);
      console.log(`${item.width}×${item.height}: 根字号 ${metrics.rootFont}px；内容区 ${metrics.contentWidth}px；侧栏 ${metrics.sidebarWidth}px；横向滚动 ${metrics.horizontalOverflow ? '是' : '否'}`);
      if (failures.length) throw new Error(`${item.width}px 桌面断言失败：${failures.join('；')}`);
      await context.close();
    }
    console.log('桌面三档尺寸检查通过。');
  } finally {
    await browser?.close();
    if (!preview.killed) preview.kill('SIGTERM');
    await sleep(150);
  }
}

await main();
