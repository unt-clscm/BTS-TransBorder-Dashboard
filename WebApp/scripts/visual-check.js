/**
 * visual-check.js — Playwright visual & functional checker for the
 * TransBorder Freight Data dashboard (HashRouter SPA).
 *
 * Usage:
 *   node scripts/visual-check.js [baseUrl] [options]
 *
 * Options:
 *   --screenshots         Save full-page PNGs
 *   --out-dir <dir>       Screenshot directory (default: scripts/screenshots)
 *   --viewport <WxH>      Browser size (default: 1440x900)
 *   --wait <ms>           Extra wait after load (default: 3000)
 *   --route <hash-path>   Only check a specific route, e.g. --route /texas-mexico
 *   --tab <key>           Only check a specific tab on Texas-Mexico (requires --route /texas-mexico)
 *   --json                JSON output
 *
 * Exit codes: 0 = all pass, 1 = some failures, 2 = fatal error
 */

import { chromium } from 'playwright'
import path from 'path'
import fs from 'fs'
import process from 'process'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const argv = process.argv.slice(2)

// --- CLI arg helpers ---
function getArg(flag, fallback) {
  const i = argv.indexOf(flag)
  return i !== -1 && argv[i + 1] ? argv[i + 1] : fallback
}
const hasFlag = (flag) => argv.includes(flag)

const BASE = argv.find(a => a.startsWith('http')) || 'http://localhost:5173'
const SAVE_SCREENSHOTS = hasFlag('--screenshots')
const OUT_DIR = getArg('--out-dir', path.join(__dirname, 'screenshots'))
const VIEWPORT = getArg('--viewport', '1440x900').split('x').map(Number)
const EXTRA_WAIT = parseInt(getArg('--wait', '3000'), 10)
const JSON_OUTPUT = hasFlag('--json')
const ONLY_ROUTE = getArg('--route', null)
const ONLY_TAB = getArg('--tab', null)

// --- Route definitions (HashRouter: URLs are BASE + '/#' + path) ---
const ROUTES = [
  {
    path: '/',
    label: 'Overview (Home)',
    expect: 'TransBorder Freight Data',
    hasCharts: true,
    hasMap: true,
    minSvgs: 2,
  },
  {
    path: '/us-mexico',
    label: 'U.S.\u2013Mexico Trade',
    expect: 'Mexico',
    hasCharts: true,
    hasMap: true,
    minSvgs: 2,
  },
  {
    path: '/us-mexico/ports',
    label: 'U.S.\u2013Mexico Ports',
    expect: 'Ports of Entry',
    hasCharts: true,
    hasMap: true,
    minSvgs: 1,
  },
  {
    path: '/texas-mexico',
    label: 'Texas\u2013Mexico',
    expect: 'Mexico',
    hasCharts: true,
    hasMap: false,
    minSvgs: 1,
    tabs: [
      { key: 'overview',    label: 'Overview',    minSvgs: 1, hasMap: false },
      { key: 'ports',       label: 'Ports',       minSvgs: 1, hasMap: true  },
      { key: 'commodities', label: 'Commodities', minSvgs: 1, hasMap: false },
      { key: 'modes',       label: 'Modes',       minSvgs: 1, hasMap: false },
      { key: 'monthly',     label: 'Monthly',     minSvgs: 1, hasMap: false },
    ],
  },
  {
    path: '/trade-by-state',
    label: 'Trade by State',
    expect: 'State',
    hasCharts: true,
    hasMap: true,
    minSvgs: 2,
  },
  {
    path: '/about',
    label: 'About the Data',
    expect: 'About',
    hasCharts: false,
    hasMap: false,
    minSvgs: 0,
  },
]

// --- Helpers ---
function hashUrl(routePath) {
  return routePath === '/' ? BASE + '/#/' : BASE + '/#' + routePath
}

let totalPass = 0
let totalFail = 0

function pass(checks, label) { checks.push({ ok: true, label }); totalPass++ }
function fail(checks, label, detail) { checks.push({ ok: false, label, detail }); totalFail++ }

