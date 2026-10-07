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
const sidebarCases = [1024, 1280, 1920, 2560].flatMap(width => [720, 1080].map(height => ({ width, height })));

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


async function assertReportCountLabels(page: import('playwright-core').Page, expectedLabel: string) {
  await page.locator('button.nav-item').filter({ hasText: '审核报告' }).click();
  await page.locator('.report-stats').waitFor({ state: 'visible', timeout: 10_000 });
  const result = await page.evaluate(`(() => {
    const expected = ${JSON.stringify(expectedLabel)};
    const root = document.querySelector('.report-stats');
    if (!root) throw new Error('缺少报告计数块');
    const labels = Array.from(root.querySelectorAll('.report-counted-label'));
    const visible = labels.filter(element => {
      const style = getComputedStyle(element);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });
    const contentOf = (element, pseudo) => {
      const content = getComputedStyle(element, pseudo).content;
      return content === 'none' || content === 'normal' ? '' : content.replace(/^['"]|['"]$/g, '');
    };
    return {
      visibleCount: visible.length,
      occurrences: visible.reduce((count, element) => count + ((element.textContent || '') + contentOf(element, '::before') + contentOf(element, '::after')).split(expected).length - 1, 0),
      overflows: visible.map(element => element.scrollWidth > element.clientWidth),
      texts: visible.map(element => element.textContent || ''),
    };
  })()`) as { visibleCount: number; occurrences: number; overflows: boolean[]; texts: string[] };
  if (result.visibleCount !== 1 || result.occurrences !== 1 || result.overflows.some(Boolean)) {
    throw new Error(`报告计数标签异常（期望一次且不溢出）：${JSON.stringify(result)}`);
  }
}

