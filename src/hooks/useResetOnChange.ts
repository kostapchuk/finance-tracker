import { useState } from 'react'

/**
 * Calls `reset` on mount and thereafter whenever any entry in `deps` changes,
 * matching `useEffect(reset, deps)` firing semantics.
 *
 * Unlike an effect, the state update happens during render, so the component
 * never commits a frame showing the stale values. This is React's recommended
 * replacement for resetting local state from an effect.
 *
 * Intended for dialog forms that seed their fields from a prop and re-seed when
 * they open or are pointed at a different entity.
 */
export function useResetOnChange(deps: readonly unknown[], reset: () => void): void {
  // `null` marks the first render, so `reset` runs on mount just as an effect would.
  const [prevDeps, setPrevDeps] = useState<readonly unknown[] | null>(null)

  const changed =
    prevDeps === null ||
    prevDeps.length !== deps.length ||
    deps.some((dep, index) => !Object.is(dep, prevDeps[index]))

  if (changed) {
    setPrevDeps(deps)
    reset()
  }
}
