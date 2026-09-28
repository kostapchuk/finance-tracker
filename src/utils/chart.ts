export interface ChartSlice {
  value: number
  color: string
}

/** Builds a `conic-gradient()` pie with one arc per slice, sized by its share of the total. */
export function buildDonutGradient(slices: ChartSlice[]): string {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0)
  let angle = 0
  const stops = slices.map((slice) => {
    const start = angle
    angle += (slice.value / total) * 360
    return `${slice.color} ${start}deg ${angle}deg`
  })
  return `conic-gradient(${stops.join(', ')})`
}
