"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { X } from "lucide-react"
import type { Recipe } from "@/lib/types"

interface MealCardProps {
  recipe: Recipe
  onRemove: () => void
  compact?: boolean
}

export function MealCard({ recipe, onRemove, compact = false }: MealCardProps) {
  const getServingsText = (count: number) => {
    if (count === 1) return "порция"
    if (count < 5) return "порции"
    return "порций"
  }

  if (compact) {
    return (
      <Card className="relative group hover:shadow-sm transition-all animate-fade-in h-[70px]">
        <CardContent className="p-2.5 h-full flex flex-col justify-between">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-1 right-1 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity z-10"
            onClick={onRemove}
            aria-label="Удалить блюдо"
          >
            <X className="h-3 w-3" />
          </Button>
          <div className="space-y-1 pr-6">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <h4 className="font-medium text-sm leading-tight line-clamp-2 cursor-help">{recipe.name}</h4>
                </TooltipTrigger>
                {recipe.description && (
                  <TooltipContent side="top" className="max-w-xs">
                    <p className="text-sm">{recipe.description}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
            <p className="text-xs text-muted-foreground">
              {recipe.servings} {getServingsText(recipe.servings)}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="relative group hover:shadow-sm transition-all animate-fade-in h-[100px]">
      <CardContent className="p-2.5 h-full flex flex-col justify-between">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-1 right-1 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity z-10"
          onClick={onRemove}
          aria-label="Удалить блюдо"
        >
          <X className="h-3 w-3" />
        </Button>
        <div className="space-y-0.5 pr-6">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <h4 className="font-medium text-sm leading-tight line-clamp-2 cursor-help">{recipe.name}</h4>
              </TooltipTrigger>
              {recipe.description && (
                <TooltipContent side="top" className="max-w-xs">
                  <p className="text-sm">{recipe.description}</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
          <p className="text-xs text-muted-foreground">
            {recipe.servings} {getServingsText(recipe.servings)}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
