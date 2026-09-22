import { useState } from 'react'

import { getRandomColor } from '@/utils/colors'

interface EntityFieldsSource {
  name: string
  color: string
  hiddenFromDashboard?: boolean
}

/**
 * Shared local state for the name/color/hiddenFromDashboard fields and the
 * isLoading flag that AccountForm, CategoryForm, and IncomeSourceForm all
 * repeat. Entity-specific fields (type, currency, balance, ...) stay in the
 * individual form; call `resetFields` from that form's own useResetOnChange
 * alongside its own reset logic.
 */
export function useEntityFormFields() {
  const [name, setName] = useState('')
  const [color, setColor] = useState(getRandomColor())
  const [hiddenFromDashboard, setHiddenFromDashboard] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const resetFields = (entity: EntityFieldsSource | null | undefined) => {
    if (entity) {
      setName(entity.name)
      setColor(entity.color)
      setHiddenFromDashboard(entity.hiddenFromDashboard || false)
    } else {
      setName('')
      setColor(getRandomColor())
      setHiddenFromDashboard(false)
    }
  }

  return {
    name,
    setName,
    color,
    setColor,
    hiddenFromDashboard,
    setHiddenFromDashboard,
    isLoading,
    setIsLoading,
    resetFields,
  }
}
