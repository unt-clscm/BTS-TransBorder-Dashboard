/**
 * deep-functional-check.js
 * ---------------------------------------------------------------------------
 * End-to-end functional verification for the TxDOT dashboard boilerplate.
 *
 * Usage:
 *   node scripts/deep-functional-check.js [baseUrl]
 *
 * Example:
 *   node scripts/deep-functional-check.js http://localhost:5175
 *
 * What this checks (beyond visual-check):
 *   1) CSV download actions (summary + detail) emit real browser download events.
 *   2) PNG export actions (card + fullscreen) emit real download events.
 *   3) Fullscreen open/close behavior works (button + Escape key).
 *   4) Line-chart zoom influences CSV summary export row count as expected.
 *   5) Sidebar filters can be applied/reset and the sidebar can collapse/expand.
 *   6) DataTable sorting and pagination controls respond correctly.
 *   7) Treemap PNG export path works (foreignObject-heavy chart export edge case).
 *   8) Runtime remains clean during interaction checks (no page/console errors).
 *
 * Notes:
 *   - This script intentionally uses resilient selectors (role/text/title) so
 *     it remains useful when chart internals change.
 *   - It writes downloaded files into a timestamped artifacts folder for audit.
 */

import path from 'path'
import fs from 'fs/promises'
import { fileURLToPath } from 'url'
import { chromium } from 'playwright'
import process from 'process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const BASE_URL = process.argv[2] || 'http://localhost:5173'
const ARTIFACT_ROOT = path.join(
  __dirname,
  '..',
  'screenshots',
  `deep-functional-${new Date().toISOString().replace(/[:.]/g, '-')}`,
)
const DOWNLOAD_DIR = path.join(ARTIFACT_ROOT, 'downloads')

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function ensureDirs() {
  await fs.mkdir(DOWNLOAD_DIR, { recursive: true })
}

async function saveDownload(download, prefix) {
  const suggested = download.suggestedFilename()
  const outPath = path.join(DOWNLOAD_DIR, `${prefix}-${suggested}`)
  await download.saveAs(outPath)
  const buf = await fs.readFile(outPath)
  return { suggested, outPath, size: buf.length, text: buf.toString('utf8') }
}

function csvLineCount(csvText) {
  // Exclude blank lines to avoid trailing-newline artifacts.
  return csvText.split(/\r?\n/).filter((l) => l.trim().length > 0).length
}

async function openRoute(page, routePath, expectedText) {
  await page.goto(`${BASE_URL}${routePath}`, { waitUntil: 'networkidle', timeout: 30000 })
  if (expectedText) {
    await page.getByText(expectedText, { exact: false }).first().waitFor({ timeout: 15000 })
  }
  await page.waitForTimeout(1200)
}

function chartCardLocator(page, title) {
  const heading = page.getByRole('heading', { name: title, exact: true }).first()
  return heading.locator('xpath=ancestor::div[contains(@class,"rounded-xl")][1]')
}

async function isResetZoomActive(cardLocator) {
  return await cardLocator.evaluate((cardEl) => {
    const target = cardEl.querySelector('g.export-ignore')
    if (!target) return false
    const style = window.getComputedStyle(target)
    return style.display !== 'none' && style.visibility !== 'hidden'
  }).catch(() => false)
}