// --- Main ---
;(async () => {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: VIEWPORT[0], height: VIEWPORT[1] },
  })

  if (SAVE_SCREENSHOTS && !fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true })
  }

  // Filter routes if --route specified
  let routes = ROUTES
  if (ONLY_ROUTE) {
    routes = ROUTES.filter(r => r.path === ONLY_ROUTE)
    if (routes.length === 0) {
      console.error(`No route found matching "${ONLY_ROUTE}". Available: ${ROUTES.map(r => r.path).join(', ')}`)
      await browser.close()
      process.exit(2)
    }
  }

  const results = []

  // ── Pre-flight: verify dev server is reachable ──
  {
    const testPage = await context.newPage()
    try {
      await testPage.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 8000 })
    } catch {
      console.error(`\nCould not reach ${BASE} — is the dev server running?\n  Try: cd WebApp && npm run dev\n`)
      await browser.close()
      process.exit(2)
    }
    await testPage.close()
  }

  for (const route of routes) {
    const page = await context.newPage()
    const pageErrors = []
    const consoleErrors = []
    const failedRequests = []

    page.on('pageerror', err => pageErrors.push(err.message))
    page.on('console', msg => {
      const type = msg.type()
      const text = msg.text()
      if (type === 'error' ||
          (type === 'warning' && (text.includes('error') || text.includes('Error')))) {
        consoleErrors.push(text)
      }
    })
    page.on('response', res => {
      const url = res.url()
      if (url.startsWith(BASE) && res.status() >= 400) {
        failedRequests.push(`${res.status()} ${url}`)
      }
    })

    const checks = []

    try {
      await page.goto(hashUrl(route.path), { waitUntil: 'networkidle', timeout: 15000 })
      await page.waitForTimeout(EXTRA_WAIT)

      // ── Core checks ──
      await runCoreChecks(page, route, checks, pageErrors, consoleErrors, failedRequests)

      // ── Chart/SVG checks ──
      if (route.hasCharts) {
        await runChartChecks(page, checks, route.minSvgs)
      }

      // ── Map check ──
      if (route.hasMap) {
        await runMapCheck(page, checks)
      }

      // ── Data-loading validation ──
      await runDataLoadCheck(page, checks)

      // ── Screenshot ──
      if (SAVE_SCREENSHOTS) {
        const name = route.path === '/' ? 'home' : route.path.replace(/^\//, '').replace(/\//g, '-')
        await page.screenshot({ path: path.join(OUT_DIR, `${name}.png`), fullPage: true })
        pass(checks, `Screenshot: ${name}.png`)
      }

      // ── Tab sub-checks (Texas-Mexico) ──
      if (route.tabs) {
        const tabsToCheck = ONLY_TAB
          ? route.tabs.filter(t => t.key === ONLY_TAB)
          : route.tabs

        for (const tab of tabsToCheck) {
          if (!ONLY_TAB && tab === route.tabs[0]) continue

          const tabChecks = []
          try {
            const tabButton = page.locator(`button[role="tab"]:has-text("${tab.label}")`)
            const tabCount = await tabButton.count()
            if (tabCount === 0) {
              fail(tabChecks, `Tab "${tab.label}" button not found`)
              results.push({ route: `${route.path} [tab: ${tab.key}]`, checks: tabChecks })
              continue
            }
            await tabButton.click()
            await page.waitForTimeout(1500)

            if (tab.minSvgs > 0) {
              await runChartChecks(page, tabChecks, tab.minSvgs)
            }

            if (tab.hasMap) {
              await runMapCheck(page, tabChecks)
            }

            if (pageErrors.length === 0) pass(tabChecks, 'No JS errors after tab switch')
            else fail(tabChecks, 'JS errors after tab switch', pageErrors.slice(-3).join('; '))

            const tabBody = await page.textContent('body')
            if (tabBody.length > 100) pass(tabChecks, `Tab has content (${tabBody.length} chars)`)
            else fail(tabChecks, 'Tab has minimal content', `Only ${tabBody.length} chars`)

            if (SAVE_SCREENSHOTS) {
              const tabName = `texas-mexico-${tab.key}`
              await page.screenshot({ path: path.join(OUT_DIR, `${tabName}.png`), fullPage: true })
              pass(tabChecks, `Screenshot: ${tabName}.png`)
            }

          } catch (err) {
            fail(tabChecks, `Tab "${tab.label}" interaction failed`, err.message)
          }

          results.push({ route: `${route.path} [tab: ${tab.key}]`, checks: tabChecks })
        }
      }

    } catch (err) {
      fail(checks, 'Page load failed', err.message)
    }

    results.push({ route: route.path, checks })
    await page.close()
  }

  await browser.close()

  // --- Output ---
  if (JSON_OUTPUT) {
    console.log(JSON.stringify({ pass: totalPass, fail: totalFail, routes: results }, null, 2))
  } else {
    console.log('\n========================================')
    console.log('  VISUAL CHECK REPORT')
    console.log('========================================\n')

    for (const r of results) {
      const fails = r.checks.filter(c => !c.ok)
      const icon = fails.length === 0 ? 'PASS' : 'FAIL'
      console.log(`${icon}  ${r.route}`)
      for (const c of r.checks) {
        const mark = c.ok ? '  [ok]' : '  [FAIL]'
        console.log(`${mark} ${c.label}${c.detail ? ' \u2014 ' + c.detail : ''}`)
      }
      console.log('')
    }

    console.log('----------------------------------------')
    console.log(`  Total: ${totalPass} passed, ${totalFail} failed`)
    console.log('----------------------------------------\n')
  }

  process.exit(totalFail > 0 ? 1 : 0)
})().catch(err => {
  console.error('Fatal error:', err.message)
  process.exit(2)
})


