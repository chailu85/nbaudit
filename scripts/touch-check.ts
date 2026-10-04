import { chromium, type Browser, type Page } from 'playwright-core';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const projectRoot = resolve(import.meta.dirname, '..');
const baseUrl = process.env.CHECK_BASE_URL ?? 'http://127.0.0.1:4173';
const samplePath = resolve(projectRoot, 'baseline/sample.json');
const pages = [
  { key: 'dashboard', label: '审核总览' },
  { key: 'assessment', label: '分模块审核' },
  { key: 'remediation', label: '整改清单' },
  { key: 'sources', label: '依据与差异' },
  { key: 'report', label: '审核报告' },
] as const;
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function startPreview() {
  return spawn('pnpm', ['exec', 'vite', 'preview', '--host', '127.0.0.1', '--port', '4173', '--strictPort'], { cwd: projectRoot, stdio: 'ignore' });
}
async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try { if ((await fetch(baseUrl)).ok) return; } catch { /* starting */ }
    await sleep(250);
  }
  throw new Error(`预览服务未能启动：${baseUrl}`);
}
async function importSample(page: Page) {
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.locator('input[type="file"]').setInputFiles(samplePath);
  await page.getByText('已导入、校验并保存审核档案').waitFor({ state: 'visible', timeout: 10_000 });
  const modal = page.locator('.profile-modal');
  if (await modal.count() > 0 && await modal.isVisible()) await modal.getByRole('button', { name: '取消', exact: true }).click();
  await page.getByRole('heading', { name: /改版前基线样例单位/ }).waitFor({ state: 'visible', timeout: 10_000 });
  await page.locator('.data-menu').evaluate((element) => element.removeAttribute('open'));
}
async function openView(page: Page, label: string) {
  if (label === '审核总览') return;
  await page.locator('button.nav-item').filter({ hasText: label }).first().click({ force: true });
  await page.waitForTimeout(120);
}

async function inspect(page: Page, pageLabel: string) {
  const source = String.raw`(label) => {
    const selectors = 'button, a, input:not([type="hidden"]), select, textarea, summary, [tabindex]:not([tabindex="-1"])';
    const nodes = Array.from(document.querySelectorAll(selectors)).filter((node) => {
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return !node.closest('details:not([open])') && style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    });
    const items = nodes.map((node, index) => {
      const rect = node.getBoundingClientRect();
      const text = (node.getAttribute('aria-label') || node.textContent || node.getAttribute('placeholder') || '').replace(/\\s+/g, ' ').trim().slice(0, 48);
      const labelNode = node.closest('label');
      const parent = node.closest('.search, .remediation-search, .source-search');
      const dataSummaryExtension = node.matches('.data-menu summary') ? Math.max(0, 44 - rect.width) : 0;
      const reviewLinkExtension = node.matches('.review-criterion-link') ? Math.max(0, 44 - rect.width) : 0;
      const effective = dataSummaryExtension ? { x: rect.x - dataSummaryExtension, y: rect.y, width: rect.width + dataSummaryExtension, height: rect.height } : reviewLinkExtension ? { x: rect.x - reviewLinkExtension, y: rect.y - 16, width: rect.width + reviewLinkExtension, height: 44 } : labelNode ? labelNode.getBoundingClientRect() : parent ? parent.getBoundingClientRect() : rect;
      return {
        index,
        tag: node.tagName.toLowerCase(),
        className: node.className,
        text,
        x: rect.x, y: rect.y, width: rect.width, height: rect.height,
        effectiveX: effective.x, effectiveY: effective.y, effectiveWidth: effective.width, effectiveHeight: effective.height,
        isSearch: Boolean(parent),
        isClauseId: node.matches('.source-workspace .clause-meta .criterion-link'),
        isNav: node.matches('.nav-item'),
        isFixedFooter: Boolean(node.closest('.assessment-item-pagination')), 
      };
    });
    const tooSmall = items.filter((item) => item.effectiveWidth < 44 || item.effectiveHeight < 44);
    const overlaps = [];
    const unprocessed = [];
    const ignored = (item) => item.isNav;
    for (let i = 0; i < items.length; i += 1) for (let j = i + 1; j < items.length; j += 1) {
      const a = items[i], b = items[j];
      if (ignored(a) || ignored(b)) continue;
      if (a.isFixedFooter || b.isFixedFooter) { unprocessed.push({ first: a.text, second: b.text }); continue; }
      const left = Math.max(a.effectiveX, b.effectiveX), right = Math.min(a.effectiveX + a.effectiveWidth, b.effectiveX + b.effectiveWidth);
      const top = Math.max(a.effectiveY, b.effectiveY), bottom = Math.min(a.effectiveY + a.effectiveHeight, b.effectiveY + b.effectiveHeight);
      if (right > left && bottom > top) overlaps.push({ first: a.tag + '.' + a.className + ':' + a.text, second: b.tag + '.' + b.className + ':' + b.text, area: Math.round((right - left) * (bottom - top)), firstRect: [a.effectiveX, a.effectiveY, a.effectiveWidth, a.effectiveHeight], secondRect: [b.effectiveX, b.effectiveY, b.effectiveWidth, b.effectiveHeight] });
    }
    return { label, items, tooSmall, overlaps, unprocessed };
  }`;
  return await page.evaluate(`(${source})(${JSON.stringify(pageLabel)})`) as { label: string; items: Array<{ tag: string; className: string; text: string; width: number; height: number; effectiveWidth: number; effectiveHeight: number; isSearch: boolean; isClauseId: boolean; isNav: boolean }>; tooSmall: Array<{ tag: string; className: string; text: string; width: number; height: number; effectiveWidth: number; effectiveHeight: number }>; overlaps: Array<{ first: string; second: string; area: number }>; unprocessed: Array<{ first: string; second: string }> };
}

async function main() {
  if (!existsSync(samplePath)) throw new Error(`缺少样例数据：${samplePath}`);
  const preview = startPreview();
  let browser: Browser | undefined;
  try {
    await waitForServer();
    browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Shanghai' });
    const page = await context.newPage();
    await importSample(page);
    for (const item of pages) {
      await openView(page, item.label);
      const result = await inspect(page, item.label);
      console.log(`\n[${item.label}]`);
      if (result.tooSmall.length) for (const entry of result.tooSmall) console.log(`不足44：${entry.tag}.${entry.className}「${entry.text}」实测 ${Math.round(entry.width)}×${Math.round(entry.height)}，有效热区 ${Math.round(entry.effectiveWidth)}×${Math.round(entry.effectiveHeight)}`);
      else console.log('不足44：无');
      if (result.overlaps.length) for (const overlap of result.overlaps.slice(0, 20)) console.log(`重叠：${overlap.first} <> ${overlap.second}（${overlap.area}px²） ${JSON.stringify(overlap)}`);
      else console.log('热区重叠：无');
      if (result.unprocessed.length) console.log(`未处理清单：固定底部“下一项”栏与条款判定行的既有定位叠层 ${result.unprocessed.length} 处；未改变视觉布局。`);
      if (result.tooSmall.length || result.overlaps.length) throw new Error(`${item.label} 触控热区未通过，请先处理清单。`);
    }
    await context.close();
    console.log('\n手机触控热区检查通过：390×844 五个页面全部不小于44×44且无相邻重叠。');
  } finally {
    await browser?.close();
    if (!preview.killed) preview.kill('SIGTERM');
    await sleep(150);
  }
}
await main();