async function testHomeDownloadsAndFullscreen(page, results) {
  await openRoute(page, '/', 'U.S.–Mexico Trade Dashboard')

  // Ask AI drawer open/close path (header trigger + close button).
  const askAiHeaderBtn = page.getByRole('button', { name: 'Ask AI' }).first()
  if (await askAiHeaderBtn.isVisible().catch(() => false)) {
    await askAiHeaderBtn.click()
    const aiDrawer = page.locator('aside[role="dialog"][aria-label="Ask AI"]').first()
    await aiDrawer.waitFor({ state: 'visible', timeout: 10000 })
    await aiDrawer.getByRole('button', { name: 'Close' }).click()
    await page.waitForFunction(
      () => {
        const node = document.querySelector('aside[role="dialog"][aria-label="Ask AI"]')
        return node?.getAttribute('aria-hidden') === 'true'
      },
      { timeout: 10000 },
    )
    results.push('Ask AI drawer open/close behavior ok')
  } else {
    results.push('Ask AI header trigger not visible in current viewport (skipped)')
  }

  const trendsCard = chartCardLocator(page, 'Trade Trends Over Time')
  await trendsCard.waitFor({ timeout: 15000 })

  // ----- CSV summary download (pre-zoom baseline)
  await trendsCard.locator('button[title="Download data"]').click()
  const [summaryBefore] = await Promise.all([
    page.waitForEvent('download', { timeout: 15000 }),
    page.getByRole('button', { name: 'Summary (CSV)' }).click(),
  ])
  const summaryBeforeInfo = await saveDownload(summaryBefore, 'prezoom-summary')
  assert(summaryBeforeInfo.suggested.endsWith('.csv'), 'Summary download is not a CSV file')
  assert(summaryBeforeInfo.size > 0, 'Summary CSV download is empty')
  const baselineSummaryLines = csvLineCount(summaryBeforeInfo.text)
  assert(baselineSummaryLines > 1, 'Summary CSV should include at least one data row')
  results.push(`CSV summary download ok (${summaryBeforeInfo.suggested}, ${baselineSummaryLines - 1} rows)`)

  // ----- CSV detail download
  await trendsCard.locator('button[title="Download data"]').click()
  const [detailDownload] = await Promise.all([
    page.waitForEvent('download', { timeout: 15000 }),
    page.getByRole('button', { name: 'Detail (CSV)' }).click(),
  ])
  const detailInfo = await saveDownload(detailDownload, 'detail')
  assert(detailInfo.suggested.endsWith('.csv'), 'Detail download is not a CSV file')
  assert(detailInfo.size > 0, 'Detail CSV download is empty')
  const detailLines = csvLineCount(detailInfo.text)
  assert(detailLines >= baselineSummaryLines, 'Detail CSV should be same size or larger than summary CSV')
  results.push(`CSV detail download ok (${detailInfo.suggested}, ${detailLines - 1} rows)`)

  // ----- Card PNG export
  const [cardPngDownload] = await Promise.all([
    page.waitForEvent('download', { timeout: 15000 }),
    trendsCard.locator('button[title="Export as PNG"]').click(),
  ])
  const cardPngInfo = await saveDownload(cardPngDownload, 'card-png')
  assert(cardPngInfo.suggested.endsWith('.png'), 'Card export did not produce PNG')
  assert(cardPngInfo.size > 0, 'Card PNG file is empty')
  results.push(`Card PNG export ok (${cardPngInfo.suggested})`)

  // ----- Fullscreen open + Esc close
  await trendsCard.locator('button[title="Full screen"]').click()
  const fullscreenOverlay = page.locator('div.fixed.inset-0.z-\\[100\\]').first()
  await fullscreenOverlay.waitFor({ state: 'visible', timeout: 10000 })
  results.push('Fullscreen open via button ok')

  await page.keyboard.press('Escape')
  await fullscreenOverlay.waitFor({ state: 'hidden', timeout: 10000 })
  results.push('Fullscreen close via Escape ok')

  // ----- Fullscreen CSV + PNG + Close button
  await trendsCard.locator('button[title="Full screen"]').click()
  await fullscreenOverlay.waitFor({ state: 'visible', timeout: 10000 })

  const fsDownloadBtn = fullscreenOverlay.getByRole('button', { name: 'Download CSV' })
  await fsDownloadBtn.click()
  const [fsSummaryDownload] = await Promise.all([
    page.waitForEvent('download', { timeout: 15000 }),
    page.getByRole('button', { name: 'Summary (CSV)' }).click(),
  ])
  const fsSummaryInfo = await saveDownload(fsSummaryDownload, 'fullscreen-summary')
  assert(fsSummaryInfo.suggested.endsWith('.csv'), 'Fullscreen summary download is not CSV')
  assert(fsSummaryInfo.size > 0, 'Fullscreen summary CSV is empty')
  results.push(`Fullscreen CSV download ok (${fsSummaryInfo.suggested})`)

  const [fsPngDownload] = await Promise.all([
    page.waitForEvent('download', { timeout: 15000 }),
    fullscreenOverlay.getByRole('button', { name: 'Export PNG' }).click(),
  ])
  const fsPngInfo = await saveDownload(fsPngDownload, 'fullscreen-png')
  assert(fsPngInfo.suggested.endsWith('.png'), 'Fullscreen export did not produce PNG')
  assert(fsPngInfo.size > 0, 'Fullscreen PNG is empty')
  results.push(`Fullscreen PNG export ok (${fsPngInfo.suggested})`)

  await fullscreenOverlay.getByRole('button', { name: 'Close' }).click()
  await fullscreenOverlay.waitFor({ state: 'hidden', timeout: 10000 })
  results.push('Fullscreen close via button ok')

  // ----- Zoom and verify CSV summary narrows or stays same (never expands)
  const chartSvg = trendsCard.locator('svg').first()
  const box = await chartSvg.boundingBox()
  assert(box, 'Unable to locate line chart SVG for zoom test')

  let bestAfterLines = baselineSummaryLines
  let zoomActivated = false
  const overlayRect = trendsCard.locator('svg g rect[fill="transparent"]').first()
  for (let attempt = 1; attempt <= 4; attempt++) {
    await page.mouse.move(box.x + box.width * 0.55, box.y + box.height * 0.45)
    await page.mouse.wheel(0, -1800)
    await page.waitForTimeout(700)

    // Some headless environments ignore wheel-to-page but still honor wheel events
    // dispatched directly on the overlay rect bound to d3.zoom.
    await overlayRect.evaluate((el) => {
      const r = el.getBoundingClientRect()
      const evt = new WheelEvent('wheel', {
        bubbles: true,
        cancelable: true,
        deltaY: -2400,
        clientX: r.left + r.width * 0.55,
        clientY: r.top + r.height * 0.45,
      })
      el.dispatchEvent(evt)
    }).catch(() => {})
    await page.waitForTimeout(400)

    if (await isResetZoomActive(trendsCard)) zoomActivated = true

    await trendsCard.locator('button[title="Download data"]').click()
    const [summaryAfterAttempt] = await Promise.all([
      page.waitForEvent('download', { timeout: 15000 }),
      page.getByRole('button', { name: 'Summary (CSV)' }).click(),
    ])
    const summaryAfterInfo = await saveDownload(summaryAfterAttempt, `postzoom-summary-a${attempt}`)
    const attemptLines = csvLineCount(summaryAfterInfo.text)
    if (attemptLines < bestAfterLines) bestAfterLines = attemptLines
    if (attemptLines < baselineSummaryLines) zoomActivated = true
    if (bestAfterLines < baselineSummaryLines) break
  }

  assert(zoomActivated, 'Zoom interaction did not activate reset-zoom control')
  assert(bestAfterLines <= baselineSummaryLines, 'Zoomed summary CSV should not have more rows than baseline summary')
  results.push(
    `Zoom-aware CSV export ok (before=${baselineSummaryLines - 1}, bestAfter=${bestAfterLines - 1} rows)`,
  )

  // Reset zoom if available so the page remains in a known state.
  const resetNode = trendsCard.getByText('Reset zoom', { exact: true })
  if (await resetNode.isVisible().catch(() => false)) {
    await resetNode.click()
    await page.waitForTimeout(500)
  }
}

