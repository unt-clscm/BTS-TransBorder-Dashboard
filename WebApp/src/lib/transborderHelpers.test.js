import { describe, it, expect } from 'vitest'
import {
  formatCompact,
  formatCurrency,
  formatWeight,
  formatNumber,
  formatPercent,
  getAxisFormatter,
  isTexasMexico,
  isUSMexico,
  buildFilterOptions,
  applyStandardFilters,
  applyFilters,
} from './transborderHelpers'

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

describe('formatCompact', () => {
  it('returns dash for null/undefined/NaN', () => {
    expect(formatCompact(null)).toBe('—')
    expect(formatCompact(undefined)).toBe('—')
    expect(formatCompact(NaN)).toBe('—')
  })
  it('formats billions', () => expect(formatCompact(2_500_000_000)).toBe('2.5B'))
  it('formats millions', () => expect(formatCompact(750_000)).toBe('750.0K'))
  it('formats thousands', () => expect(formatCompact(1_200)).toBe('1.2K'))
  it('formats small numbers', () => expect(formatCompact(42)).toBe('42'))
  it('handles negatives', () => expect(formatCompact(-3_000_000)).toBe('-3.0M'))
})

describe('formatCurrency', () => {
  it('prefixes with $', () => expect(formatCurrency(1_000_000)).toBe('$1.0M'))
  it('returns dash for null', () => expect(formatCurrency(null)).toBe('—'))
})

describe('formatWeight', () => {
  it('appends tons', () => expect(formatWeight(5_000_000)).toBe('5.0M tons'))
})

describe('formatNumber', () => {
  it('adds commas', () => expect(formatNumber(1234567)).toBe('1,234,567'))
  it('returns dash for null', () => expect(formatNumber(null)).toBe('—'))
})

describe('formatPercent', () => {
  it('converts decimal to percent', () => expect(formatPercent(0.125)).toBe('12.5%'))
  it('returns dash for null', () => expect(formatPercent(null)).toBe('—'))
})

describe('getAxisFormatter', () => {
  it('uses B suffix for billions', () => {
    const fmt = getAxisFormatter(5e9, '$')
    expect(fmt(2_500_000_000)).toBe('$2.5B')
  })
  it('uses M suffix for millions', () => {
    const fmt = getAxisFormatter(5e6, '$')
    expect(fmt(3_000_000)).toBe('$3M')
  })
  it('uses K suffix for thousands', () => {
    const fmt = getAxisFormatter(5000, '$')
    expect(fmt(2500)).toBe('$2.5K')
  })
  it('uses no suffix for small values', () => {
    const fmt = getAxisFormatter(500, '$')
    expect(fmt(42)).toBe('$42')
  })
})

// ---------------------------------------------------------------------------
// Domain predicates
// ---------------------------------------------------------------------------

describe('isTexasMexico', () => {
  it('true for Texas + Mexico', () => {
    expect(isTexasMexico({ Country: 'Mexico', State: 'Texas' })).toBe(true)
  })
  it('true for TX abbreviation', () => {
    expect(isTexasMexico({ Country: 'Mexico', State: 'TX' })).toBe(true)
  })
  it('true for FIPS code 48', () => {
    expect(isTexasMexico({ Country: 'Mexico', StateCode: '48' })).toBe(true)
  })
  it('false for non-Mexico', () => {
    expect(isTexasMexico({ Country: 'Canada', State: 'Texas' })).toBe(false)
  })
  it('false for non-Texas state', () => {
    expect(isTexasMexico({ Country: 'Mexico', State: 'California' })).toBe(false)
  })
  it('false for null', () => expect(isTexasMexico(null)).toBe(false))
})

describe('isUSMexico', () => {
  it('true for Mexico', () => expect(isUSMexico({ Country: 'Mexico' })).toBe(true))
  it('false for Canada', () => expect(isUSMexico({ Country: 'Canada' })).toBe(false))
  it('false for null', () => expect(isUSMexico(null)).toBe(false))
})

// ---------------------------------------------------------------------------
// Filter helpers
// ---------------------------------------------------------------------------

const SAMPLE_DATA = [
  { Year: 2020, Mode: 'Truck', TradeType: 'Export', TradeValue: 100, Country: 'Mexico', State: 'Texas' },
  { Year: 2020, Mode: 'Rail', TradeType: 'Import', TradeValue: 200, Country: 'Mexico', State: 'Texas' },
  { Year: 2021, Mode: 'Truck', TradeType: 'Export', TradeValue: 150, Country: 'Mexico', State: 'California' },
  { Year: 2021, Mode: 'Rail', TradeType: 'Import', TradeValue: 250, Country: 'Canada', State: 'Michigan' },
]

describe('buildFilterOptions', () => {
  it('extracts unique sorted values', () => {
    const opts = buildFilterOptions(SAMPLE_DATA, ['Year', 'Mode'])
    expect(opts.Year).toEqual([2020, 2021])
    expect(opts.Mode).toEqual(['Rail', 'Truck'])
  })
  it('returns empty object for null data', () => {
    expect(buildFilterOptions(null, ['Year'])).toEqual({})
  })
})

describe('applyStandardFilters', () => {
  it('filters by array value (multi-select)', () => {
    const result = applyStandardFilters(SAMPLE_DATA, { Year: ['2020'] })
    expect(result).toHaveLength(2)
    expect(result.every((d) => d.Year === 2020)).toBe(true)
  })
  it('filters by string value (single-select)', () => {
    const result = applyStandardFilters(SAMPLE_DATA, { TradeType: 'Export' })
    expect(result).toHaveLength(2)
  })
  it('empty filter passes all', () => {
    const result = applyStandardFilters(SAMPLE_DATA, { Year: [], TradeType: '' })
    expect(result).toHaveLength(4)
  })
  it('returns data when filterSpec is null', () => {
    expect(applyStandardFilters(SAMPLE_DATA, null)).toHaveLength(4)
  })
})

describe('applyFilters', () => {
  it('filters by year array', () => {
    const result = applyFilters(SAMPLE_DATA, { year: [2021] })
    expect(result).toHaveLength(2)
  })
  it('filters by country string', () => {
    const result = applyFilters(SAMPLE_DATA, { country: 'Canada' })
    expect(result).toHaveLength(1)
  })
  it('combines multiple filters', () => {
    const result = applyFilters(SAMPLE_DATA, { year: [2020], mode: ['Truck'] })
    expect(result).toHaveLength(1)
    expect(result[0].TradeValue).toBe(100)
  })
})
