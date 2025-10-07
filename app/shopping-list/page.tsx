"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { ChevronLeft, ChevronRight, Printer, Download, ChevronDown } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { getWeekStart, formatWeekStart } from "@/lib/utils/date"
import type { Ingredient } from "@/lib/types"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

interface AggregatedIngredient extends Ingredient {
  checked: boolean
}

const CATEGORIES = {
  vegetables: {
    name: "🥕 Овощи",
    keywords: ["картофель", "морковь", "лук", "капуста", "свекла", "помидор", "огурец", "перец", "чеснок"],
  },
  meat: { name: "🥩 Мясо", keywords: ["мясо", "курица", "говядина", "свинина", "фарш", "бекон", "колбаса"] },
  grains: { name: "🍚 Крупы и макароны", keywords: ["рис", "гречка", "макароны", "паста", "крупа", "мука"] },
  dairy: {
    name: "🧀 Молочные продукты",
    keywords: ["молоко", "сметана", "сыр", "творог", "масло сливочное", "йогурт"],
  },
  bread: { name: "🍞 Хлеб и выпечка", keywords: ["хлеб", "батон", "булка", "лаваш"] },
  spices: {
    name: "🧂 Приправы и соусы",
    keywords: ["соль", "перец", "специи", "приправа", "соус", "уксус", "масло растительное"],
  },
  canned: { name: "🥫 Консервы", keywords: ["консерв", "томатная паста", "горошек"] },
  other: { name: "🍫 Прочее", keywords: [] },
}

type CategoryKey = keyof typeof CATEGORIES

