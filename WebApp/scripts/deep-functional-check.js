/**
 * deep-functional-check.js
 * ---------------------------------------------------------------------------
 * End-to-end functional verification for the TransBorder freight dashboard.
 *
 * Usage:
 *   node scripts/deep-functional-check.js [baseUrl]
 *
 * What this checks:
 *   1) All 8 pages render without JS errors
 *   2) Charts render on data pages (SVG count >= 2)
 *   3) PNG export works on chart cards
 *   4) Fullscreen open/close works (button + Escape key)
 *   5) Sidebar filter collapse/expand/reset works
 *   6) DataTable sorting and pagination work
 *   7) Treemap renders on commodity page
 *   8) CSV download wiring status (reports whether downloadData is connected)
 *
 * Notes:
 *   - App uses HashRouter — all routes prefixed with /#/
 *   - Uses resilient selectors (title/role/text) for stability
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

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function ensureDirs() {
  await fs.mkdir(ARTIFACT_ROOT, { recursive: true })
}

async function saveDownload(download, prefix) {
  const suggested = download.suggestedFilename()
  const outPath = path.join(ARTIFACT_ROOT, `${prefix}-${suggested}`)
  await download.saveAs(outPath)
  const buf = await fs.readFile(outPath)
  return { suggested, outPath, size: buf.length }
}

async function openRoute(page, hashPath, expectedText) {
  const url = `${BASE_URL}/#${hashPath}`
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })
  if (expectedText) {
    await page.getByText(expectedText, { exact: false }).first().waitFor({ timeout: 15000 })
  }
  await page.waitForTimeout(1500)
}

function chartCardLocator(page, titleSubstr) {
  const heading = page.getByRole('heading', { name: titleSubstr, exact: false }).first()
  return heading.locator('xpath=ancestor::div[contains(@class,"rounded-xl")][1]')
}

/* ── Test 1: All routes render without crashing ── */
async function testAllRoutes(page, results) {
  const routes = [
    { path: '/', expect: 'TransBorder Freight Data', name: 'Overview', minSvgs: 2 },
    { path: '/us-mexico', expect: 'Mexico', name: 'US-Mexico', minSvgs: 2 },
    { path: '/us-mexico/ports', expect: 'Ports of Entry', name: 'US-Mexico Ports', minSvgs: 1 },
    { path: '/texas-mexico', expect: 'Mexico', name: 'Texas-Mexico', minSvgs: 1 },
    { path: '/trade-by-mode', expect: 'Transportation Mode', name: 'Trade by Mode', minSvgs: 2 },
    { path: '/commodities', expect: 'Commodity', name: 'Commodities', minSvgs: 2 },
    { path: '/trade-by-state', expect: 'State', name: 'Trade by State', minSvgs: 2 },
    { path: '/about', expect: 'About', name: 'About', minSvgs: 0 },
  ]

  for (const route of routes) {
    await openRoute(page, route.path, route.expect)
    const svgCount = await page.locator('svg').count()
    assert(svgCount >= route.minSvgs,
      `${route.name} (${route.path}): expected >= ${route.minSvgs} SVGs, found ${svgCount}`)
    await page.screenshot({
      path: path.join(ARTIFACT_ROOT, `route-${route.name.replace(/\s/g, '-')}.png`),
      fullPage: true,
    })
    results.push(`${route.name} (${route.path}) renders ok (${svgCount} SVGs)`)
  }
}

/* ── Test 2: PNG export on a chart card ── */
async function testPngExport(page, results) {
  await openRoute(page, '/', 'TransBorder Freight Data')

  // Find the first chart card with an export button
  const exportBtn = page.locator('button[title="Export as PNG"]').first()
  await exportBtn.waitFor({ timeout: 10000 })

  const [pngDownload] = await Promise.all([
    page.waitForEvent('download', { timeout: 15000 }),
    exportBtn.click(),
  ])
  const pngInfo = await saveDownload(pngDownload, 'chart-png')
  assert(pngInfo.suggested.endsWith('.png'), 'Export did not produce PNG')
  assert(pngInfo.size > 5000, `PNG file suspiciously small (${pngInfo.size} bytes)`)
  results.push(`PNG export ok (${pngInfo.suggested}, ${(pngInfo.size / 1024).toFixed(0)} KB)`)
}

