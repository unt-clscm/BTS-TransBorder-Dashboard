/**
 * Convert XLSX sample data files to CSV for browser consumption.
 * Run: node scripts/convert-xlsx.js
 */
import { readFile, writeFile, mkdir } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import XLSX from 'xlsx'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SAMPLE_DIR = join(__dirname, '..', '..', 'Sample_data')
const OUT_DIR = join(__dirname, '..', 'public', 'data')

const FILES = [
  {
    input: 'US Aggregated - BTS (2013-2024).xlsx',
    output: 'us_aggregated.csv',
  },
  {
    input: 'TX Border Ports - BTS (2013-2024).xlsx',
    output: 'tx_border_ports.csv',
  },
  {
    input: 'BTS_US_State.xlsx',
    output: 'bts_us_state.csv',
    // This file is very large (447K rows). We'll sample / aggregate it.
    transform: (data) => {
      // Aggregate by State + Year + Trade Type to reduce row count
      const agg = new Map()
      for (const row of data) {
        const key = `${row.USASTATE_NAME}|${row.Year}|${row['Trd Type']}|${row['Disagmot Name']}`
        if (!agg.has(key)) {
          agg.set(key, {
            State: row.USASTATE_NAME || row.USASTATE,
            StateCode: row.USASTATE,
            Year: row.Year,
            TradeType: row['Trd Type'],
            Mode: row['Disagmot Name'],
            TradeValue: 0,
          })
        }
        const val = parseFloat(row.Value) || 0
        agg.get(key).TradeValue += val
      }
      return Array.from(agg.values())
    },
  },
  {
    input: 'Master Data - BTS (2013-2024).xlsx',
    output: 'master_data.csv',
    transform: (data) => {
      // Aggregate by Port + Year + Trade Type + Commodity Group + Mode
      const agg = new Map()
      for (const row of data) {
        const key = `${row.Port}|${row.Year}|${row['Trade Type']}|${row['Commodity Group']}|${row.Mode}`
        if (!agg.has(key)) {
          agg.set(key, {
            Port: row.Port,
            IsTXBorder: row['TX-MX Border Port'],
            State: row.State,
            Region: row.Region,
            Year: row.Year,
            TradeType: row['Trade Type'],
            CommodityGroup: row['Commodity Group'],
            Mode: row.Mode,
            TradeValue: 0,
          })
        }
        const val = parseFloat(row['Trade Value']) || 0
        agg.get(key).TradeValue += val
      }
      return Array.from(agg.values())
    },
  },
]

async function main() {
  await mkdir(OUT_DIR, { recursive: true })

  for (const file of FILES) {
    const inputPath = join(SAMPLE_DIR, file.input)
    console.log(`Reading: ${file.input}...`)

    try {
      const buf = await readFile(inputPath)
      const workbook = XLSX.read(buf, { type: 'buffer' })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      let data = XLSX.utils.sheet_to_json(sheet)
      console.log(`  → ${data.length} rows read`)

      if (file.transform) {
        data = file.transform(data)
        console.log(`  → ${data.length} rows after aggregation`)
      }

      // Convert to CSV
      const outSheet = XLSX.utils.json_to_sheet(data)
      const csv = XLSX.utils.sheet_to_csv(outSheet)

      const outputPath = join(OUT_DIR, file.output)
      await writeFile(outputPath, csv, 'utf8')
      console.log(`  → Written: ${file.output} (${(csv.length / 1024).toFixed(0)} KB)`)
    } catch (err) {
      console.error(`  ✗ Error processing ${file.input}:`, err.message)
    }
  }

  console.log('\nDone! CSV files are in public/data/')
}

main()
