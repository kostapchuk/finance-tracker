import { mkdtempSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  bundleSizeBadge,
  collectBadges,
  lighthouseBadges,
  parseTypeCoverage,
  scoreColor,
  typeCoverageBadge,
  vulnerabilitiesBadge,
  writeBadges,
} from './badges.mjs'

describe('badges', () => {
  it('parses type-coverage output', () => {
    expect(parseTypeCoverage('(18846 / 18927) 99.57%\ntype-coverage success.')).toBe(99.57)
    expect(parseTypeCoverage('garbage')).toBeUndefined()
  })

  it('colors type coverage by threshold', () => {
    expect(typeCoverageBadge(99.57)).toMatchObject({ message: '99.57%', color: 'brightgreen' })
    expect(typeCoverageBadge(92).color).toBe('green')
    expect(typeCoverageBadge(85).color).toBe('yellow')
    expect(typeCoverageBadge(50).color).toBe('red')
  })

  it('colors lighthouse scores like Lighthouse does', () => {
    expect(scoreColor(90)).toBe('brightgreen')
    expect(scoreColor(89)).toBe('orange')
    expect(scoreColor(50)).toBe('orange')
    expect(scoreColor(49)).toBe('red')
  })

  it('sums bundle sizes and turns red when a limit is exceeded', () => {
    const ok = [
      { name: 'JS', passed: true, size: 182_314 },
      { name: 'CSS', passed: true, size: 7218 },
    ]
    expect(bundleSizeBadge(ok)).toMatchObject({ message: '189.5 kB', color: 'blue' })
    expect(bundleSizeBadge([{ name: 'JS', passed: false, size: 1000 }]).color).toBe('red')
  })

  it('counts production vulnerabilities', () => {
    expect(vulnerabilitiesBadge({ metadata: { vulnerabilities: { total: 0 } } })).toMatchObject({
      message: '0',
      color: 'brightgreen',
    })
    expect(vulnerabilitiesBadge({ metadata: { vulnerabilities: { total: 3 } } })).toMatchObject({
      message: '3',
      color: 'red',
    })
  })

  it('builds one badge per lighthouse category and skips missing ones', () => {
    const badges = lighthouseBadges({
      categories: {
        performance: { score: 0.87 },
        accessibility: { score: 1 },
        'best-practices': { score: 0.96 },
        seo: { score: null },
      },
    })
    expect(Object.keys(badges)).toEqual([
      'lighthouse-performance',
      'lighthouse-accessibility',
      'lighthouse-best-practices',
    ])
    expect(badges['lighthouse-performance']).toMatchObject({
      label: 'performance',
      message: '87',
      color: 'orange',
    })
  })

  it('collects badges from CI output files and writes shields endpoint JSON', () => {
    const cwd = mkdtempSync(path.join(tmpdir(), 'badges-'))
    writeFileSync(path.join(cwd, 'type-coverage.txt'), '(9 / 10) 90.00%\n')
    writeFileSync(
      path.join(cwd, 'size-limit.json'),
      JSON.stringify([{ name: 'JS', passed: true, size: 1000 }])
    )
    writeFileSync(
      path.join(cwd, 'audit.json'),
      JSON.stringify({ metadata: { vulnerabilities: { total: 0 } } })
    )
    mkdirSync(path.join(cwd, '.lighthouseci'))
    writeFileSync(
      path.join(cwd, '.lighthouseci', 'lhr-1.json'),
      JSON.stringify({ categories: { seo: { score: 1 } } })
    )

    const badges = collectBadges(cwd)
    const outDir = path.join(cwd, 'out')
    writeBadges(badges, outDir)

    expect(readdirSync(outDir).toSorted()).toEqual([
      'bundle-size.json',
      'lighthouse-seo.json',
      'type-coverage.json',
      'vulnerabilities.json',
    ])
    expect(JSON.parse(readFileSync(path.join(outDir, 'lighthouse-seo.json'), 'utf8'))).toEqual({
      schemaVersion: 1,
      label: 'SEO',
      message: '100',
      color: 'brightgreen',
      namedLogo: 'lighthouse',
    })
  })

  it('returns no badges when there are no inputs', () => {
    expect(collectBadges(mkdtempSync(path.join(tmpdir(), 'badges-empty-')))).toEqual({})
  })
})
