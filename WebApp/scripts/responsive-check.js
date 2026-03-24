/**
 * responsive-check.js
 * ---------------------------------------------------------------------------
 * Multi-viewport responsive QA for TransBorder dashboard routes.
 *
 * Usage:
 *   node scripts/responsive-check.js [baseUrl]
 *
 * Validates at 3 breakpoints:
 *   - Mobile: 390x844 (typical phone portrait)
 *   - Tablet: 768x1024 (iPad portrait)
 *   - Desktop: 1440x900
 *
 * Checks:
 *   1) No horizontal page overflow.
 *   2) No runtime JS errors while navigating routes.
 *   3) Core nav behavior (desktop links vs mobile hamburger).
 *   4) Sidebar / main-content layout sanity on filter pages.
 *   5) Screenshot capture for each route + viewport.
 */

import fs from 'fs/promises'
import path from 'path'
import process from 'process'
import { fileURLToPath } from 'url'
import { chromium } from 'playwright'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BASE_URL = process.argv[2] || 'http://localhost:5173'

const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
]

const ROUTES = [
  { path: '/', expect: 'TransBorder Freight Data', hasSidebar: false },
  { path: '/trade-by-state', expect: 'TransBorder Trade by U.S. State', hasSidebar: true },
  { path: '/commodities', expect: 'TransBorder Trade by Commodity', hasSidebar: true },
  { path: '/trade-by-mode', expect: 'TransBorder Trade by Transportation Mode', hasSidebar: true },
  { path: '/texas-mexico', expect: 'Surface Freight Trade', hasSidebar: true },
  { path: '/us-mexico', expect: 'TransBorder Freight', hasSidebar: true },
]

const OUT_DIR = path.join(
  __dirname,
  '..',
  'screenshots',
  `responsive-check-${new Date().toISOString().replace(/[:.]/g, '-')}`,
)

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function ensureOutDir() {
  await fs.mkdir(OUT_DIR, { recursive: true })
}

function hashUrl(routePath) {
  return routePath === '/' ? `${BASE_URL}/#/` : `${BASE_URL}/#${routePath}`
}

async function checkNoHorizontalOverflow(page, routePath, viewportName) {
  const overflow = await page.evaluate(() => {
    const html = document.documentElement
    const body = document.body
    return {
      htmlScrollWidth: html.scrollWidth,
      htmlClientWidth: html.clientWidth,
      bodyScrollWidth: body.scrollWidth,
      bodyClientWidth: body.clientWidth,
    }
  })

  const htmlOverflow = overflow.htmlScrollWidth - overflow.htmlClientWidth
  const bodyOverflow = overflow.bodyScrollWidth - overflow.bodyClientWidth
  const maxOverflow = Math.max(htmlOverflow, bodyOverflow)
  assert(
    maxOverflow <= 1,
    `[${viewportName}] ${routePath} has horizontal overflow (${maxOverflow}px)`,
  )
}

async function checkNavigationBehavior(page, viewport) {
  const isDesktop = viewport.width >= 768

  if (isDesktop) {
    const linkCount = await page.locator('nav a').count()
    assert(linkCount >= 5, `[${viewport.name}] expected desktop nav links, found ${linkCount}`)
  } else {
    // Mobile: look for hamburger menu toggle
    const toggleBtn = page.locator('nav button').first()
    if (await toggleBtn.isVisible().catch(() => false)) {
      await toggleBtn.click()
      await page.waitForTimeout(300)
      const visibleLinks = await page.locator('nav a').count()
      assert(visibleLinks >= 3, `[${viewport.name}] expanded mobile nav has too few links (${visibleLinks})`)
      // Close menu
      await toggleBtn.click().catch(() => {})
      await page.waitForTimeout(200)
    }
  }
}

async function checkFilterSidebarBehavior(page, route, viewport) {
  if (!route.hasSidebar) return

  const isDesktop = viewport.width >= 1024
  if (isDesktop) {
    const aside = page.locator('aside').first()
    assert(await aside.isVisible(), `[${viewport.name}] ${route.path} desktop sidebar not visible`)

    const collapseBtn = page.locator('button[title="Collapse filters"]').first()
    if (await collapseBtn.isVisible().catch(() => false)) {
      await collapseBtn.click()
      const expandBtn = page.locator('button[title="Expand filters"]').first()
      await expandBtn.waitFor({ timeout: 5000 })
      assert(await expandBtn.isVisible(), `[${viewport.name}] ${route.path} sidebar did not collapse`)
      await expandBtn.click()
      await collapseBtn.waitFor({ timeout: 10000 })
    }
  }
  // On mobile/tablet, sidebar becomes inline — just verify no overflow
}

async function runViewportSuite(viewport) {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
  })
  const page = await context.newPage()

  const pageErrors = []
  page.on('pageerror', (err) => pageErrors.push(err.message))

  const checks = []

  try {
    // Navigation behavior validated once from home
    await page.goto(hashUrl('/'), { waitUntil: 'networkidle', timeout: 30000 })
    await page.getByText('TransBorder Freight Data', { exact: false }).first().waitFor({ timeout: 15000 })
    await page.waitForTimeout(700)
    await checkNavigationBehavior(page, viewport)
    checks.push(`[${viewport.name}] navigation behavior ok`)

    for (const route of ROUTES) {
      await page.goto(hashUrl(route.path), { waitUntil: 'networkidle', timeout: 30000 })
      await page.getByText(route.expect, { exact: false }).first().waitFor({ timeout: 15000 })
      await page.waitForTimeout(900)

      await checkNoHorizontalOverflow(page, route.path, viewport.name)
      checks.push(`[${viewport.name}] ${route.path} no horizontal overflow`)

      await checkFilterSidebarBehavior(page, route, viewport)
      if (route.hasSidebar) {
        checks.push(
          viewport.width >= 1024
            ? `[${viewport.name}] ${route.path} desktop sidebar toggle ok`
            : `[${viewport.name}] ${route.path} mobile/tablet layout ok`,
        )
      }

      const shot = path.join(
        OUT_DIR,
        `${viewport.name}-${route.path === '/' ? 'home' : route.path.replace(/\//g, '').replace(/^-/, '')}.png`,
      )
      await page.screenshot({ path: shot, fullPage: true })
    }

    assert(pageErrors.length === 0, `[${viewport.name}] page errors: ${pageErrors.join(' | ')}`)
    checks.push(`[${viewport.name}] no runtime errors`)
  } finally {
    await context.close()
    await browser.close()
  }

  return checks
}

async function main() {
  await ensureOutDir()
  const allChecks = []

  try {
    for (const vp of VIEWPORTS) {
      const checks = await runViewportSuite(vp)
      allChecks.push(...checks)
    }

    console.log('\nRESPONSIVE CHECK: PASS')
    allChecks.forEach((line) => console.log(`  [ok] ${line}`))
    console.log(`\nScreenshots: ${OUT_DIR}`)
  } catch (error) {
    if (allChecks.length > 0) {
      console.log('\n  Passed before failure:')
      allChecks.forEach((line) => console.log(`  [ok] ${line}`))
    }
    console.error('\nRESPONSIVE CHECK: FAIL')
    console.error(`  [error] ${error.message}`)
    console.error(`  [info] Screenshots (partial): ${OUT_DIR}`)
    process.exitCode = 1
  }
}

main()