/* ── Test 3: Fullscreen open/close ── */
async function testFullscreen(page, results) {
  await openRoute(page, '/', 'TransBorder Freight Data')

  const fullscreenBtn = page.locator('button[title="Full screen"]').first()
  await fullscreenBtn.waitFor({ timeout: 10000 })

  // Open via button
  await fullscreenBtn.click()
  const overlay = page.locator('div.fixed.inset-0.z-\\[100\\]').first()
  await overlay.waitFor({ state: 'visible', timeout: 10000 })
  results.push('Fullscreen open via button ok')

  // Take a screenshot in fullscreen
  await page.screenshot({ path: path.join(ARTIFACT_ROOT, 'fullscreen-open.png') })

  // Close via Escape
  await page.keyboard.press('Escape')
  await overlay.waitFor({ state: 'hidden', timeout: 10000 })
  results.push('Fullscreen close via Escape ok')

  // Open again and close via button
  await fullscreenBtn.click()
  await overlay.waitFor({ state: 'visible', timeout: 10000 })

  // Fullscreen PNG export
  const fsPngBtn = overlay.locator('button[title="Export as PNG"]')
  const [fsPng] = await Promise.all([
    page.waitForEvent('download', { timeout: 15000 }),
    fsPngBtn.click(),
  ])
  const fsPngInfo = await saveDownload(fsPng, 'fullscreen-png')
  assert(fsPngInfo.size > 5000, 'Fullscreen PNG suspiciously small')
  results.push(`Fullscreen PNG export ok (${(fsPngInfo.size / 1024).toFixed(0)} KB)`)

  // Close via button
  const closeBtn = overlay.locator('button[title="Close full screen (Esc)"]')
  await closeBtn.click()
  await overlay.waitFor({ state: 'hidden', timeout: 10000 })
  results.push('Fullscreen close via button ok')
}

/* ── Test 4: Sidebar filter collapse/expand/reset ── */
async function testSidebarFilters(page, results) {
  await openRoute(page, '/trade-by-state', 'State')

  // Collapse sidebar
  const collapseBtn = page.locator('button[title="Collapse filters"]').first()
  await collapseBtn.waitFor({ timeout: 10000 })
  await collapseBtn.click()
  await page.waitForTimeout(500)

  // Expand sidebar
  const expandBtn = page.locator('button[title="Expand filters"]').first()
  await expandBtn.waitFor({ timeout: 5000 })
  assert(await expandBtn.isVisible(), 'Sidebar did not collapse')
  await expandBtn.click()
  await collapseBtn.waitFor({ timeout: 10000 })
  results.push('Sidebar collapse/expand ok')

  // Apply a filter via select dropdown (trade type)
  const sidebar = page.locator('aside').first()
  const selects = sidebar.locator('select')
  const selectCount = await selects.count()
  if (selectCount > 0) {
    const firstSelect = selects.first()
    const options = await firstSelect.locator('option').allTextContents()
    if (options.length > 1) {
      await firstSelect.selectOption({ index: 1 })
      await page.waitForTimeout(600)
      results.push(`Filter applied: ${options[1]} selected`)
    }
  }

  // Check for reset button and use it
  const resetBtn = sidebar.getByText('Reset all filters').first()
  if (await resetBtn.isVisible().catch(() => false)) {
    await resetBtn.click()
    await page.waitForTimeout(600)
    results.push('Filter reset ok')
  } else {
    results.push('No active filters to reset (filter may not have changed state)')
  }
}

