/**
 * schema-check.js
 * ---------------------------------------------------------------------------
 * Validates JSON data files against the store's dataset contracts.
 *
 * Checks:
 *   1) JSON file exists and parses correctly
 *   2) Array has rows
 *   3) Required fields are present in every row (sample)
 *   4) Numeric fields contain valid numbers (not NaN/undefined)
 *   5) String fields are non-empty strings where expected
 *
 * Usage:
 *   node scripts/schema-check.js
 */

import fs from 'fs/promises'
import path from 'path'
import process from 'process'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, '..', 'public', 'data')

/**
 * Dataset contracts matching transborderStore.js DATASET_FILES.
 * "required" fields must be present and non-null in every row.
 * "numeric" fields must parse as finite numbers.
 * "optional" fields may or may not be present.
 */
const CONTRACTS = [
  {
    file: 'us_transborder.json',
    dataset: 'usTransborder',
    required: ['Year', 'Country', 'Mode', 'TradeType', 'TradeValue'],
    numeric: ['Year', 'TradeValue', 'Weight'],
    optional: ['Weight'],
  },
  {
    file: 'us_mexico_ports.json',
    dataset: 'usMexicoPorts',
    required: ['Year', 'PortCode', 'Port', 'State', 'Mode', 'TradeType', 'TradeValue'],
    numeric: ['Year', 'TradeValue', 'Weight', 'FreightCharges'],
    optional: ['StateCode', 'Weight', 'FreightCharges'],
  },
  {
    file: 'texas_mexico_ports.json',
    dataset: 'texasMexicoPorts',
    required: ['Year', 'PortCode', 'Port', 'Mode', 'TradeType', 'TradeValue'],
    numeric: ['Year', 'TradeValue', 'Weight', 'FreightCharges', 'Lat', 'Lon'],
    optional: ['Region', 'Weight', 'FreightCharges', 'Lat', 'Lon'],
  },
  {
    file: 'texas_mexico_commodities.json',
    dataset: 'texasMexicoCommodities',
    required: ['Year', 'Port', 'CommodityGroup', 'Mode', 'TradeType', 'TradeValue'],
    numeric: ['Year', 'TradeValue', 'Weight'],
    optional: ['PortCode', 'HSCode', 'Commodity', 'Weight'],
  },
  {
    file: 'us_state_trade.json',
    dataset: 'usStateTrade',
    required: ['Year', 'State', 'Country', 'Mode', 'TradeType', 'TradeValue'],
    numeric: ['Year', 'TradeValue'],
    optional: ['StateCode'],
  },
  {
    file: 'commodity_detail.json',
    dataset: 'commodityDetail',
    required: ['Year', 'Country', 'CommodityGroup', 'Mode', 'TradeType', 'TradeValue'],
    numeric: ['Year', 'TradeValue', 'Weight'],
    optional: ['HSCode', 'Commodity', 'Weight'],
  },
  {
    file: 'monthly_trends.json',
    dataset: 'monthlyTrends',
    required: ['Year', 'Month', 'Country', 'Mode', 'TradeType', 'TradeValue'],
    numeric: ['Year', 'Month', 'TradeValue'],
    optional: [],
  },
]

const SAMPLE_SIZE = 100

async function inspectContract(contract) {
  const filePath = path.join(DATA_DIR, contract.file)
  const report = {
    ...contract,
    exists: false,
    rowCount: 0,
    missingRequired: [],
    numericIssues: [],
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

  let data
  try {
    data = JSON.parse(raw)
  } catch (e) {
    report.warnings.push(`JSON parse error: ${e.message}`)
    return report
  }

  if (!Array.isArray(data)) {
    report.warnings.push('Expected a JSON array at top level')
    return report
  }

  report.rowCount = data.length
  if (data.length === 0) {
    report.warnings.push('Dataset is empty (0 rows)')
    return report
  }

  // Sample rows for validation
  const sample = data.length <= SAMPLE_SIZE
    ? data
    : Array.from({ length: SAMPLE_SIZE }, (_, i) =>
        data[Math.floor(i * data.length / SAMPLE_SIZE)]
      )

  // Check required fields
  const missingCounts = {}
  for (const field of contract.required) {
    let missing = 0
    for (const row of sample) {
      if (row[field] === undefined || row[field] === null || row[field] === '') {
        missing++
      }
    }
    if (missing > 0) {
      missingCounts[field] = missing
    }
  }
  report.missingRequired = Object.entries(missingCounts).map(
    ([field, count]) => `${field} (${count}/${sample.length} rows)`
  )

  // Check numeric fields
  for (const field of (contract.numeric || [])) {
    let nanCount = 0
    let presentCount = 0
    for (const row of sample) {
      if (field in row && row[field] !== null) {
        presentCount++
        const v = +row[field]
        if (!Number.isFinite(v)) nanCount++
      }
    }
    if (nanCount > 0) {
      report.numericIssues.push(`${field}: ${nanCount}/${presentCount} non-finite values`)
    }
  }

  // Check for unexpected NaN in TradeValue specifically (critical field)
  let tradeValueNaN = 0
  for (const row of sample) {
    const v = +row.TradeValue
    if (!Number.isFinite(v)) tradeValueNaN++
  }
  if (tradeValueNaN > 0) {
    report.warnings.push(`CRITICAL: ${tradeValueNaN}/${sample.length} rows have non-finite TradeValue`)
  }

  // Year range sanity check
  const years = sample.map(r => +r.Year).filter(Number.isFinite)
  if (years.length > 0) {
    const minYear = Math.min(...years)
    const maxYear = Math.max(...years)
    if (minYear < 1993 || maxYear > 2030) {
      report.warnings.push(`Year range ${minYear}-${maxYear} outside expected 1993-2030`)
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
    const hardFail = !r.exists || r.missingRequired.length > 0 || r.numericIssues.length > 0
    if (hardFail) failCount++

    const tag = hardFail ? 'FAIL' : 'PASS'
    console.log(`\n${tag}  ${r.dataset} (${r.file})`)
    console.log(`  Rows: ${r.rowCount.toLocaleString()}`)

    if (r.missingRequired.length > 0) {
      console.log(`  Missing required: ${r.missingRequired.join(', ')}`)
    } else if (r.exists) {
      console.log('  Required fields: all present')
    }

    if (r.numericIssues.length > 0) {
      for (const issue of r.numericIssues) console.log(`  Numeric issue: ${issue}`)
    }

    if (r.warnings.length > 0) {
      for (const w of r.warnings) console.log(`  Warning: ${w}`)
    }
  }

  console.log('\n' + '-'.repeat(72))
  if (failCount === 0) {
    console.log('Result: PASS (all 7 dataset contracts satisfied)')
  } else {
    console.log(`Result: FAIL (${failCount} dataset contract issue(s))`)
  }
  console.log('-'.repeat(72) + '\n')

  process.exitCode = failCount === 0 ? 0 : 1
}

main()
