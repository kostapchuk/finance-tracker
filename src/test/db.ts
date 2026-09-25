import { db } from '@/database/db'
import { useAppStore } from '@/store/useAppStore'

const initialStoreState = useAppStore.getState()

/** Empties every table and puts the app store back to its initial state. */
export async function resetDbAndStore(): Promise<void> {
  await Promise.all(db.tables.map((table) => table.clear()))
  useAppStore.setState(initialStoreState, true)
}

/** Unwraps the id a Dexie `add` resolves to, failing loudly if there is none. */
export async function created(id: Promise<number | undefined>): Promise<number> {
  const value = await id
  if (value === undefined) throw new Error('expected the repository to return an id')
  return value
}