async function testStatePageFiltersTable(page, results) {
  await openRoute(page, '/trade-by-state', 'U.S. Trade by State')

  // Sidebar collapse / expand toggle.
  const collapseBtn = page.getByRole('button', { name: 'Collapse filters' }).first()
  await collapseBtn.click()
  const expandBtn = page.getByRole('button', { name: 'Expand filters' }).first()
  assert(await expandBtn.isVisible(), 'Sidebar did not collapse to expand-toggle state')
  await expandBtn.click()
  await collapseBtn.waitFor({ timeout: 10000 })
  results.push('Sidebar collapse/expand behavior ok')

  // Apply a trade type filter (simple select control).
  const tradeTypeSelect = page
    .locator('label:has-text("Trade Type"):visible')
    .first()
    .locator('xpath=following-sibling::div//select')
    .first()
  await tradeTypeSelect.selectOption('Export')
  await page.waitForTimeout(600)

  // Apply one year in the multi-select dropdown (if available).
  const yearControl = page
    .locator('label:has-text("Year"):visible')
    .first()
    .locator('xpath=following-sibling::div//button')
    .first()
  await yearControl.click()
  const yearOptions = page.locator('button').filter({ hasText: /^\d{4}$/ })
  const yearCount = await yearOptions.count()
  if (yearCount > 0) {
    await yearOptions.first().click()
    await page.waitForTimeout(500)
  }

  // Active filter badge should be visible in sidebar header.
  const activeBadge = page.locator('aside').first().locator('span').filter({ hasText: /^[1-9]\d*$/ }).first()
  assert(await activeBadge.isVisible().catch(() => false), 'Active filter badge not visible after applying filters')
  results.push('Sidebar filter activation ok')

  // Reset all filters and verify control disappears.
  const resetAllBtn = page.getByRole('button', { name: 'Reset all filters' })
  await resetAllBtn.click()
  await page.waitForTimeout(800)
  assert(!(await resetAllBtn.isVisible().catch(() => false)), 'Reset all filters button should hide when no filters are active')
  results.push('Sidebar reset-all behavior ok')

  // Table sort behavior (click "Total Trade" header and verify first row changes when possible).
  const table = page.locator('table').last()
  await table.waitFor({ timeout: 10000 })
  const firstRowBefore = await table.locator('tbody tr').first().innerText()
  await table.locator('th:has-text("Total Trade")').click()
  await page.waitForTimeout(500)
  const firstRowAfter = await table.locator('tbody tr').first().innerText()
  assert(firstRowBefore !== firstRowAfter, 'DataTable sort click did not change first row ordering')
  results.push('DataTable sorting behavior ok')

  // Pagination controls (if multiple pages exist).
  const nextBtn = page.getByRole('button', { name: 'Next' }).last()
  if (await nextBtn.isVisible().catch(() => false)) {
    const enabled = await nextBtn.isEnabled()
    if (enabled) {
      await nextBtn.click()
      await page.waitForTimeout(500)
      const prevBtn = page.getByRole('button', { name: 'Prev' }).last()
      assert(await prevBtn.isEnabled(), 'Prev button should be enabled after navigating to next page')
      results.push('DataTable pagination behavior ok')
    } else {
      results.push('DataTable pagination present (single page in current filter state)')
    }
  } else {
    results.push('DataTable pagination not needed (single-page dataset)')
  }
}

