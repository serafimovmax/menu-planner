"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, X, RefreshCw } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import type { Ingredient, Recipe } from "@/lib/types"

interface EditRecipeDialogProps {
  recipe: Recipe | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onRecipeUpdated?: () => void
}

export function EditRecipeDialog({ recipe, open, onOpenChange, onRecipeUpdated }: EditRecipeDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [name, setName] = useState("")
  const [category, setCategory] = useState("")
  const [description, setDescription] = useState("")
  const [servings, setServings] = useState("4")
  const [ingredients, setIngredients] = useState<Ingredient[]>([{ name: "", amount: "", unit: "" }])
  const { toast } = useToast()

  useEffect(() => {
    if (recipe) {
      setName(recipe.name)
      setCategory(recipe.category)
      setDescription(recipe.description || "")
      setServings(recipe.servings.toString())
      setIngredients(recipe.ingredients.length > 0 ? recipe.ingredients : [{ name: "", amount: "", unit: "" }])
    }
  }, [recipe])

  const addIngredient = () => {
    setIngredients([...ingredients, { name: "", amount: "", unit: "" }])
  }

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index))
  }

  const updateIngredient = (index: number, field: keyof Ingredient, value: string) => {
    const newIngredients = [...ingredients]
    newIngredients[index][field] = value
    setIngredients(newIngredients)
  }

  const handleRegenerateRecipe = async () => {
    if (!name.trim()) {
      toast({
        title: "Ошибка",
        description: "Введите название блюда",
        variant: "destructive",
      })
      return
    }

    setIsRegenerating(true)
    try {
      const response = await fetch("/api/generate-recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, servings: Number.parseInt(servings) }),
      })

      const data = await response.json()

      if (data.success) {
        setDescription(data.description || description)
        setIngredients(data.ingredients)
        toast({
          title: "Рецепт перегенерирован!",
          description: "Проверьте обновлённые данные",
        })
      } else {
        toast({
          title: "Ошибка",
          description: "Не удалось перегенерировать рецепт",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Regenerate recipe error:", error)
      toast({
        title: "Ошибка",
        description: "Не удалось перегенерировать рецепт",
        variant: "destructive",
      })
    } finally {
      setIsRegenerating(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!recipe) return

    setIsLoading(true)

    try {
      const supabase = createClient()
      const validIngredients = ingredients.filter((ing) => ing.name.trim())

      const { error } = await supabase
        .from("recipes")
        .update({
          name,
          category,
          description: description || null,
          ingredients: validIngredients,
          servings: Number.parseInt(servings),
          updated_at: new Date().toISOString(),
        })
        .eq("id", recipe.id)

      if (error) throw error

      toast({
        title: "Рецепт обновлён",
        description: `${name} был обновлён.`,
      })

      onOpenChange(false)
      onRecipeUpdated?.()
    } catch (error) {
      console.error("[v0] Error updating recipe:", error)
      toast({
        title: "Ошибка",
        description: "Не удалось обновить рецепт. Попробуйте снова.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (!recipe) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Редактировать рецепт</DialogTitle>
          <DialogDescription>Обновите детали рецепта.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Название рецепта</Label>
              <div className="flex gap-2">
                <Input
                  id="edit-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="например, Спагетти Карбонара"
                  required
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleRegenerateRecipe}
                  disabled={isRegenerating}
                  title="Перегенерировать рецепт с помощью AI"
                >
                  <RefreshCw className={`h-4 w-4 ${isRegenerating ? "animate-spin" : ""}`} />
                </Button>
              </div>
              {isRegenerating && <p className="text-xs text-muted-foreground">Генерация рецепта через AI...</p>}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-category">Категория</Label>
              <Select value={category} onValueChange={setCategory} required>
                <SelectTrigger id="edit-category">
                  <SelectValue placeholder="Выберите категорию" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="breakfast">Завтрак</SelectItem>
                  <SelectItem value="lunch">Обед</SelectItem>
                  <SelectItem value="dinner">Ужин</SelectItem>
                  <SelectItem value="snack">Перекус</SelectItem>
                  <SelectItem value="dessert">Десерт</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-servings">Порций</Label>
              <Input
                id="edit-servings"
                type="number"
                min="1"
                value={servings}
                onChange={(e) => setServings(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-description">Описание (опционально)</Label>
              <Textarea
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Краткое описание рецепта..."
                rows={3}
              />
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label>Ингредиенты</Label>
                <Button type="button" variant="outline" size="sm" onClick={addIngredient}>
                  <Plus className="h-4 w-4 mr-1" />
                  Добавить ингредиент
                </Button>
              </div>
              <div className="space-y-2">
                {ingredients.map((ingredient, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder="Название ингредиента"
                      value={ingredient.name}
                      onChange={(e) => updateIngredient(index, "name", e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      placeholder="Кол-во"
                      value={ingredient.amount}
                      onChange={(e) => updateIngredient(index, "amount", e.target.value)}
                      className="w-24"
                    />
                    <Input
                      placeholder="Ед."
                      value={ingredient.unit}
                      onChange={(e) => updateIngredient(index, "unit", e.target.value)}
                      className="w-24"
                    />
                    {ingredients.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeIngredient(index)}>
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Обновление..." : "Обновить рецепт"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
