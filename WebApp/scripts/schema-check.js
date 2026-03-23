/**
 * schema-check.js
 * ---------------------------------------------------------------------------
 * Lightweight data-contract checker for boilerplate adaptation.
 *
 * Purpose:
 *   When this dashboard is reused with a new dataset, this script gives a fast
 *   "pre-flight" validation of CSV schemas before running the UI.
 *
 * Usage:
 *   node scripts/schema-check.js
 *
 * What it validates:
 *   1) CSV file exists and has rows
 *   2) Required columns for each dataset are present
 *   3) Example type checks for core fields (Year, TradeValue)
 *
 * Important:
 *   - This is a guardrail script, not a strict parser for every edge case.
 *   - Failures here do not auto-fix code; they tell future agents/users what
 *     mappings in `src/stores/tradeStore.js` and `src/pages/*` need updates.
 */

import fs from 'fs/promises'
import path from 'path'
import process from 'process'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, '..', 'public', 'data')

/**
 * Expected contracts for the current boilerplate pages.
 * Update this map first when onboarding a new project schema.
 */
const CONTRACTS = [
  {
    file: 'us_aggregated.csv',
    dataset: 'usAggregated',
    required: ['Year', 'TradeType', 'TradeValue'],
    optional: ['Mode', 'State', 'Commodity', 'CommodityGroup'],
  },
  {
    file: 'tx_border_ports.csv',
    dataset: 'txBorderPorts',
    required: ['Year', 'POE', 'Region', 'Mode', 'TradeType', 'TradeValue'],
    optional: ['Commodity', 'CommodityGroup', 'Lat', 'Lon'],
  },
  {
    file: 'bts_us_state.csv',
    dataset: 'btsUsState',
    required: ['Year', 'State', 'Mode', 'TradeType', 'TradeValue'],
    optional: ['StateCode'],
  },
  {
    file: 'master_data.csv',
    dataset: 'masterData',
    required: ['Year', 'TradeType', 'TradeValue'],
    optional: ['Port', 'Region', 'Mode', 'CommodityGroup'],
  },
]

/**
 * Header aliases accepted as equivalent to canonical field names.
 * This mirrors tradeStore normalization where spaced headers are mapped.
 */
const HEADER_ALIASES = {
  Year: ['Year'],
  TradeType: ['TradeType', 'Trade Type'],
  TradeValue: ['TradeValue', 'Trade Value'],
  CommodityGroup: ['CommodityGroup', 'Commodity Group'],
  POE: ['POE', 'Port of Entry'],
  State: ['State', 'USASTATE_NAME'],
}

function splitCsvLine(line) {
  // Minimal CSV splitter with quote support (sufficient for header/data checks).
  const out = []
  let cur = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
      continue
    }
    if (ch === ',' && !inQuotes) {
      out.push(cur)
      cur = ''
      continue
    }
    cur += ch
  }
  out.push(cur)
  return out.map((s) => s.trim())
}

function parseLooseYear(value) {
  const trimmed = String(value ?? '').trim()
  if (!trimmed) return null
  const direct = Number(trimmed)
  if (Number.isFinite(direct)) return Math.trunc(direct)
  const m = trimmed.match(/\d{4}/)
  return m ? Number(m[0]) : null
}

function parseLooseNumber(value) {
  const cleaned = String(value ?? '').replace(/[$,\s]/g, '').trim()
  if (!cleaned) return null
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

async function inspectContract(contract) {
  const filePath = path.join(DATA_DIR, contract.file)
  const report = {
    ...contract,
    exists: false,
    rowCount: 0,
    missingRequired: [],
    warnings: [],
  }

  let raw
  try {
    raw = await fs.readFile(filePath, 'utf8')
    report.exists = true
  } catch {
    report.warnings.push(`File not found: ${contract.file}`)
    return report
  }

  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (lines.length === 0) {
    report.warnings.push('CSV is empty')
    return report
  }

  const headers = splitCsvLine(lines[0])
  const headerSet = new Set(headers)
  report.rowCount = Math.max(0, lines.length - 1)
  report.missingRequired = contract.required.filter((canonical) => {
    const aliases = HEADER_ALIASES[canonical] || [canonical]
    return !aliases.some((alias) => headerSet.has(alias))
  })

  const resolveHeader = (canonical) => {
    const aliases = HEADER_ALIASES[canonical] || [canonical]
    return aliases.find((alias) => headerSet.has(alias)) || null
  }

  // Sample first 50 rows for lightweight type heuristics.
  const sampleRows = lines.slice(1, 51).map((line) => {
    const cells = splitCsvLine(line)
    const row = {}
    headers.forEach((h, idx) => {
      row[h] = cells[idx] ?? ''
    })
    return row
  })

  const yearHeader = resolveHeader('Year')
  if (yearHeader) {
    const invalidYearCount = sampleRows.filter((r) => parseLooseYear(r[yearHeader]) == null).length
    if (invalidYearCount > 0) {
      report.warnings.push(`Sample has ${invalidYearCount} rows with non-parseable Year values`)
    }
  }

  const tradeValueHeader = resolveHeader('TradeValue')
  if (tradeValueHeader) {
    const invalidTradeValueCount = sampleRows.filter((r) => parseLooseNumber(r[tradeValueHeader]) == null).length
    if (invalidTradeValueCount > 0) {
      report.warnings.push(`Sample has ${invalidTradeValueCount} rows with non-parseable TradeValue values`)
    }
  }

  return report
}

async function main() {
  const reports = await Promise.all(CONTRACTS.map(inspectContract))
  let failCount = 0

  console.log('\nSCHEMA CHECK REPORT')
  console.log('='.repeat(72))

  for (const r of reports) {
    const hardFail = !r.exists || r.missingRequired.length > 0
    if (hardFail) failCount++

    console.log(`\n${hardFail ? 'FAIL' : 'PASS'}  ${r.dataset} (${r.file})`)
    console.log(`  Rows: ${r.rowCount}`)

    if (r.missingRequired.length > 0) {
      console.log(`  Missing required: ${r.missingRequired.join(', ')}`)
    } else {
      console.log('  Required columns: present')
    }

    if (r.warnings.length > 0) {
      for (const w of r.warnings) console.log(`  Warning: ${w}`)
    }
  }

  console.log('\n' + '-'.repeat(72))
  if (failCount === 0) {
    console.log('Result: PASS (all dataset contracts satisfied)')
  } else {
    console.log(`Result: FAIL (${failCount} dataset contract issue(s))`)
    console.log('Next step: update `tradeStore.normalize()` and page-level mappings.')
  }
  console.log('-'.repeat(72) + '\n')

  process.exitCode = failCount === 0 ? 0 : 1
}

main()