// ════════════════════════════════════════════════════════════════════════
// Check functions
// ════════════════════════════════════════════════════════════════════════

async function runCoreChecks(page, route, checks, pageErrors, consoleErrors, failedRequests) {
  if (pageErrors.length === 0) pass(checks, 'No JS errors')
  else fail(checks, 'JS errors', pageErrors.join('; '))

  const renderErrors = consoleErrors.filter(w =>
    w.includes('error boundary') ||
    w.includes('An error occurred') ||
    w.includes('Uncaught') ||
    w.includes('not a constructor') ||
    w.includes('is not a function') ||
    w.includes('Cannot read properties')
  )
  if (renderErrors.length === 0) pass(checks, 'No render/framework errors')
  else fail(checks, 'Render errors', renderErrors.join('; '))

  const bodyText = await page.textContent('body')
  if (bodyText.length > 50) pass(checks, `Has content (${bodyText.length} chars)`)
  else fail(checks, 'Page empty or minimal', `Only ${bodyText.length} chars`)

  if (route.expect) {
    if (bodyText.includes(route.expect)) pass(checks, `Contains "${route.expect}"`)
    else fail(checks, 'Missing expected text', `"${route.expect}"`)
  }

  const navLinks = await page.locator('nav a').count()
  if (navLinks >= 5) pass(checks, `Nav has ${navLinks} links`)
  else fail(checks, 'Nav links missing', `Only ${navLinks} found`)

  const brokenImgs = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('img'))
      .filter(img => img.complete && img.naturalWidth === 0)
      .map(img => img.src)
  })
  if (brokenImgs.length === 0) pass(checks, 'No broken images')
  else fail(checks, 'Broken images', brokenImgs.join(', '))

  if (failedRequests.length === 0) pass(checks, 'No failed requests')
  else fail(checks, 'Failed requests', failedRequests.join('; '))

  const interactiveCount = await page.evaluate(() => {
    return document.querySelectorAll('button, a, select, input, [role="button"], [role="tab"]').length
  })
  if (interactiveCount > 0) pass(checks, `${interactiveCount} interactive elements`)
  else fail(checks, 'No interactive elements found')
}

async function runChartChecks(page, checks, minSvgs) {
  const svgCount = await page.locator('svg').count()
  if (svgCount >= minSvgs) pass(checks, `${svgCount} SVG charts rendered (need \u2265${minSvgs})`)
  else fail(checks, 'Too few charts', `Found ${svgCount} SVGs, expected \u2265${minSvgs}`)

  const svgsWithContent = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('svg'))
      .filter(svg => svg.children.length > 0)
      .length
  })
  if (svgsWithContent >= minSvgs) pass(checks, `${svgsWithContent} SVGs have content`)
  else fail(checks, 'SVGs are empty shells', `Only ${svgsWithContent}/${svgCount} have children`)
}

async function runMapCheck(page, checks) {
  const mapCount = await page.locator('.leaflet-container').count()
  if (mapCount > 0) pass(checks, `${mapCount} Leaflet map(s) present`)
  else fail(checks, 'No Leaflet map found')

  if (mapCount > 0) {
    const tileCount = await page.locator('.leaflet-tile-loaded').count()
    if (tileCount > 0) pass(checks, `Map tiles loaded (${tileCount} tiles)`)
    else fail(checks, 'Map tiles not loaded', 'No .leaflet-tile-loaded elements')
  }
}

async function runDataLoadCheck(page, checks) {
  const bodyText = await page.textContent('body')

  const nanMatches = bodyText.match(/\bNaN\b/g)
  if (!nanMatches) pass(checks, 'No NaN values in page')
  else fail(checks, 'NaN values detected', `${nanMatches.length} occurrence(s)`)

  const undefMatches = bodyText.match(/\bundefined\b/gi)
  if (!undefMatches) pass(checks, 'No "undefined" in page text')
  else fail(checks, '"undefined" text detected', `${undefMatches.length} occurrence(s)`)

  const spinners = await page.locator('[class*="spinner"], [class*="loading"], [class*="skeleton"]').count()
  if (spinners === 0) pass(checks, 'No stuck loading indicators')
  else fail(checks, 'Loading indicators still visible', `${spinners} element(s)`)
}