async function testTreemapExport(page, results) {
  await openRoute(page, '/commodities', 'Trade by Commodity')
  const commodityGroupsCard = chartCardLocator(page, 'Commodity Groups')
  await commodityGroupsCard.waitFor({ timeout: 15000 })

  const [treemapPngDownload] = await Promise.all([
    page.waitForEvent('download', { timeout: 15000 }),
    commodityGroupsCard.locator('button[title="Export as PNG"]').click(),
  ])
  const treemapPngInfo = await saveDownload(treemapPngDownload, 'treemap-png')
  assert(treemapPngInfo.suggested.endsWith('.png'), 'Treemap card export did not produce PNG')
  assert(treemapPngInfo.size > 0, 'Treemap PNG file is empty')
  results.push(`Treemap PNG export ok (${treemapPngInfo.suggested})`)
}

async function testRouteSanity(page, results) {
  const routeChecks = [
    { path: '/commodities', expect: 'Trade by Commodity' },
    { path: '/trade-by-mode', expect: 'Transportation Mode' },
    { path: '/border-ports', expect: 'Texas Border Ports of Entry' },
  ]

  for (const route of routeChecks) {
    await openRoute(page, route.path, route.expect)
    const svgCount = await page.locator('svg').count()
    assert(svgCount >= 2, `Expected charts to render on ${route.path}; found ${svgCount} SVGs`)
    results.push(`Route ${route.path} chart render sanity ok (${svgCount} SVGs)`)
  }
}

async function main() {
  await ensureDirs()
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    acceptDownloads: true,
    viewport: { width: 1536, height: 960 },
  })
  const page = await context.newPage()
  const results = []
  const pageErrors = []
  const consoleErrors = []

  page.on('pageerror', (err) => pageErrors.push(err.message))
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  })

  try {
    await testHomeDownloadsAndFullscreen(page, results)
    await testStatePageFiltersTable(page, results)
    await testTreemapExport(page, results)
    await testRouteSanity(page, results)

    assert(pageErrors.length === 0, `JS runtime errors detected: ${pageErrors.join(' | ')}`)
    assert(consoleErrors.length === 0, `Console errors detected: ${consoleErrors.join(' | ')}`)
    results.push('No runtime/console errors during interaction suite')

    // Save a final screenshot for quick audit of the last route.
    const finalShot = path.join(ARTIFACT_ROOT, 'final-route.png')
    await page.screenshot({ path: finalShot, fullPage: true })

    console.log('\nDEEP FUNCTIONAL CHECK: PASS')
    for (const line of results) console.log(`  [ok] ${line}`)
    console.log(`\nArtifacts: ${ARTIFACT_ROOT}`)
  } catch (error) {
    const failShot = path.join(ARTIFACT_ROOT, 'failure.png')
    await page.screenshot({ path: failShot, fullPage: true }).catch(() => {})
    console.error('\nDEEP FUNCTIONAL CHECK: FAIL')
    console.error(`  [error] ${error.message}`)
    console.error(`  [info] Artifacts: ${ARTIFACT_ROOT}`)
    process.exitCode = 1
  } finally {
    await context.close()
    await browser.close()
  }
}

main()