export default function ShoppingListPage() {
  const router = useRouter()
  const [currentWeek, setCurrentWeek] = useState(getWeekStart())
  const [ingredients, setIngredients] = useState<AggregatedIngredient[]>([])
  const [isLoading, setIsLoading] = useState(true)
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

    loadShoppingList()
  }

  useEffect(() => {
    loadShoppingList()
  }, [currentWeek])

  const loadShoppingList = async () => {
    setIsLoading(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const weekStart = formatWeekStart(currentWeek)

      const { data: plans, error: plansError } = await supabase
        .from("meal_plans")
        .select("*")
        .eq("week_start", weekStart)
        .eq("user_id", user.id)

      if (plansError) throw plansError

      if (plans && plans.length > 0) {
        const recipeIds = plans.map((p) => p.recipe_id)
        const { data: recipes, error: recipesError } = await supabase
          .from("recipes")
          .select("*")
          .in("id", recipeIds)
          .eq("user_id", user.id)

        if (recipesError) throw recipesError

        const ingredientMap = new Map<string, AggregatedIngredient>()

        recipes?.forEach((recipe) => {
          recipe.ingredients.forEach((ingredient: Ingredient) => {
            const key = ingredient.name.toLowerCase()
            if (ingredientMap.has(key)) {
              const existing = ingredientMap.get(key)!
              if (existing.unit === ingredient.unit && ingredient.amount && existing.amount) {
                const existingAmount = Number.parseFloat(existing.amount)
                const newAmount = Number.parseFloat(ingredient.amount)
                if (!Number.isNaN(existingAmount) && !Number.isNaN(newAmount)) {
                  existing.amount = (existingAmount + newAmount).toString()
                }
              }
            } else {
              ingredientMap.set(key, {
                ...ingredient,
                checked: false,
              })
            }
          })
        })

        setIngredients(Array.from(ingredientMap.values()).sort((a, b) => a.name.localeCompare(b.name)))
      } else {
        setIngredients([])
      }
    } catch (error) {
      console.error("[v0] Error loading shopping list:", error)
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить список покупок.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const toggleIngredient = (index: number) => {
    const newIngredients = [...ingredients]
    newIngredients[index].checked = !newIngredients[index].checked
    setIngredients(newIngredients)
  }

  const navigateWeek = (direction: "prev" | "next") => {
    const newWeek = new Date(currentWeek)
    newWeek.setDate(newWeek.getDate() + (direction === "next" ? 7 : -7))
    setCurrentWeek(newWeek)
  }

  const goToCurrentWeek = () => {
    setCurrentWeek(getWeekStart())
  }

  const formatWeekRange = () => {
    const start = new Date(currentWeek)
    const end = new Date(currentWeek)
    end.setDate(end.getDate() + 6)

    const months = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"]

    return `${start.getDate()} ${months[start.getMonth()]} - ${end.getDate()} ${months[end.getMonth()]} ${end.getFullYear()}`
  }

  const handlePrint = () => {
    window.print()
  }

  const handleDownload = () => {
    const text = ingredients
      .map((ing) => {
        const amount = ing.amount ? `${ing.amount} ${ing.unit}`.trim() : ""
        return `${ing.checked ? "☑" : "☐"} ${ing.name}${amount ? ` - ${amount}` : ""}`
      })
      .join("\n")

    const blob = new Blob([`Список покупок - ${formatWeekRange()}\n\n${text}`], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `shopping-list-${formatWeekStart(currentWeek)}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const checkedCount = ingredients.filter((ing) => ing.checked).length
  const totalCount = ingredients.length

  const categorizeIngredient = (ingredientName: string): CategoryKey => {
    const lowerName = ingredientName.toLowerCase()
    for (const [key, category] of Object.entries(CATEGORIES)) {
      if (key === "other") continue
      if (category.keywords.some((keyword) => lowerName.includes(keyword))) {
        return key as CategoryKey
      }
    }
    return "other"
  }

  const groupedIngredients = ingredients.reduce(
    (acc, ingredient, index) => {
      const category = categorizeIngredient(ingredient.name)
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push({ ...ingredient, originalIndex: index })
      return acc
    },
    {} as Record<CategoryKey, Array<AggregatedIngredient & { originalIndex: number }>>,
  )

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">🛒 Список покупок</h1>
            <p className="text-muted-foreground">Все ингредиенты из вашего недельного плана</p>
          </div>
          <div className="flex gap-2 print:hidden">
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Печать
            </Button>
            <Button variant="outline" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />🧾 Скачать список
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between mb-6 print:hidden">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => navigateWeek("prev")}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-lg font-semibold min-w-[200px] text-center">{formatWeekRange()}</div>
            <Button variant="outline" size="icon" onClick={() => navigateWeek("next")}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" onClick={goToCurrentWeek}>
            Сегодня
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Загрузка списка покупок...</div>
        ) : ingredients.length === 0 ? (
          <Card className="rounded-2xl">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Нет ингредиентов на эту неделю.</p>
              <p className="text-sm text-muted-foreground mt-2">
                Добавьте рецепты в план питания, чтобы сформировать список покупок.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {Object.entries(CATEGORIES).map(([key, category]) => {
              const categoryIngredients = groupedIngredients[key as CategoryKey] || []
              if (categoryIngredients.length === 0) return null

              return (
                <Card key={key} className="rounded-2xl">
                  <Collapsible defaultOpen>
                    <CardHeader className="pb-3">
                      <CollapsibleTrigger className="flex items-center justify-between w-full hover:opacity-70 transition-opacity">
                        <CardTitle className="text-lg">{category.name}</CardTitle>
                        <div className="flex items-center gap-2">
                          <CardDescription className="text-sm">
                            {categoryIngredients.filter((i) => i.checked).length} / {categoryIngredients.length}
                          </CardDescription>
                          <ChevronDown className="h-4 w-4 transition-transform ui-expanded:rotate-180" />
                        </div>
                      </CollapsibleTrigger>
                    </CardHeader>
                    <CollapsibleContent>
                      <CardContent className="pt-0">
                        <div className="space-y-2">
                          {categoryIngredients.map((ingredient) => (
                            <div
                              key={ingredient.originalIndex}
                              className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                            >
                              <Checkbox
                                id={`ingredient-${ingredient.originalIndex}`}
                                checked={ingredient.checked}
                                onCheckedChange={() => toggleIngredient(ingredient.originalIndex)}
                                className="mt-0.5"
                              />
                              <label
                                htmlFor={`ingredient-${ingredient.originalIndex}`}
                                className={`flex-1 cursor-pointer select-none text-sm ${ingredient.checked ? "line-through text-muted-foreground" : ""}`}
                              >
                                <div className="font-medium">{ingredient.name}</div>
                                {ingredient.amount && (
                                  <div className="text-xs text-muted-foreground">
                                    {ingredient.amount} {ingredient.unit}
                                  </div>
                                )}
                              </label>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              )
            })}
          </div>
        )}
      </main>

      <style jsx global>{`
        @media print {
          .print\\:hidden {
            display: none !important;
          }
          body {
            background: white;
          }
        }
      `}</style>
    </div>
  )
}
