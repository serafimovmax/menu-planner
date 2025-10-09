"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Navigation } from "@/components/navigation"
import { AddRecipeDialog } from "@/components/add-recipe-dialog"
import { RecipeDetailDialog } from "@/components/recipe-detail-dialog"
import { EditRecipeDialog } from "@/components/edit-recipe-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Search, MoreVertical, Eye, Pencil, Trash2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import type { Recipe } from "@/lib/types"
import AddRecipeDialog from "@/components/add-recipe-dialog"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function RecipesPage() {
  const router = useRouter()
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [filteredRecipes, setFilteredRecipes] = useState<Recipe[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [recipeToDelete, setRecipeToDelete] = useState<Recipe | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      router.push("/login")
      return
    }

    loadRecipes()
  }

  useEffect(() => {
    if (searchQuery) {
      const filtered = recipes.filter(
        (recipe) =>
          recipe.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          recipe.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
          recipe.description?.toLowerCase().includes(searchQuery.toLowerCase()),
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
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить рецепты.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleViewRecipe = (recipe: Recipe) => {
    setSelectedRecipe(recipe)
    setDetailDialogOpen(true)
  }

  const handleEditRecipe = (recipe: Recipe) => {
    setSelectedRecipe(recipe)
    setEditDialogOpen(true)
  }

  const handleDeleteClick = (recipe: Recipe) => {
    setRecipeToDelete(recipe)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!recipeToDelete) return

    try {
      const supabase = createClient()
      const { error } = await supabase.from("recipes").delete().eq("id", recipeToDelete.id)

      if (error) throw error

      toast({
        title: "Рецепт удалён",
        description: `${recipeToDelete.name} был удалён.`,
      })

      loadRecipes()
    } catch (error) {
      console.error("[v0] Error deleting recipe:", error)
      toast({
        title: "Ошибка",
        description: "Не удалось удалить рецепт.",
        variant: "destructive",
      })
    } finally {
      setDeleteDialogOpen(false)
      setRecipeToDelete(null)
    }
  }

  const groupedRecipes = filteredRecipes.reduce(
    (acc, recipe) => {
      if (!acc[recipe.category]) {
        acc[recipe.category] = []
      }
      acc[recipe.category].push(recipe)
      return acc
    },
    {} as Record<string, Recipe[]>,
  )

  const categoryNames: Record<string, string> = {
    breakfast: "Завтрак",
    lunch: "Обед",
    dinner: "Ужин",
    snack: "Перекус",
    dessert: "Десерт",
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Коллекция рецептов</h1>
            <p className="text-muted-foreground">Управляйте всеми вашими рецептами в одном месте</p>
          </div>
          <AddRecipeDialog onRecipeAdded={loadRecipes} />
        </div>

        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск рецептов..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Загрузка рецептов...</div>
        ) : filteredRecipes.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              {searchQuery ? "Рецепты не найдены." : "Пока нет рецептов. Добавьте свой первый рецепт!"}
            </p>
            {!searchQuery && <AddRecipeDialog onRecipeAdded={loadRecipes} />}
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedRecipes).map(([category, categoryRecipes]) => (
              <div key={category}>
                <h2 className="text-xl font-semibold mb-4">{categoryNames[category] || category}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categoryRecipes.map((recipe) => (
                    <Card key={recipe.id} className="hover:shadow-md transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg leading-tight mb-2">{recipe.name}</CardTitle>
                            <CardDescription>
                              {recipe.servings}{" "}
                              {recipe.servings === 1 ? "порция" : recipe.servings < 5 ? "порции" : "порций"}
                            </CardDescription>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewRecipe(recipe)}>
                                <Eye className="h-4 w-4 mr-2" />
                                Подробнее
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEditRecipe(recipe)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Редактировать
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeleteClick(recipe)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Удалить
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardHeader>
                      {recipe.description && (
                        <CardContent>
                          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                            {recipe.description}
                          </p>
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <RecipeDetailDialog recipe={selectedRecipe} open={detailDialogOpen} onOpenChange={setDetailDialogOpen} />

        <EditRecipeDialog
          recipe={selectedRecipe}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onRecipeUpdated={loadRecipes}
        />

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Вы уверены?</AlertDialogTitle>
              <AlertDialogDescription>
                Это действие удалит рецепт "{recipeToDelete?.name}" навсегда. Это действие нельзя отменить.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Отмена</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground">
                Удалить
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  )
}
