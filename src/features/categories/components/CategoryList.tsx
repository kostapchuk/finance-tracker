import { useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Tags } from 'lucide-react'
import { useState } from 'react'

import { CategoryForm } from './CategoryForm'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { categoryRepo } from '@/database/repositories'
import type { Category } from '@/database/types'
import { useCategories, useSettings } from '@/hooks/useDataHooks'
import { useLanguage } from '@/hooks/useLanguage'
import { formatCurrency } from '@/utils/currency'

export function CategoryList() {
  const { data: categories = [] } = useCategories()
  const { data: settings } = useSettings()
  const mainCurrency = settings?.defaultCurrency || 'BYN'
  const queryClient = useQueryClient()
  const { t } = useLanguage()
  const [formOpen, setFormOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)

  const handleEdit = (category: Category) => {
    setEditingCategory(category)
    setFormOpen(true)
  }

  const handleDelete = async (category: Category) => {
    if (!category.id) return
    if (!confirm(`Delete "${category.name}"? This cannot be undone.`)) return

    await categoryRepo.delete(category.id)
    await queryClient.invalidateQueries({ queryKey: ['categories'], refetchType: 'all' })
  }

  const handleCloseForm = () => {
    setFormOpen(false)
    setEditingCategory(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Spending Categories</h3>
          <p className="text-sm text-muted-foreground">
            Create categories to organize your expenses
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Category
        </Button>
      </div>

      {categories.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Tags className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">No categories yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create categories to start tracking your spending
            </p>
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Category
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <Card key={category.id} className="relative overflow-hidden">
              <div
                className="absolute top-0 left-0 w-1 h-full"
                style={{ backgroundColor: category.color }}
              />
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-lg"
                      style={{ backgroundColor: category.color }}
                    />
                    <CardTitle className="text-base">{category.name}</CardTitle>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleEdit(category)}
                      aria-label={t('edit')}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => handleDelete(category)}
                      aria-label={t('delete')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {category.budget ? (
                  <Badge variant="secondary">
                    {t('budget')}: {formatCurrency(category.budget, mainCurrency)}/
                    {category.budgetPeriod}
                  </Badge>
                ) : (
                  <Badge variant="outline">{t('noBudget')}</Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CategoryForm category={editingCategory} open={formOpen} onClose={handleCloseForm} />
    </div>
  )
}
