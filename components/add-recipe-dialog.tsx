"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, X, Sparkles } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import type { Ingredient } from "@/lib/types"

interface AddRecipeDialogProps {
  onRecipeAdded?: () => void
}

export function AddRecipeDialog({ onRecipeAdded }: AddRecipeDialogProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [name, setName] = useState("")
  const [category, setCategory] = useState("")
  const [description, setDescription] = useState("")
  const [servings, setServings] = useState("2")
  const [generationServings, setGenerationServings] = useState("2")
  const [baseIngredients, setBaseIngredients] = useState<Ingredient[]>([])
  const [baseServingsCount, setBaseServingsCount] = useState(2)
  const [ingredients, setIngredients] = useState<Ingredient[]>([{ name: "", amount: "", unit: "" }])
  const [steps, setSteps] = useState<string[]>([""])
  const { toast } = useToast()

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

  const addStep = () => {
    setSteps([...steps, ""])
  }

  const removeStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index))
  }

  const updateStep = (index: number, value: string) => {
    const newSteps = [...steps]
    newSteps[index] = value
    setSteps(newSteps)
  }

  const scaleIngredientAmount = (amount: string, scale: number): string => {
    if (amount.includes("по вкусу") || amount.includes("для жарки")) {
      return amount
    }

    const numMatch = amount.match(/^(\d+\.?\d*)/)
    if (numMatch) {
      const num = Number.parseFloat(numMatch[1])
      const scaled = Math.round(num * scale * 10) / 10
      return amount.replace(numMatch[1], scaled.toString())
    }

    return amount
  }

  const handleServingsChange = (newServings: string) => {
    setGenerationServings(newServings)

    if (baseIngredients.length > 0) {
      const scale = Number.parseInt(newServings) / baseServingsCount
      const scaledIngredients = baseIngredients.map((ing) => ({
        ...ing,
        amount: scaleIngredientAmount(ing.amount, scale),
      }))
      setIngredients(scaledIngredients)
      setServings(newServings)
    }
  }

  const handleGenerateRecipe = async () => {
    if (!name.trim()) {
      toast({
        title: "Ошибка",
        description: "Введите название блюда",
        variant: "destructive",
      })
      return
    }

    setIsGenerating(true)
    try {
      const response = await fetch("/api/generate-recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dishName: name, servings: Number.parseInt(generationServings) }),
      })

      const data = await response.json()

      if (data.success && data.recipe) {
        if (data.recipe.category) {
          setCategory(data.recipe.category)
        }
        setDescription(data.recipe.description || "")
        setIngredients(data.recipe.ingredients || [{ name: "", amount: "", unit: "" }])
        setSteps(data.recipe.steps || [""])
        setBaseIngredients(data.recipe.ingredients || [])
        setBaseServingsCount(Number.parseInt(generationServings))
        setServings(generationServings)

        const cacheStatus = data.cached ? " (из кэша)" : ""
        toast({
          title: `Рецепт сгенерирован!${cacheStatus}`,
          description: "Проверьте и отредактируйте при необходимости",
        })
      } else {
        setDescription("Пока нет рецепта. Заполни вручную.")
        setIngredients([{ name: "", amount: "", unit: "" }])
        toast({
          title: "Рецепт не найден",
          description: data.message || "Не удалось сгенерировать рецепт. Попробуйте снова.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Generate recipe error:", error)
      toast({
        title: "Ошибка",
        description: "Не удалось сгенерировать рецепт. Проверьте подключение к интернету.",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Пользователь не авторизован")

      const validIngredients = ingredients.filter((ing) => ing.name.trim())
      const validSteps = steps.filter((s) => s.trim())

      const { error } = await supabase.from("recipes").insert({
        name,
        category,
        description: description || null,
        ingredients: validIngredients,
        steps: validSteps,
        servings: Number.parseInt(servings),
        user_id: user.id,
      })

      if (error) throw error

      toast({
        title: "Рецепт добавлен",
        description: `${name} добавлен в ваши рецепты.`,
      })

      // очистка
      setName("")
      setCategory("")
      setDescription("")
      setServings("2")
      setGenerationServings("2")
      setBaseIngredients([])
      setBaseServingsCount(2)
      setIngredients([{ name: "", amount: "", unit: "" }])
      setSteps([""])
      setOpen(false)
      onRecipeAdded?.()
    } catch (error) {
      console.error("[v0] Error adding recipe:", error)
      toast({
        title: "Ошибка",
        description: "Не удалось добавить рецепт. Попробуйте снова.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Добавить рецепт
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Добавить новый рецепт</DialogTitle>
          <DialogDescription>Создайте новый рецепт для вашего планировщика меню.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Название */}
            <div className="grid gap-2">
              <Label htmlFor="name">Название рецепта</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="например, Борщ или Паста Карбонара"
                required
              />
            </div>

            {/* Количество порций + генерация */}
            <div className="grid gap-2">
              <Label htmlFor="generation-servings">Количество персон 🍽️</Label>
              <div className="flex gap-2 items-center">
                <Input
                  id="generation-servings"
                  type="number"
                  min="1"
                  max="8"
                  value={generationServings}
                  onChange={(e) => handleServingsChange(e.target.value)}
                  className="w-24"
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleGenerateRecipe}
                  disabled={isGenerating}
                  className="flex-1"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  {isGenerating ? "Генерация..." : "✨ Сгенерировать рецепт"}
                </Button>
              </div>
            </div>

            {/* Категория */}
            <div className="grid gap-2">
              <Label htmlFor="category">Категория</Label>
              <Select value={category} onValueChange={setCategory} required>
                <SelectTrigger id="category">
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

            {/* Порции */}
            <div className="grid gap-2">
              <Label htmlFor="servings">Порций (для сохранения)</Label>
              <Input
                id="servings"
                type="number"
                min="1"
                value={servings}
                onChange={(e) => setServings(e.target.value)}
                required
              />
            </div>

            {/* Описание */}
            <div className="grid gap-2">
              <Label htmlFor="description">Описание (опционально)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Краткое описание рецепта..."
                rows={3}
              />
            </div>

            {/* Ингредиенты */}
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

            {/* Шаги приготовления */}
            <div className="grid gap-2 mt-4">
              <div className="flex items-center justify-between">
                <Label>Шаги приготовления</Label>
                <Button type="button" variant="outline" size="sm" onClick={addStep}>
                  <Plus className="h-4 w-4 mr-1" />
                  Добавить шаг
                </Button>
              </div>
              <div className="space-y-2">
                {steps.map((step, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <Textarea
                      placeholder={`Шаг ${index + 1}`}
                      value={step}
                      onChange={(e) => updateStep(index, e.target.value)}
                      rows={2}
                      className="flex-1"
                    />
                    {steps.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeStep(index)}>
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Добавление..." : "Добавить рецепт"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
