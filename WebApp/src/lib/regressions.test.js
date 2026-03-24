/**
 * Regression tests for fixed bugs.
 * These tests prevent previously fixed issues from quietly returning.
 */
import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('Regression: USMexico page should not depend on commodityDetail', () => {
  const pagePath = path.resolve(__dirname, '../pages/USMexico/index.jsx')
  const source = fs.readFileSync(pagePath, 'utf-8')

  it('does not load commodityDetail dataset', () => {
    expect(source).not.toMatch(/loadDataset\(\s*['"]commodityDetail['"]\s*\)/)
  })

  it('does not gate on commodityDetail errors', () => {
    expect(source).not.toMatch(/datasetErrors\.commodityDetail/)
  })

  it('does not gate on commodityDetail in loading check', () => {
    expect(source).not.toMatch(/commodityDetail\s*===\s*null/)
  })
})

describe('Regression: PortMap CurvedArc handles overlapping points', () => {
  const mapPath = path.resolve(__dirname, '../components/maps/PortMap.jsx')
  const source = fs.readFileSync(mapPath, 'utf-8')

  it('guards against dist < 1 before computing Bezier control point', () => {
    // The fix should check dist before dividing by it
    expect(source).toMatch(/dist\s*<\s*1/)
  })

  it('does not divide by dist without a guard', () => {
    // Ensure the division by dist only happens after the guard
    const lines = source.split('\n')
    let guardSeen = false
    let unguardedDivision = false
    for (const line of lines) {
      if (/dist\s*<\s*1/.test(line)) guardSeen = true
      if (/\/\s*dist\)/.test(line) && !guardSeen) unguardedDivision = true
    }
    expect(unguardedDivision).toBe(false)
  })
})
