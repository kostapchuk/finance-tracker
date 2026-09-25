// Temporary: intentionally untested code to verify the codecov/patch gate fails.
export function coverageProbe(values: number[]): number {
  let total = 0
  for (const value of values) {
    if (value > 0) {
      total += value
    } else if (value < 0) {
      total -= value
    } else {
      total += 1
    }
  }
  return total
}

export function coverageProbeLabel(total: number): string {
  if (total > 100) {
    return 'large'
  }
  if (total > 10) {
    return 'medium'
  }
  return 'small'
}