async function assertRemediationRowsAligned(page: import('playwright-core').Page) {
  await page.locator('button.nav-item').filter({ hasText: '整改清单' }).click();
  await page.locator('.remediation-row').first().waitFor({ state: 'visible', timeout: 10_000 });
  const rows = await page.evaluate(`(() => Array.from(document.querySelectorAll('.remediation-row')).map(row => {
    const getTop = selector => {
      const element = row.querySelector(selector);
      return element ? element.getBoundingClientRect().top : null;
    };
    return {
      id: getTop('.remediation-id'),
      name: getTop('.remediation-row-toggle h3'),
      owner: getTop('.remediation-row-toggle .remediation-owner'),
      due: getTop('.remediation-row-toggle .remediation-due'),
      priority: getTop('.remediation-row-toggle .remediation-priority'),
      status: getTop('.remediation-row-toggle .remediation-status'),
    };
  }))()`) as Array<Record<string, number | null>>;
  const failures = rows.map((row, index) => {
    const values = Object.values(row).filter((value): value is number => value !== null);
    const spread = values.length ? Math.max(...values) - Math.min(...values) : 0;
    return spread > 2 ? { index, spread, row } : null;
  }).filter(Boolean);
  if (failures.length) throw new Error(`整改清单六列未对齐：${JSON.stringify(failures)}`);
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


async function openA04Assessment(page: import('playwright-core').Page) {
  await page.locator('button.nav-item').filter({ hasText: '分模块审核' }).click();
  await page.locator('.assessment-page .module-nav').filter({ hasText: '系统技术' }).click();
  await page.getByText('58 个适用项目', { exact: true }).waitFor({ state: 'visible', timeout: 10_000 });
  const criterionId = page.locator('.assessment-item .criterion-id');
  let found = false;
  for (let index = 0; index < 80; index += 1) {
    if ((await criterionId.textContent())?.includes('A04-FRQ-13')) { found = true; break; }
    await page.keyboard.press('ArrowDown');
  }
  if (!found) throw new Error('完整系统技术模块中未找到 A04-FRQ-13');
}

async function assertA04SelectKeyboardAndEdge(page: import('playwright-core').Page) {
  await openA04Assessment(page);
  const criterionId = page.locator('.assessment-item .criterion-id');
  const originalId = (await criterionId.textContent())?.trim();
  await page.locator('.assessment-item .a04-control > summary').click();
  const triggers = page.locator('.assessment-item .a04-control .responsive-select-trigger');
  const triggerCount = await triggers.count();
  if (triggerCount < 2) throw new Error(`A04-FRQ-13 可见下拉数量不足：${triggerCount}`);
  for (let index = 0; index < triggerCount; index += 1) {
    const trigger = triggers.nth(index);
    await trigger.click();
    await trigger.press('ArrowDown');
    await trigger.press('ArrowUp');
    if ((await criterionId.textContent())?.trim() !== originalId) throw new Error(`A04 下拉方向键误切条款：第${index + 1}个下拉`);
    if (await page.locator('.responsive-select-list').count() !== 1) throw new Error(`A04 下拉方向键错误关闭面板：第${index + 1}个下拉`);
    await trigger.press('Escape');
    if (await page.locator('.responsive-select-list').count() !== 0) throw new Error(`A04 下拉 Esc 未收起：第${index + 1}个下拉`);
    if (!(await trigger.evaluate(element => document.activeElement === element))) throw new Error(`A04 下拉收起后焦点未回到触发器：第${index + 1}个下拉`);
  }
  const edgeTrigger = triggers.first();
  await edgeTrigger.evaluate(element => element.scrollIntoView({ block: 'end', inline: 'nearest' }));
  await edgeTrigger.click();
  await page.waitForTimeout(50);
  const bounds = await page.locator('.responsive-select-list').evaluate(element => {
    const rect = element.getBoundingClientRect();
    const options = Array.from(element.querySelectorAll<HTMLElement>('[role="option"]')).map(option => option.getBoundingClientRect());
    return { rect: [rect.top, rect.bottom], options: options.map(option => [option.top, option.bottom]), viewport: window.innerHeight };
  });
  if (bounds.options.some(([top, bottom]) => top < 0 || bottom > bounds.viewport)) throw new Error(`下拉面板贴边后存在视口外选项：${JSON.stringify(bounds)}`);
  await edgeTrigger.press('Escape');
}

async function assertSidebarFixed(page: import('playwright-core').Page) {
  const pageLabels = ['审核总览', '依据与差异', '审核报告'];
  for (const pageLabel of pageLabels) {
    if (pageLabel !== '审核总览') {
      await page.locator('button.nav-item').filter({ hasText: pageLabel }).click();
      await page.waitForTimeout(120);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(60);
    const result = await page.evaluate(`(() => {
      const selectors = ['.brand-title', '.nav-item:nth-child(1)', '.nav-item:nth-child(2)', '.nav-item:nth-child(3)', '.nav-item:nth-child(4)', '.nav-item:nth-child(5)', '.data-menu summary'];
      const read = () => selectors.map(selector => {
        const element = document.querySelector(selector);
        if (!element) return { selector, top: null, bottom: null, clickable: false };
        const rect = element.getBoundingClientRect();
        const point = document.elementFromPoint(rect.left + Math.min(rect.width / 2, 8), rect.top + rect.height / 2);
        return { selector, top: rect.top, bottom: rect.bottom, clickable: selector !== '.data-menu summary' || point === element || element.contains(point) };
      });
      return { before: read(), scrollHeight: document.documentElement.scrollHeight, viewportHeight: window.innerHeight };
    })()`) as { before: Array<{ selector: string; top: number | null; bottom: number | null; clickable: boolean }>; scrollHeight: number; viewportHeight: number };
    const before = result.before as Array<{ selector: string; top: number | null; bottom: number | null; clickable: boolean }>;
    const scrollPositions = [Math.max(0, Math.floor((result.scrollHeight - result.viewportHeight) / 2)), result.scrollHeight];
    for (const position of scrollPositions) {
      await page.evaluate((y) => window.scrollTo(0, y), position);
      await page.waitForTimeout(60);
      const after = await page.evaluate(`(() => {
        const selectors = ['.brand-title', '.nav-item:nth-child(1)', '.nav-item:nth-child(2)', '.nav-item:nth-child(3)', '.nav-item:nth-child(4)', '.nav-item:nth-child(5)', '.data-menu summary'];
        return selectors.map(selector => {
          const element = document.querySelector(selector);
          if (!element) return { selector, top: null, bottom: null, clickable: false };
          const rect = element.getBoundingClientRect();
          const point = document.elementFromPoint(rect.left + Math.min(rect.width / 2, 8), rect.top + rect.height / 2);
          return { selector, top: rect.top, bottom: rect.bottom, clickable: selector !== '.data-menu summary' || point === element || element.contains(point) };
        });
      })()`) as Array<{ selector: string; top: number | null; bottom: number | null; clickable: boolean }>;
      const failures = after.map((item, index) => {
        const initial = before[index];
        const delta = initial.top === null || item.top === null ? Number.POSITIVE_INFINITY : Math.abs(item.top - initial.top);
        const outOfView = item.selector === '.data-menu summary' && (item.top === null || item.bottom === null || item.top < 0 || item.bottom > result.viewportHeight);
        const notClickable = item.selector === '.data-menu summary' && !item.clickable;
        return delta > 1 || outOfView || notClickable ? { selector: item.selector, initialTop: initial.top, afterTop: item.top, delta, bottom: item.bottom, clickable: item.clickable } : null;
      }).filter(Boolean);
      if (failures.length) throw new Error(`侧栏固定性失败：${pageLabel}，滚动${position === result.scrollHeight ? '底部' : '中部'}，${JSON.stringify(failures)}`);
    }
  }
}

async function assertAssessmentDesktopLayout(page: import('playwright-core').Page) {
  const navItems = page.locator('button.nav-item');
  const navResult = await page.evaluate(`(() => Array.from(document.querySelectorAll('.nav-item')).map(element => {
    const rect = element.getBoundingClientRect();
    const point = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    return { visible: rect.width > 0 && rect.height > 0, hit: point === element || element.contains(point) };
  }))()` ) as Array<{ visible: boolean; hit: boolean }>;
  if (navResult.length !== 5 || navResult.some(item => !item.visible || !item.hit)) {
    throw new Error(`桌面导航项不可见或被遮挡：${JSON.stringify(navResult)}`);
  }
  await navItems.filter({ hasText: '分模块审核' }).click();
  await page.locator('.assessment-page').waitFor({ state: 'visible', timeout: 10_000 });
  const layout = await page.evaluate(`(() => {
    const root = document.documentElement;
    const moduleList = document.querySelector('.assessment-page .module-list');
    const criteriaPane = document.querySelector('.assessment-page .criteria-pane');
    const next = document.querySelector('.assessment-item-pagination .assessment-next-btn');
    if (!moduleList || !criteriaPane || !next) return null;
    const moduleRect = moduleList.getBoundingClientRect();
    const criteriaRect = criteriaPane.getBoundingClientRect();
    const nextRect = next.getBoundingClientRect();
    const moduleStyle = getComputedStyle(moduleList);
    const nextStyle = getComputedStyle(next);
    const previousStyle = getComputedStyle(document.querySelector('.assessment-previous-btn'));
    const rootStyle = getComputedStyle(root);
    return {
      distance: criteriaRect.left - moduleRect.right,
      expectedGap: Number.parseFloat(rootStyle.getPropertyValue('--space-4')),
      borderRight: moduleStyle.borderRightStyle !== 'none' && Number.parseFloat(moduleStyle.borderRightWidth) > 0,
      nextBackground: nextStyle.backgroundColor,
      nextColor: nextStyle.color,
      previousBackground: previousStyle.backgroundColor,
      previousColor: previousStyle.color,
      transparent: rootStyle.getPropertyValue('--color-transparent').trim(),
      nextBottom: nextRect.bottom,
      viewportHeight: window.innerHeight,
    };
  })()`) as { distance: number; expectedGap: number; borderRight: boolean; nextBackground: string; nextColor: string; previousBackground: string; previousColor: string; transparent: string; nextBottom: number; viewportHeight: number } | null;
  if (!layout) throw new Error('分模块审核桌面布局缺少必要元素');
  if (layout.distance + 1 < layout.expectedGap || !layout.borderRight) {
    throw new Error(`分栏间距或右侧分隔线不符合要求：${JSON.stringify(layout)}`);
  }
  if (layout.nextBackground === layout.transparent || layout.nextBackground === layout.previousBackground || layout.nextColor === layout.previousColor || layout.nextBackground === layout.nextColor || layout.nextBottom > layout.viewportHeight + 1) {
    throw new Error(`桌面下一项按钮样式或位置不符合要求：${JSON.stringify(layout)}`);
  }
  const pagination = await page.evaluate(`(() => {
    const pane = document.querySelector('.assessment-page .criteria-pane');
    const pagination = document.querySelector('.assessment-item-pagination');
    if (!pane || !pagination) return null;
    const paneRect = pane.getBoundingClientRect();
    const paginationRect = pagination.getBoundingClientRect();
    const previous = pagination.querySelector('.assessment-previous-btn')?.getBoundingClientRect();
    const next = pagination.querySelector('.assessment-next-btn')?.getBoundingClientRect();
    return { pane: [paneRect.left, paneRect.right], pagination: [paginationRect.left, paginationRect.right], previous: previous ? [previous.left, previous.right] : null, next: next ? [next.left, next.right] : null };
  })()`) as { pane: [number, number]; pagination: [number, number]; previous: [number, number] | null; next: [number, number] | null } | null;
  if (!pagination || !pagination.previous || !pagination.next || pagination.pagination[0] < pagination.pane[0] - 1 || pagination.pagination[1] > pagination.pane[1] + 1 || pagination.previous[0] < pagination.pagination[0] - 1 || pagination.next[1] > pagination.pagination[1] + 1) {
    throw new Error(`审核分页未与条款区边缘对齐：${JSON.stringify(pagination)}`);
  }
}

async function assertSourceDesktopLayout(page: import('playwright-core').Page) {
  await page.locator('button.nav-item').filter({ hasText: '依据与差异' }).click();
  await page.locator('.source-page').waitFor({ state: 'visible', timeout: 10_000 });
  const layout = await page.evaluate(`(() => {
    const workspace = document.querySelector('.source-workspace');
    const chapterList = document.querySelector('.source-chapter-list');
    const controls = document.querySelector('.source-controls');
    const cards = Array.from(document.querySelectorAll('.source-card')).map(element => element.getBoundingClientRect());
    const groupHeadings = document.querySelectorAll('.clause-group-heading').length;
    const firstTwo = Array.from(document.querySelectorAll('.clause-card')).slice(0, 2).map(element => element.getBoundingClientRect());
    const type = document.querySelector('.clause-type');
    const typeStyle = type ? getComputedStyle(type) : null;
    const chapterStyle = chapterList ? getComputedStyle(chapterList) : null;
    const workspaceStyle = workspace ? getComputedStyle(workspace) : null;
    return {
      cardsVisible: cards.every(rect => rect.width > 0 && rect.height > 0),
      cardsCompact: cards.length === 3 && cards.every(rect => rect.height < 12 * parseFloat(getComputedStyle(document.documentElement).fontSize)),
      firstTwoVisible: firstTwo.length === 2 && firstTwo[0].bottom <= window.innerHeight,
      grouped: groupHeadings > 0,
      sticky: controls ? getComputedStyle(controls).position === 'sticky' : false,
      gap: workspaceStyle ? parseFloat(workspaceStyle.columnGap) : 0,
      expectedGap: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--space-4')),
      divider: chapterStyle ? chapterStyle.borderRightStyle !== 'none' : false,
      typeLine: typeStyle ? typeStyle.outlineStyle !== 'none' && typeStyle.backgroundColor === 'rgba(0, 0, 0, 0)' : false,
    };
  })()`) as { cardsVisible: boolean; cardsCompact: boolean; firstTwoVisible: boolean; grouped: boolean; sticky: boolean; gap: number; expectedGap: number; divider: boolean; typeLine: boolean };
  if (!layout.cardsVisible || !layout.cardsCompact || !layout.firstTwoVisible || !layout.grouped || !layout.sticky || layout.gap + 1 < layout.expectedGap || !layout.divider || !layout.typeLine) {
    throw new Error(`依据库桌面布局不符合要求：${JSON.stringify(layout)}`);
  }
  const search = page.locator('.source-search input');
  await search.fill('不存在的依据关键词');
  await page.locator('.source-reset').click();
  if ((await search.inputValue()) !== '') throw new Error('依据库重置筛选未清空关键词');
}

async function assertDataMenuStacking(page: import('playwright-core').Page) {
  await page.evaluate(() => window.scrollTo(0, 0));
  const summary = page.locator('.data-menu summary');
  await summary.click();
  const result = await page.evaluate(`(() => {
    const panel = document.querySelector('.data-menu-panel');
    const sidebar = document.querySelector('.sidebar');
    if (!panel || !sidebar) return null;
    const panelRect = panel.getBoundingClientRect();
    const sidebarRect = sidebar.getBoundingClientRect();
    const buttons = Array.from(panel.querySelectorAll('button')).map(element => {
      const rect = element.getBoundingClientRect();
      const point = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
      return { top: rect.top, bottom: rect.bottom, hit: point === element || element.contains(point) };
    });
    const left = Math.max(panelRect.left, sidebarRect.left);
    const right = Math.min(panelRect.right, sidebarRect.right);
    const top = Math.max(panelRect.top, sidebarRect.top);
    const bottom = Math.min(panelRect.bottom, sidebarRect.bottom);
    const overlapPoint = left < right && top < bottom ? document.elementFromPoint((left + right) / 2, (top + bottom) / 2) : null;
    return { panel: [panelRect.top, panelRect.bottom], viewport: window.innerHeight, buttons, overlapHit: overlapPoint ? panel.contains(overlapPoint) : true };
  })()`) as { panel: [number, number]; viewport: number; buttons: Array<{ top: number; bottom: number; hit: boolean }>; overlapHit: boolean } | null;
  await summary.click();
  if (!result || result.panel[0] < -1 || result.panel[1] > result.viewport + 1 || result.buttons.some(button => button.top < -1 || button.bottom > result.viewport + 1 || !button.hit) || !result.overlapHit) {
    throw new Error(`数据菜单层级或可点击性异常：${JSON.stringify(result)}`);
  }
}

type RuleLine = { y: number; x1: number; x2: number; color: string; selector: string; block: string };

async function collectRuleLines(page: import('playwright-core').Page, rootSelector: string): Promise<{ lines: RuleLine[]; threshold: number; viewport: number; overlaps: Array<{ first: RuleLine; second: RuleLine }>; black: string; blackInBlock: number; controlsToFirstClause: number }> {
  return await page.evaluate(`(() => {
    const root = document.querySelector(${JSON.stringify(rootSelector)});
    if (!root) return { lines: [], threshold: 0, viewport: window.innerHeight };
    const rootStyle = getComputedStyle(document.documentElement);
    const fontSize = Number.parseFloat(rootStyle.fontSize) || 16;
    const spaceValue = rootStyle.getPropertyValue('--space-2').trim();
    const threshold = spaceValue.endsWith('rem') ? Number.parseFloat(spaceValue) * fontSize : Number.parseFloat(spaceValue) || 0;
    const selectorFor = element => {
      const parts = [];
      let current = element;
      for (let index = 0; current && current !== root && index < 4; index += 1, current = current.parentElement) {
        let part = current.tagName.toLowerCase();
        if (current.id) part += '#' + current.id;
        if (current.classList.length) part += '.' + Array.from(current.classList).slice(0, 2).join('.');
        parts.unshift(part);
      }
      return parts.join(' > ');
    };
    const lines = [];
    const elements = [root, ...Array.from(root.querySelectorAll('*'))];
    for (const element of elements) {
      const rect = element.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) continue;
      const style = getComputedStyle(element);
      const block = element.closest('.source-cards') ? 'source-cards' : element.closest('.source-difference') ? 'source-difference' : '';
      const topWidth = Number.parseFloat(style.borderTopWidth) || 0;
      const bottomWidth = Number.parseFloat(style.borderBottomWidth) || 0;
      if (topWidth > 0 && style.borderTopStyle !== 'none') lines.push({ y: rect.top + topWidth / 2, x1: rect.left, x2: rect.right, color: style.borderTopColor, selector: selectorFor(element) + ':border-top', block });
      if (bottomWidth > 0 && style.borderBottomStyle !== 'none') lines.push({ y: rect.bottom - bottomWidth / 2, x1: rect.left, x2: rect.right, color: style.borderBottomColor, selector: selectorFor(element) + ':border-bottom', block });
    }
    const controls = root.querySelector('.source-controls');
    const controlsRect = controls ? controls.getBoundingClientRect() : null;
    const visibleLines = controlsRect ? lines.filter(line => line.selector.startsWith('div.source-controls') || line.y < controlsRect.top || line.y > controlsRect.bottom) : lines;
    const overlaps = [];
    for (let first = 0; first < visibleLines.length; first += 1) {
      for (let second = first + 1; second < visibleLines.length; second += 1) {
        const a = visibleLines[first];
        const b = visibleLines[second];
        const overlap = Math.min(a.x2, b.x2) - Math.max(a.x1, b.x1);
        const shorter = Math.min(a.x2 - a.x1, b.x2 - b.x1);
        if (Math.abs(a.y - b.y) < threshold && overlap > shorter * 0.5) overlaps.push({ first: a, second: b });
      }
    }
    const tokenProbe = document.createElement('span');
    tokenProbe.style.color = rootStyle.getPropertyValue('--color-text').trim();
    document.body.appendChild(tokenProbe);
    const black = getComputedStyle(tokenProbe).color;
    tokenProbe.remove();
    const blackLines = visibleLines.filter(line => line.color === black);
    return { lines: visibleLines, threshold, viewport: window.innerHeight, overlaps, black, blackInBlock: blackLines.filter(line => line.block).length, controlsToFirstClause: visibleLines.filter(line => { const firstClause = root.querySelector('.clause-card'); if (!controlsRect || !firstClause) return false; const clauseRect = firstClause.getBoundingClientRect(); return line.color === black && line.y >= controlsRect.bottom - 1 && line.y <= clauseRect.top + 1; }).length };
  })()`) as { lines: RuleLine[]; threshold: number; viewport: number; overlaps: Array<{ first: RuleLine; second: RuleLine }>; black: string; blackInBlock: number; controlsToFirstClause: number };
}

async function assertSourceLineRules(page: import('playwright-core').Page, width: number, height: number) {
  await page.locator('button.nav-item').filter({ hasText: '依据与差异' }).click();
  await page.locator('.source-page').waitFor({ state: 'visible', timeout: 10_000 });
  for (const scrollY of [0, 600]) {
    await page.evaluate((position) => window.scrollTo(0, position), scrollY);
    await page.waitForTimeout(60);
    const result = await collectRuleLines(page, '.source-page');
    if (result.overlaps.length) {
      const details = result.overlaps.slice(0, 8).map(item => `${item.first.selector} ↔ ${item.second.selector} Δy=${Math.abs(item.first.y - item.second.y).toFixed(2)}`).join('；');
      throw new Error(`依据库叠线（${width}×${height}，滚动${scrollY}）：${details}`);
    }
    if (result.blackInBlock > 2 || result.controlsToFirstClause > 1) {
      throw new Error(`依据库黑线数量超限（${width}×${height}，滚动${scrollY}）：区块=${result.blackInBlock}，筛选栏至首条款=${result.controlsToFirstClause}`);
    }
    const visibility = await page.evaluate(`(() => {
      const elements = ['.source-chapter-list-title', '.source-chapter-list button:first-of-type'].map(selector => document.querySelector(selector));
      return elements.map(element => {
        if (!element) return { selector: '', visible: false, hit: false };
        const rect = element.getBoundingClientRect();
        const point = document.elementFromPoint(rect.left + Math.min(rect.width / 2, 8), rect.top + rect.height / 2);
        return { selector: element.className, visible: rect.top >= -1 && rect.bottom <= window.innerHeight + 1 && rect.width > 0 && rect.height > 0, hit: point === element || element.contains(point) };
      });
    })()`) as Array<{ selector: string; visible: boolean; hit: boolean }>;
    if (visibility.some(item => !item.visible || !item.hit)) throw new Error(`依据库章节索引被遮挡（${width}×${height}，滚动${scrollY}）：${JSON.stringify(visibility)}`);
  }
}

async function reportLineOverlaps(page: import('playwright-core').Page, pageLabel: string, width: number, height: number) {
  await page.locator('button.nav-item').filter({ hasText: pageLabel }).click();
  await page.waitForTimeout(80);
  const rootSelector = pageLabel === '审核总览' ? '.dashboard-page' : pageLabel === '分模块审核' ? '.assessment-page' : pageLabel === '整改清单' ? '.remediation-page' : '.report-page';
  for (const scrollY of [0, 600]) {
    await page.evaluate((position) => window.scrollTo(0, position), scrollY);
    await page.waitForTimeout(40);
    const result = await collectRuleLines(page, rootSelector);
    const summary = result.overlaps.length ? result.overlaps.slice(0, 8).map(item => `${item.first.selector} ↔ ${item.second.selector}`).join('；') : '无';
    console.log(`叠线报告 ${pageLabel} ${width}×${height} 滚动${scrollY}：${result.overlaps.length} 处${result.overlaps.length ? `（${summary}）` : ''}`);
  }
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
      await assertReportCountLabels(page, '现行基线计分项目');
      await assertRemediationRowsAligned(page);
      await assertSourceDesktopLayout(page);
      await assertDataMenuStacking(page);
      await assertSidebarFixed(page);
      await assertAssessmentDesktopLayout(page);
      if (item.width === 1024) {
        await assertNarrowDesktopText(page);
        await assertCustomSelectKeyboard(page);
        await assertA04SelectKeyboardAndEdge(page);
        console.log('1024px 断行、自定义下拉键盘、A04方向键隔离与贴边检查通过。');
      }
      await context.close();
    }
    for (const item of sidebarCases) {
      const context = await browser.newContext({ viewport: item, timezoneId: 'Asia/Shanghai' });
      const page = await context.newPage();
      await importSample(page);
      await assertSidebarFixed(page);
      console.log(`${item.width}×${item.height}: 侧栏标题、五个导航项和数据按钮滚动坐标稳定，数据按钮可见可点击。`);
      await context.close();
    }
    for (const item of [{ width: 1024, height: 768 }, { width: 1280, height: 720 }, { width: 1920, height: 1080 }]) {
      const context = await browser.newContext({ viewport: item, timezoneId: 'Asia/Shanghai' });
      const page = await context.newPage();
      await importSample(page);
      await assertSourceLineRules(page, item.width, item.height);
      for (const pageLabel of ['审核总览', '分模块审核', '整改清单', '审核报告']) await reportLineOverlaps(page, pageLabel, item.width, item.height);
      await context.close();
    }
    const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Shanghai' });
    const mobilePage = await mobileContext.newPage();
    await importSample(mobilePage);
    await assertReportCountLabels(mobilePage, '国内适用项目');
    await mobileContext.close();
    console.log('桌面四档尺寸、计数标签、整改六列对齐及移动端标签检查通过。');
  } finally {
    await browser?.close();
    if (!preview.killed) preview.kill('SIGTERM');
    await sleep(150);
  }
}

await main();
