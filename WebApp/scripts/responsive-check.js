/**
 * responsive-check.js
 * ---------------------------------------------------------------------------
 * Multi-viewport responsive QA for dashboard routes.
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
 *   2) No runtime JS/console errors while navigating routes.
 *   3) Core nav behavior (desktop links vs mobile toggle/menu).
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
  { path: '/', expect: 'U.S.–Mexico Trade Dashboard', hasSidebar: false },
  { path: '/trade-by-state', expect: 'U.S. Trade by State', hasSidebar: true },
  { path: '/commodities', expect: 'Trade by Commodity', hasSidebar: true },
  { path: '/trade-by-mode', expect: 'Transportation Mode', hasSidebar: true },
  { path: '/border-ports', expect: 'Texas Border Ports of Entry', hasSidebar: true },
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
  const desktopNavLinks = page.locator('nav a')
  const toggleNavButton = page.getByRole('button', { name: 'Toggle navigation' })

  if (isDesktop) {
    const linkCount = await desktopNavLinks.count()
    assert(linkCount >= 5, `[${viewport.name}] expected desktop nav links, found ${linkCount}`)
  } else {
    assert(await toggleNavButton.isVisible(), `[${viewport.name}] mobile nav toggle is not visible`)
    await toggleNavButton.click()
    await page.waitForTimeout(300)
    const visibleLinks = await page.locator('nav a').count()
    assert(visibleLinks >= 5, `[${viewport.name}] expanded mobile nav has too few links (${visibleLinks})`)
    await toggleNavButton.click()
    await page.waitForTimeout(200)
  }
}

async function checkFilterSidebarBehavior(page, route, viewport) {
  if (!route.hasSidebar) return

  const isDesktop = viewport.width >= 1024
  if (isDesktop) {
    // Desktop uses the fixed right sidebar.
    const aside = page.locator('aside').first()
    assert(await aside.isVisible(), `[${viewport.name}] ${route.path} desktop sidebar not visible`)

    // Collapse/expand control should be operable.
    const collapseBtn = page.getByRole('button', { name: 'Collapse filters' }).first()
    await collapseBtn.click()
    const expandBtn = page.getByRole('button', { name: 'Expand filters' }).first()
    assert(await expandBtn.isVisible(), `[${viewport.name}] ${route.path} sidebar did not collapse`)
    await expandBtn.click()
    await collapseBtn.waitFor({ timeout: 10000 })
  } else {
    // Mobile/tablet uses inline FilterBar instead of fixed sidebar.
    const filtersHeading = page.getByText('Filters', { exact: true }).first()
    assert(await filtersHeading.isVisible(), `[${viewport.name}] ${route.path} inline filters heading missing`)
    const controlCount = await page.locator('label:has-text("Year"), label:has-text("Trade Type"), label:has-text("Mode"), label:has-text("Region")').count()
    assert(controlCount >= 2, `[${viewport.name}] ${route.path} inline filter controls missing`)
  }
}

async function runViewportSuite(viewport) {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
  })
  const page = await context.newPage()

  const pageErrors = []
  const consoleErrors = []
  page.on('pageerror', (err) => pageErrors.push(err.message))
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  })

  const checks = []

  try {
    // Navigation behavior validated once per viewport from home.
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle', timeout: 30000 })
    await page.getByText('U.S.–Mexico Trade Dashboard', { exact: false }).first().waitFor({ timeout: 15000 })
    await page.waitForTimeout(700)
    await checkNavigationBehavior(page, viewport)
    checks.push(`[${viewport.name}] navigation behavior ok`)

    for (const route of ROUTES) {
      await page.goto(`${BASE_URL}${route.path}`, { waitUntil: 'networkidle', timeout: 30000 })
      if (route.path === '/') {
        await page.getByText(route.expect, { exact: false }).first().waitFor({ timeout: 15000 })
      } else {
        // Page heading is a stable visible anchor across breakpoints.
        await page.locator('main h1, h1').first().waitFor({ timeout: 15000 })
      }
      await page.waitForTimeout(900)

      await checkNoHorizontalOverflow(page, route.path, viewport.name)
      checks.push(`[${viewport.name}] ${route.path} no horizontal overflow`)

      await checkFilterSidebarBehavior(page, route, viewport)
      if (route.hasSidebar) {
        checks.push(
          viewport.width >= 1024
            ? `[${viewport.name}] ${route.path} desktop sidebar toggle behavior ok`
            : `[${viewport.name}] ${route.path} inline filter bar behavior ok`,
        )
      }

      const shot = path.join(
        OUT_DIR,
        `${viewport.name}-${route.path === '/' ? 'home' : route.path.replace(/\//g, '')}.png`,
      )
      await page.screenshot({ path: shot, fullPage: true })
    }

    assert(pageErrors.length === 0, `[${viewport.name}] page errors: ${pageErrors.join(' | ')}`)
    assert(consoleErrors.length === 0, `[${viewport.name}] console errors: ${consoleErrors.join(' | ')}`)
    checks.push(`[${viewport.name}] no runtime/console errors`)
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
    console.error('\nRESPONSIVE CHECK: FAIL')
    console.error(`  [error] ${error.message}`)
    console.error(`  [info] Screenshots (partial): ${OUT_DIR}`)
    process.exitCode = 1
  }
}

main()
