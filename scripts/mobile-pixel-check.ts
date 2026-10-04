import { chromium, type Browser, type Page } from 'playwright-core';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const projectRoot = resolve(import.meta.dirname, '..');
const baseUrl = process.env.CHECK_BASE_URL ?? 'http://127.0.0.1:4173';
const samplePath = resolve(projectRoot, 'baseline/sample.json');
const mobileDir = resolve(projectRoot, 'baseline/mobile');
const desktopDir = resolve(projectRoot, 'baseline/desktop');
const updateDesktopBaseline = process.env.UPDATE_DESKTOP_BASELINE === '1';
const pages = [
  { key: 'dashboard', label: '审核总览' },
  { key: 'assessment', label: '分模块审核' },
  { key: 'remediation', label: '整改清单' },
  { key: 'sources', label: '依据与差异' },
  { key: 'report', label: '审核报告' },
] as const;
const viewports = [
  { key: '390x844', width: 390, height: 844, dir: mobileDir },
  { key: '1280x900', width: 1280, height: 900, dir: desktopDir },
  { key: '1920x1080', width: 1920, height: 1080, dir: desktopDir },
  { key: '2560x1440', width: 2560, height: 1440, dir: desktopDir },
] as const;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function waitForServer(url: string) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // The preview server is still starting.
    }
    await sleep(250);
  }
  throw new Error(`预览服务未能在规定时间内启动：${url}`);
}

function startPreview() {
  const child = spawn('pnpm', ['exec', 'vite', 'preview', '--host', '127.0.0.1', '--port', '4173', '--strictPort'], {
    cwd: projectRoot,
    stdio: 'ignore',
  });
  return child;
}

async function closePreview(child: ReturnType<typeof spawn>) {
  if (!child.killed) child.kill('SIGTERM');
  await sleep(150);
}

async function freezeClock(page: Page) {
  await page.addInitScript(() => {
    const NativeDate = Date;
    const fixedNow = NativeDate.parse('2026-10-04T04:00:00.000Z');
    class FixedDate extends NativeDate {
      constructor(value?: string | number | Date) {
        super(value === undefined ? fixedNow : value);
      }
      static now() { return fixedNow; }
    }
    // @ts-expect-error Test-only deterministic clock for visual baselines.
    globalThis.Date = FixedDate;
  });
}

async function importSample(page: Page) {
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.locator('input[type="file"]').setInputFiles(samplePath);
  await page.getByText('已导入、校验并保存审核档案').waitFor({ state: 'visible', timeout: 10_000 });
  const profileModal = page.locator('.profile-modal');
  if (await profileModal.count() > 0 && await profileModal.isVisible()) {
    await profileModal.getByRole('button', { name: '取消', exact: true }).click();
  }
  await page.getByRole('heading', { name: /改版前基线样例单位/ }).waitFor({ state: 'visible', timeout: 10_000 });
}

async function openView(page: Page, label: string) {
  if (label === '审核总览') return;
  await page.locator('button.nav-item').filter({ hasText: label }).first().click({ force: true });
  await page.waitForTimeout(150);
}

async function capture(page: Page, viewport: typeof viewports[number], pageKey: string, tempRoot: string) {
  const dir = resolve(tempRoot, viewport.key);
  await mkdir(dir, { recursive: true });
  const path = resolve(dir, `${pageKey}.png`);
  await page.screenshot({ path, fullPage: true, animations: 'disabled' });
  return path;
}

function comparePng(actual: string, expected: string) {
  const python = String.raw`
from PIL import Image, ImageChops
import json, sys
actual = Image.open(sys.argv[1]).convert('RGBA')
expected = Image.open(sys.argv[2]).convert('RGBA')
if actual.size != expected.size:
    print(json.dumps({'same': False, 'reason': 'size', 'actual': actual.size, 'expected': expected.size}, ensure_ascii=False))
    raise SystemExit(0)
diff = ImageChops.difference(actual, expected)
box = diff.getbbox()
changed = 0
if box:
    changed = sum(1 for pixel in diff.getdata() if pixel != (0, 0, 0, 0))
print(json.dumps({'same': box is None, 'changed': changed, 'bbox': box}, ensure_ascii=False))
`;
  const result = spawnSync('python3', ['-c', python, actual, expected], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr || 'PNG像素比较失败');
  return JSON.parse(result.stdout.trim()) as { same: boolean; changed?: number; bbox?: unknown; reason?: string; actual?: unknown; expected?: unknown };
}

async function main() {
  if (!existsSync(samplePath)) throw new Error(`缺少样例数据：${samplePath}`);
  const preview = startPreview();
  const tempRoot = resolve(projectRoot, '.tmp-mobile-baseline');
  let browser: Browser | undefined;
  try {
    await waitForServer(baseUrl);
    browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
    for (const viewport of viewports) {
      const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, timezoneId: 'Asia/Shanghai' });
      const page = await context.newPage();
      await freezeClock(page);
      await importSample(page);
      await page.addStyleTag({ content: '* { animation: none !important; transition: none !important; caret-color: transparent !important; }' });
      for (const item of pages) {
        await openView(page, item.label);
        const path = await capture(page, viewport, item.key, tempRoot);
        const baseline = resolve(viewport.dir, viewport.key, `${item.key}.png`);
        if (existsSync(baseline)) {
          if (viewport.key === '390x844') {
            const result = comparePng(path, baseline);
            if (!result.same) throw new Error(`手机页面 ${item.label} 像素差异：${JSON.stringify(result)}`);
          } else if (updateDesktopBaseline) {
            await writeFile(baseline, await readFile(path));
          }
        } else {
          await mkdir(resolve(viewport.dir, viewport.key), { recursive: true });
          await writeFile(baseline, await readFile(path));
        }
      }
      await context.close();
    }
    console.log('手机像素对比通过：390×844 五个页面差异为 0。');
    console.log('桌面基线已保存：1280×900、1920×1080 与 2560×1440 五个页面。');
  } finally {
    await browser?.close();
    await rm(tempRoot, { recursive: true, force: true });
    await closePreview(preview);
  }
}

await main();
