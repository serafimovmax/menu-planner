"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { createClient } from "@/lib/supabase/client"
import type { Recipe } from "@/lib/types"
import { Search } from "lucide-react"

interface SelectRecipeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectRecipe: (recipe: Recipe) => void
}

export function SelectRecipeDialog({ open, onOpenChange, onSelectRecipe }: SelectRecipeDialogProps) {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [filteredRecipes, setFilteredRecipes] = useState<Recipe[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(false)

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

  useEffect(() => {
    if (open) {
      loadRecipes()
    }
  }, [open])

  useEffect(() => {
    if (searchQuery) {
      const filtered = recipes.filter(
        (recipe) =>
          recipe.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          recipe.category.toLowerCase().includes(searchQuery.toLowerCase()),
      )
      setFilteredRecipes(filtered)
    } else {
      setFilteredRecipes(recipes)
    }
  }, [searchQuery, recipes])

  const loadRecipes = async () => {
    setIsLoading(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from("recipes")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (error) throw error
      setRecipes(data || [])
      setFilteredRecipes(data || [])
    } catch (error) {
      console.error("[v0] Error loading recipes:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelect = (recipe: Recipe) => {
    onSelectRecipe(recipe)
    onOpenChange(false)
    setSearchQuery("")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Выберите рецепт</DialogTitle>
          <DialogDescription>Выберите рецепт для добавления в план питания.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск рецептов..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <ScrollArea className="h-[400px] pr-4">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Загрузка рецептов...</div>
            ) : filteredRecipes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? "Рецепты не найдены." : "Пока нет рецептов. Добавьте свой первый рецепт!"}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredRecipes.map((recipe) => (
                  <Button
                    key={recipe.id}
                    variant="outline"
                    className="w-full justify-start h-auto p-4 bg-transparent"
                    onClick={() => handleSelect(recipe)}
                  >
                    <div className="text-left space-y-1">
                      <div className="font-medium">{recipe.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {categoryNames[recipe.category] || recipe.category} • {recipe.servings}{" "}
                        {getServingsText(recipe.servings)}
                      </div>
                      {recipe.description && (
                        <div className="text-xs text-muted-foreground line-clamp-1">{recipe.description}</div>
                      )}
                    </div>
                  </Button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  )
}