/* ── Test 5: DataTable sorting + pagination ── */
async function testDataTable(page, results) {
  await openRoute(page, '/trade-by-state', 'State')

  const table = page.locator('table').last()
  await table.waitFor({ timeout: 15000 })

  // Sort by clicking a header
  const headers = table.locator('th')
  const headerCount = await headers.count()
  assert(headerCount > 0, 'DataTable has no header columns')

  const firstRowBefore = await table.locator('tbody tr').first().innerText().catch(() => '')
  await headers.last().click()
  await page.waitForTimeout(500)
  const firstRowAfter = await table.locator('tbody tr').first().innerText().catch(() => '')

  if (firstRowBefore !== firstRowAfter) {
    results.push('DataTable sort changes row order ok')
  } else {
    results.push('DataTable sort clicked (order may already be sorted)')
  }

  // Pagination
  const nextBtn = page.getByRole('button', { name: 'Next' }).last()
  if (await nextBtn.isVisible().catch(() => false)) {
    if (await nextBtn.isEnabled()) {
      await nextBtn.click()
      await page.waitForTimeout(500)
      results.push('DataTable pagination Next ok')
    } else {
      results.push('DataTable pagination present (single page)')
    }
  } else {
    results.push('DataTable pagination not visible')
  }
}

/* ── Test 6: Treemap renders on commodity page ── */
async function testTreemap(page, results) {
  await openRoute(page, '/commodities', 'Commodity')

  // Look for treemap SVG rects
  const treemapCard = chartCardLocator(page, 'Commodity Group')
  await treemapCard.waitFor({ timeout: 15000 })
  const rectCount = await treemapCard.locator('svg rect').count()
  assert(rectCount >= 3, `Treemap should have >= 3 rects, found ${rectCount}`)
  results.push(`Treemap renders ok (${rectCount} rects)`)

  // PNG export of treemap
  const [treemapPng] = await Promise.all([
    page.waitForEvent('download', { timeout: 15000 }),
    treemapCard.locator('button[title="Export as PNG"]').click(),
  ])
  const info = await saveDownload(treemapPng, 'treemap-png')
  assert(info.size > 2000, 'Treemap PNG suspiciously small')
  results.push(`Treemap PNG export ok (${(info.size / 1024).toFixed(0)} KB)`)
}

/* ── Test 7: CSV download wiring audit ── */
async function auditCsvDownloads(page, results) {
  const pagesWithCharts = [
    { path: '/us-mexico', name: 'US-Mexico' },
    { path: '/trade-by-mode', name: 'Trade by Mode' },
    { path: '/commodities', name: 'Commodities' },
    { path: '/trade-by-state', name: 'Trade by State' },
  ]

  let wiredCount = 0
  let totalCards = 0

  for (const pg of pagesWithCharts) {
    await openRoute(page, pg.path, null)
    const downloadBtns = page.locator('button[title="Download data"]')
    const count = await downloadBtns.count()
    totalCards += await page.locator('button[title="Export as PNG"]').count()
    wiredCount += count
  }

  if (wiredCount === 0) {
    results.push(`CSV downloads: NOT WIRED (0/${totalCards} chart cards have downloadData)`)
  } else {
    results.push(`CSV downloads: ${wiredCount}/${totalCards} chart cards have download buttons`)
  }
}

/* ── Main ── */
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
    await testAllRoutes(page, results)
    await testPngExport(page, results)
    await testFullscreen(page, results)
    await testSidebarFilters(page, results)
    await testDataTable(page, results)
    await testTreemap(page, results)
    await auditCsvDownloads(page, results)

    // Report runtime errors
    if (pageErrors.length > 0) {
      console.warn(`\n  [warn] ${pageErrors.length} JS runtime error(s):`)
      for (const e of pageErrors.slice(0, 10)) console.warn(`    - ${e.slice(0, 200)}`)
      // Fail on actual JS crashes
      throw new Error(`${pageErrors.length} JS runtime error(s) — see warnings above`)
    }

    if (consoleErrors.length > 0) {
      console.warn(`\n  [info] ${consoleErrors.length} console.error(s) (non-blocking):`)
      for (const e of consoleErrors.slice(0, 5)) console.warn(`    - ${e.slice(0, 200)}`)
    }

    results.push('No JS runtime errors during test suite')

    console.log('\nDEEP FUNCTIONAL CHECK: PASS')
    for (const line of results) console.log(`  [ok] ${line}`)
    console.log(`\nArtifacts: ${ARTIFACT_ROOT}`)
  } catch (error) {
    await page.screenshot({ path: path.join(ARTIFACT_ROOT, 'failure.png'), fullPage: true }).catch(() => {})

    if (results.length > 0) {
      console.log('\n  Passed before failure:')
      for (const line of results) console.log(`  [ok] ${line}`)
    }

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
