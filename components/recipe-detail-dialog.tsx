"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { Recipe } from "@/lib/types"

interface RecipeDetailDialogProps {
  recipe: Recipe | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RecipeDetailDialog({ recipe, open, onOpenChange }: RecipeDetailDialogProps) {
  if (!recipe) return null

  const categoryNames: Record<string, string> = {
    breakfast: "Завтрак",
    lunch: "Обед",
    dinner: "Ужин",
    snack: "Перекус",
    dessert: "Десерт",
  }

  const getServingsText = (count: number) => {
    if (count === 1) return "порция"
    if (count < 5) return "порции"
    return "порций"
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">{recipe.name}</DialogTitle>
          <DialogDescription>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary">{categoryNames[recipe.category] || recipe.category}</Badge>
              <span className="text-sm">
                {recipe.servings} {getServingsText(recipe.servings)}
              </span>
            </div>
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-6">
            {recipe.description && (
              <div>
                <h3 className="font-semibold mb-2">Описание</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{recipe.description}</p>
              </div>
            )}

            <div>
              <h3 className="font-semibold mb-3">Ингредиенты</h3>
              {recipe.ingredients.length > 0 ? (
                <ul className="space-y-2">
                  {recipe.ingredients.map((ingredient, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <span className="text-muted-foreground mt-1">•</span>
                      <span>
                        <span className="font-medium">{ingredient.name}</span>
                        {ingredient.amount && (
                          <span className="text-muted-foreground">
                            {" "}
                            - {ingredient.amount} {ingredient.unit}
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Ингредиенты не указаны</p>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
