/**
 * check-all.js
 * ---------------------------------------------------------------------------
 * Runs the complete audit bundle in sequence:
 *   1) schema contract checks
 *   2) deep functional checks
 *   3) responsive checks
 *   4) visual checks (with screenshots)
 *
 * Usage:
 *   node scripts/check-all.js
 *   node scripts/check-all.js http://localhost:5175
 *
 * Notes:
 *   - Exits immediately on first failure (non-zero exit code).
 *   - Assumes the dev server is already running for UI checks.
 */

import { spawnSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import process from 'process'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const baseUrl = process.argv[2] || 'http://localhost:5173'

const steps = [
  {
    name: 'schema',
    command: 'node',
    args: ['scripts/schema-check.js'],
  },
  {
    name: 'functional',
    command: 'node',
    args: ['scripts/deep-functional-check.js', baseUrl],
  },
  {
    name: 'responsive',
    command: 'node',
    args: ['scripts/responsive-check.js', baseUrl],
  },
  {
    name: 'visual',
    command: 'node',
    args: [
      'scripts/visual-check.js',
      baseUrl,
      '--screenshots',
      '--out-dir',
      './screenshots/visual-check-latest',
    ],
  },
]

// Clean up screenshot artifacts from previous runs
const screenshotDirs = [
  path.join(__dirname, 'screenshots'),
  path.join(__dirname, '..', 'screenshots'),
]
for (const dir of screenshotDirs) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true })
    console.log(`Cleaned: ${path.relative(process.cwd(), dir)}`)
  }
}

for (const step of steps) {
  console.log(`\n=== Running ${step.name} checks ===`)
  const result = spawnSync(step.command, step.args, { stdio: 'inherit', shell: false })
  if (result.status !== 0) {
    console.error(`\ncheck:all failed at step "${step.name}"`)
    process.exit(result.status || 1)
  }
}

console.log('\ncheck:all completed successfully.')
