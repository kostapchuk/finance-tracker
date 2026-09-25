// Generates shields.io endpoint JSON files for README badges from CI outputs.
// Usage: node scripts/badges.mjs <outDir>
// Reads (all optional, relative to cwd):
//   type-coverage.txt  - stdout of `type-coverage`
//   size-limit.json    - stdout of `size-limit --json`
//   audit.json         - stdout of `npm audit --omit=dev --json`
//   .lighthouseci/lhr-*.json - Lighthouse reports from `lhci collect`
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const LIGHTHOUSE_CATEGORIES = {
  performance: 'performance',
  accessibility: 'accessibility',
  'best-practices': 'best practices',
  seo: 'SEO',
}

export function scoreColor(percent) {
  if (percent >= 90) return 'brightgreen'
  if (percent >= 50) return 'orange'
  return 'red'
}

export function badge(label, message, color, extra = {}) {
  return { schemaVersion: 1, label, message: String(message), color, ...extra }
}

export function parseTypeCoverage(text) {
  const match = /\(\d+ \/ \d+\) ([\d.]+)%/.exec(text)
  return match ? Number(match[1]) : undefined
}

export function typeCoverageBadge(percent) {
  let color = 'red'
  if (percent >= 95) color = 'brightgreen'
  else if (percent >= 90) color = 'green'
  else if (percent >= 80) color = 'yellow'
  return badge('type coverage', `${percent.toFixed(2)}%`, color, {
    namedLogo: 'typescript',
  })
}

export function formatKb(bytes) {
  return `${(bytes / 1000).toFixed(1)} kB`
}

export function bundleSizeBadge(results) {
  const total = results.reduce((sum, r) => sum + r.size, 0)
  const passed = results.every((r) => r.passed)
  return badge('bundle size (gzip)', formatKb(total), passed ? 'blue' : 'red')
}

export function vulnerabilitiesBadge(audit) {
  const total = audit?.metadata?.vulnerabilities?.total ?? 0
  return badge('vulnerabilities', total, total === 0 ? 'brightgreen' : 'red', {
    namedLogo: 'npm',
  })
}

export function lighthouseBadges(report) {
  const badges = {}
  for (const [id, label] of Object.entries(LIGHTHOUSE_CATEGORIES)) {
    const score = report.categories?.[id]?.score
    if (typeof score !== 'number') continue
    const percent = Math.round(score * 100)
    badges[`lighthouse-${id}`] = badge(label, percent, scoreColor(percent), {
      namedLogo: 'lighthouse',
    })
  }
  return badges
}

function readIfExists(file) {
  return existsSync(file) ? readFileSync(file, 'utf8') : undefined
}

export function collectBadges(cwd) {
  const badges = {}

  const typeCoverage = readIfExists(path.join(cwd, 'type-coverage.txt'))
  const percent = typeCoverage ? parseTypeCoverage(typeCoverage) : undefined
  if (percent !== undefined) badges['type-coverage'] = typeCoverageBadge(percent)

  const sizeLimit = readIfExists(path.join(cwd, 'size-limit.json'))
  if (sizeLimit) badges['bundle-size'] = bundleSizeBadge(JSON.parse(sizeLimit))

  const audit = readIfExists(path.join(cwd, 'audit.json'))
  if (audit) badges.vulnerabilities = vulnerabilitiesBadge(JSON.parse(audit))

  const lhciDir = path.join(cwd, '.lighthouseci')
  if (existsSync(lhciDir)) {
    const report = readdirSync(lhciDir).find((f) => /^lhr-.*\.json$/.test(f))
    if (report) {
      Object.assign(
        badges,
        lighthouseBadges(JSON.parse(readFileSync(path.join(lhciDir, report), 'utf8')))
      )
    }
  }

  return badges
}

export function writeBadges(badges, outDir) {
  mkdirSync(outDir, { recursive: true })
  for (const [name, data] of Object.entries(badges)) {
    writeFileSync(path.join(outDir, `${name}.json`), `${JSON.stringify(data, null, 2)}\n`)
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const outDir = process.argv[2] ?? 'badges'
  const badges = collectBadges(process.cwd())
  writeBadges(badges, outDir)
  console.log(
    `Wrote ${Object.keys(badges).length} badges to ${outDir}: ${Object.keys(badges).join(', ')}`
  )
}
