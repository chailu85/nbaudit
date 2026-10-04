import { chromium, type Browser } from 'playwright-core';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const projectRoot = resolve(import.meta.dirname, '..');
const baseUrl = process.env.CHECK_BASE_URL ?? 'http://127.0.0.1:4173';
const samplePath = resolve(projectRoot, 'baseline/sample.json');
const cases = [
  { width: 1024, height: 900, rootFont: 15, contentWidth: 799 },
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

async function assertNarrowDesktopText(page: import('playwright-core').Page) {
  const result = await page.evaluate(`(() => {
    function tokenRects(selector, tokens) {
      const results = [];
      const elements = document.querySelectorAll<HTMLElement>(selector);
      for (let elementIndex = 0; elementIndex < elements.length; elementIndex += 1) {
        const element = elements[elementIndex];
        const text = element.firstChild;
        if (!text || text.nodeType !== Node.TEXT_NODE) continue;
        const value = text.textContent ?? '';
        for (const token of tokens) {
          const start = value.indexOf(token);
          if (start < 0) continue;
          const range = document.createRange();
          range.setStart(text, start);
          range.setEnd(text, start + token.length);
          results.push({ selector, token, lines: range.getClientRects().length });
        }
      }
      return results;
    }
    return {
      assessment: tokenRects('.module-nav strong', ['附录A', '附录B', '附录C', '附录D', '附录E', '附录F', '附录G', '附录H', '第5章', '第6章']),
      report: tokenRects('.report-score strong', ['%']),
      source: tokenRects('.source-card small', ['2026-06-30']),
      dashboard: tokenRects('.dashboard-metrics small, .module-table-row > .module-table-measure > span', ['项', '条']),
    };
  })()`) as Record<string, { selector: string; token: string; lines: number }[]>;
  const broken = Object.values(result).flat().filter(item => item.lines > 1);
  if (broken.length) throw new Error(`1024px 文本断行：${broken.map(item => `${item.selector}:${item.token}`).join('、')}`);
}

async function assertCustomSelectKeyboard(page: import('playwright-core').Page) {
  await page.locator('button.nav-item').filter({ hasText: '整改清单' }).click();
  await page.getByRole('button', { name: '状态：全部 ▾', exact: true }).click();
  const trigger = page.locator('.remediation-filter-panel .responsive-select-trigger').first();
  await trigger.click();
  await trigger.press('ArrowDown');
  await trigger.press('Enter');
  if (!(await trigger.textContent())?.includes('待整改')) throw new Error('自定义下拉 ArrowDown/Enter 选择失败');
  await trigger.click();
  await trigger.press('Escape');
  if (await page.locator('.responsive-select-list').count() !== 0) throw new Error('自定义下拉 Esc 未收起');
  await trigger.click();
  await trigger.press('Tab');
  if (await page.locator('.responsive-select-list').count() !== 0) throw new Error('自定义下拉 Tab 未收起');
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
      if (item.width === 1024) {
        await assertNarrowDesktopText(page);
        await assertCustomSelectKeyboard(page);
        console.log('1024px 断行与自定义下拉键盘检查通过。');
      }
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
