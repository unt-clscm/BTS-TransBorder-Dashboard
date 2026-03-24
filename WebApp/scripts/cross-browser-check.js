/**
 * cross-browser-check.js
 * ---------------------------------------------------------------------------
 * Smoke test across Chromium, Firefox, and WebKit (if available).
 * Validates that all routes render, charts appear, and no JS errors occur.
 *
 * Usage:
 *   node scripts/cross-browser-check.js [baseUrl]
 */

import { chromium, firefox, webkit } from 'playwright'
import process from 'process'

const BASE_URL = process.argv[2] || 'http://localhost:5173'

const ROUTES = [
  { path: '/', expect: 'TransBorder Freight Data', minSvgs: 2 },
  { path: '/us-mexico', expect: 'Mexico', minSvgs: 2 },
  { path: '/us-mexico/ports', expect: 'Ports of Entry', minSvgs: 1 },
  { path: '/texas-mexico', expect: 'Mexico', minSvgs: 1 },
  { path: '/trade-by-state', expect: 'State', minSvgs: 2 },
  { path: '/about', expect: 'About', minSvgs: 0 },
]

function hashUrl(routePath) {
  return routePath === '/' ? `${BASE_URL}/#/` : `${BASE_URL}/#${routePath}`
}

async function testBrowser(browserType, name) {
  let browser
  try {
    browser = await browserType.launch({ headless: true })
  } catch {
    console.log(`  [skip] ${name}: not installed`)
    return { name, status: 'skipped', results: [] }
  }

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  const pageErrors = []
  page.on('pageerror', (err) => pageErrors.push(err.message))

  const results = []
  let failed = false

  try {
    for (const route of ROUTES) {
      await page.goto(hashUrl(route.path), { waitUntil: 'networkidle', timeout: 30000 })
      await page.getByText(route.expect, { exact: false }).first().waitFor({ timeout: 15000 })
      await page.waitForTimeout(1500)

      const svgCount = await page.locator('svg').count()
      if (svgCount >= route.minSvgs) {
        results.push({ ok: true, route: route.path, detail: `${svgCount} SVGs` })
      } else {
        results.push({ ok: false, route: route.path, detail: `${svgCount} SVGs (need >=${route.minSvgs})` })
        failed = true
      }

      // Check for NaN in page text
      const bodyText = await page.textContent('body')
      if (/\bNaN\b/.test(bodyText)) {
        results.push({ ok: false, route: route.path, detail: 'NaN detected in page text' })
        failed = true
      }
    }

    if (pageErrors.length > 0) {
      results.push({ ok: false, route: '*', detail: `${pageErrors.length} JS error(s): ${pageErrors.slice(0, 3).join('; ')}` })
      failed = true
    } else {
      results.push({ ok: true, route: '*', detail: 'No JS errors' })
    }
  } catch (err) {
    results.push({ ok: false, route: '?', detail: err.message })
    failed = true
  } finally {
    await context.close()
    await browser.close()
  }

  return { name, status: failed ? 'fail' : 'pass', results }
}

async function main() {
  const browsers = [
    { type: chromium, name: 'Chromium' },
    { type: firefox, name: 'Firefox' },
  ]

  // Try WebKit if available (not always on Windows)
  try {
    const wk = await webkit.launch({ headless: true })
    await wk.close()
    browsers.push({ type: webkit, name: 'WebKit' })
  } catch {
    console.log('  [info] WebKit not available on this platform, testing Chromium + Firefox only\n')
  }

  let anyFail = false

  for (const { type, name } of browsers) {
    console.log(`\n── ${name} ──`)
    const result = await testBrowser(type, name)

    if (result.status === 'skipped') continue

    for (const r of result.results) {
      const mark = r.ok ? '[ok]' : '[FAIL]'
      console.log(`  ${mark} ${r.route}: ${r.detail}`)
    }

    console.log(`  Result: ${result.status.toUpperCase()}`)
    if (result.status === 'fail') anyFail = true
  }

  console.log('\n' + '─'.repeat(40))
  console.log(anyFail ? 'CROSS-BROWSER CHECK: FAIL' : 'CROSS-BROWSER CHECK: PASS')
  console.log('─'.repeat(40) + '\n')

  process.exitCode = anyFail ? 1 : 0
}

main()
