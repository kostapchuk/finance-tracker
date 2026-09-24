import type { EntityTable } from 'dexie'
import { describe, it, expect, vi } from 'vitest'

import { restoreTable } from './db'

describe('restoreTable', () => {
  it('bulk-adds records when there are any', async () => {
    const bulkAdd = vi.fn().mockResolvedValue(undefined)
    const table = { bulkAdd } as unknown as EntityTable<{ id: number }, 'id'>

    const records = [{ id: 1 }, { id: 2 }]
    await restoreTable(table, records)

    expect(bulkAdd).toHaveBeenCalledTimes(1)
    expect(bulkAdd).toHaveBeenCalledWith(records)
  })

  it('skips the bulkAdd call when there is nothing to insert', async () => {
    const bulkAdd = vi.fn().mockResolvedValue(undefined)
    const table = { bulkAdd } as unknown as EntityTable<{ id: number }, 'id'>

    await restoreTable(table, [])

    expect(bulkAdd).not.toHaveBeenCalled()
  })
})
