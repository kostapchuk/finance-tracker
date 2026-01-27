import { useState } from 'react'
import { Plus, Pencil, Trash2, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAppStore } from '@/store/useAppStore'
import { incomeSourceRepo } from '@/database/repositories'
import { IncomeSourceForm } from './IncomeSourceForm'
import type { IncomeSource } from '@/database/types'

export function IncomeSourceList() {
  const incomeSources = useAppStore((state) => state.incomeSources)
  const refreshIncomeSources = useAppStore((state) => state.refreshIncomeSources)
  const [formOpen, setFormOpen] = useState(false)
  const [editingSource, setEditingSource] = useState<IncomeSource | null>(null)

  const handleEdit = (source: IncomeSource) => {
    setEditingSource(source)
    setFormOpen(true)
  }

  const handleDelete = async (source: IncomeSource) => {
    if (!source.id) return
    if (!confirm(`Delete "${source.name}"? This cannot be undone.`)) return

    await incomeSourceRepo.delete(source.id)
    await refreshIncomeSources()
  }

  const handleCloseForm = () => {
    setFormOpen(false)
    setEditingSource(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Income Sources</h3>
          <p className="text-sm text-muted-foreground">
            Track where your money comes from
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Income Source
        </Button>
      </div>

      {incomeSources.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">No income sources yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Add income sources like salary, freelance, or investments
            </p>
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Income Source
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {incomeSources.map((source) => (
            <Card key={source.id} className="relative overflow-hidden">
              <div
                className="absolute top-0 left-0 w-1 h-full"
                style={{ backgroundColor: source.color }}
              />
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${source.color}20` }}
                    >
                      <DollarSign className="h-4 w-4" style={{ color: source.color }} />
                    </div>
                    <CardTitle className="text-base">{source.name}</CardTitle>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleEdit(source)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => handleDelete(source)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      <IncomeSourceForm
        source={editingSource}
        open={formOpen}
        onClose={handleCloseForm}
      />
    </div>
  )
}
