"use client"

import { useState, useEffect } from "react"
import { Navigation } from "@/components/navigation"
import AddRecipeDialog from "@/components/add-recipe-dialog"
import { SelectRecipeDialog } from "@/components/select-recipe-dialog"
import { MealCard } from "@/components/meal-card"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { getWeekStart, formatWeekStart, getDayName, getShortDayName, getMealTypeName } from "@/lib/utils/date"
import type { MealPlan, Recipe, MealType } from "@/lib/types"
import AddRecipeDialog from "@/components/add-recipe-dialog"


export default function PlannerPage() {
  const [currentWeek, setCurrentWeek] = useState(getWeekStart())
  const [showNextWeek, setShowNextWeek] = useState(false)
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([])
  const [nextWeekMealPlans, setNextWeekMealPlans] = useState<MealPlan[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectDialogOpen, setSelectDialogOpen] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<{
    day: number
    mealType: MealType
    weekOffset: number
  } | null>(null)
  const [showWelcome, setShowWelcome] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const { toast } = useToast()

  const mealTypes: MealType[] = ["breakfast", "lunch", "dinner"]

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      loadMealPlans()
      if (showNextWeek) {
        loadNextWeekMealPlans()
      }
    } else {
      setIsLoading(false)
      setShowWelcome(true)
    }
  }, [currentWeek, isAuthenticated, showNextWeek])

  const checkAuth = async () => {
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setIsAuthenticated(!!user)
    } catch (error) {
      setIsAuthenticated(false)
    }
  }

  const loadMealPlans = async () => {
    setIsLoading(true)
    try {
      const supabase = createClient()
      const weekStart = formatWeekStart(currentWeek)

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setMealPlans([])
        setIsLoading(false)
        return
      }

      const { data: plans, error: plansError } = await supabase
        .from("meal_plans")
        .select("*")
        .eq("week_start", weekStart)
        .eq("user_id", user.id)

      if (plansError) throw plansError

      if (plans && plans.length === 0) {
        const { data: allPlans } = await supabase.from("meal_plans").select("id").eq("user_id", user.id).limit(1)

        if (!allPlans || allPlans.length === 0) {
          setShowWelcome(true)
        }
      }

      if (plans && plans.length > 0) {
        const recipeIds = plans.map((p) => p.recipe_id)
        const { data: recipes, error: recipesError } = await supabase
          .from("recipes")
          .select("*")
          .in("id", recipeIds)
          .eq("user_id", user.id)

        if (recipesError) throw recipesError

        const plansWithRecipes = plans.map((plan) => ({
          ...plan,
          recipe: recipes?.find((r) => r.id === plan.recipe_id),
        }))

        setMealPlans(plansWithRecipes)
      } else {
        setMealPlans([])
      }
    } catch (error) {
      console.error("[v0] Error loading meal plans:", error)
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить план меню.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const loadNextWeekMealPlans = async () => {
    try {
      const supabase = createClient()
      const nextWeek = new Date(currentWeek)
      nextWeek.setDate(nextWeek.getDate() + 7)
      const weekStart = formatWeekStart(nextWeek)

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setNextWeekMealPlans([])
        return
      }

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

        const plansWithRecipes = plans.map((plan) => ({
          ...plan,
          recipe: recipes?.find((r) => r.id === plan.recipe_id),
        }))

        setNextWeekMealPlans(plansWithRecipes)
      } else {
        setNextWeekMealPlans([])
      }
    } catch (error) {
      console.error("[v0] Error loading next week meal plans:", error)
    }
  }

  const handleAddMeal = (day: number, mealType: MealType, weekOffset = 0) => {
    if (!isAuthenticated) {
      toast({
        title: "Требуется авторизация",
        description: "Войдите в аккаунт, чтобы сохранять рецепты и планы меню.",
        variant: "destructive",
      })
      return
    }
    setSelectedSlot({ day, mealType, weekOffset })
    setSelectDialogOpen(true)
    setShowWelcome(false)
  }

  const handleSelectRecipe = async (recipe: Recipe) => {
    if (!selectedSlot) return

    try {
      const supabase = createClient()
      const targetWeek = new Date(currentWeek)
      targetWeek.setDate(targetWeek.getDate() + selectedSlot.weekOffset * 7)
      const weekStart = formatWeekStart(targetWeek)

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Пользователь не авторизован")

      const { error } = await supabase.from("meal_plans").insert({
        recipe_id: recipe.id,
        day_of_week: selectedSlot.day,
        meal_type: selectedSlot.mealType,
        week_start: weekStart,
        user_id: user.id,
      })

      if (error) throw error

      toast({
        title: "Блюдо добавлено",
        description: `${recipe.name} добавлено в ${getDayName(selectedSlot.day)}, ${getMealTypeName(selectedSlot.mealType)}.`,
      })

      loadMealPlans()
      if (showNextWeek) {
        loadNextWeekMealPlans()
      }
    } catch (error) {
      console.error("[v0] Error adding meal:", error)
      toast({
        title: "Ошибка",
        description: "Не удалось добавить блюдо в план.",
        variant: "destructive",
      })
    }
  }

  const handleRemoveMeal = async (mealPlanId: string) => {
    try {
      const supabase = createClient()
      const { error } = await supabase.from("meal_plans").delete().eq("id", mealPlanId)

      if (error) throw error

      toast({
        title: "Блюдо удалено",
        description: "Блюдо удалено из вашего плана.",
      })

      loadMealPlans()
      if (showNextWeek) {
        loadNextWeekMealPlans()
      }
    } catch (error) {
      console.error("[v0] Error removing meal:", error)
      toast({
        title: "Ошибка",
        description: "Не удалось удалить блюдо.",
        variant: "destructive",
      })
    }
  }

  const getMealForSlot = (day: number, mealType: MealType, weekOffset = 0) => {
    const plans = weekOffset === 0 ? mealPlans : nextWeekMealPlans
    return plans.find((plan) => plan.day_of_week === day && plan.meal_type === mealType)
  }

  const navigateWeek = (direction: "prev" | "next") => {
    const newWeek = new Date(currentWeek)
    newWeek.setDate(newWeek.getDate() + (direction === "next" ? 7 : -7))
    setCurrentWeek(newWeek)
  }

  const goToCurrentWeek = () => {
    setCurrentWeek(getWeekStart())
  }

  const formatWeekRange = (weekOffset = 0) => {
    const start = new Date(currentWeek)
    start.setDate(start.getDate() + weekOffset * 7)
    const end = new Date(start)
    end.setDate(end.getDate() + 6)

    const months = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"]

    return `${start.getDate()} ${months[start.getMonth()]} - ${end.getDate()} ${months[end.getMonth()]} ${end.getFullYear()}`
  }

  const WeekRow = ({ weekOffset }: { weekOffset: number }) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground">{formatWeekRange(weekOffset)}</h3>
      </div>
      <div
        className="grid gap-2 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7"
        role="table"
        aria-label={`План меню на неделю ${formatWeekRange(weekOffset)}`}
      >
        {[0, 1, 2, 3, 4, 5, 6].map((day) => (
          <Card key={day} className="rounded-xl shadow-sm" role="cell" aria-label={`${getShortDayName(day)}`}>
            <CardHeader className="pb-2 pt-3 px-3">
              <CardTitle className="text-sm font-semibold text-center">{getShortDayName(day)}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 px-3 pb-3">
              {mealTypes.map((mealType) => {
                const meal = getMealForSlot(day, mealType, weekOffset)
                return (
                  <div key={mealType} className="space-y-1">
                    <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide text-center">
                      {getMealTypeName(mealType)}
                    </div>
                    {meal?.recipe ? (
                      <MealCard recipe={meal.recipe} onRemove={() => handleRemoveMeal(meal.id)} compact />
                    ) : (
                      <Button
                        variant="outline"
                        className="w-full h-[70px] border-dashed border-muted-foreground/20 bg-transparent hover:bg-muted/50 hover:border-muted-foreground/40 transition-all"
                        onClick={() => handleAddMeal(day, mealType, weekOffset)}
                        aria-label={`Добавить блюдо на ${getMealTypeName(mealType)} в ${getShortDayName(day)}`}
                      >
                        <Plus className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    )}
                  </div>
                )
              })}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">📅 План питания на неделю</h1>
              <p className="text-muted-foreground">Планируйте ваши блюда на неделю вперёд</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" disabled>
                <span className="mr-2">✨</span>
                Сгенерировать меню AI
              </Button>
              {isAuthenticated && <AddRecipeDialog onRecipeAdded={loadMealPlans} />}
            </div>
          </div>
        </div>

        {showWelcome && !isAuthenticated && (
          <div className="mb-6 p-6 bg-secondary/50 rounded-2xl border border-border">
            <p className="text-lg mb-2">Добро пожаловать в Menu Planner!</p>
            <p className="text-muted-foreground">
              Войдите в аккаунт, чтобы сохранять рецепты и планировать меню на неделю.
            </p>
          </div>
        )}

        {showWelcome && isAuthenticated && (
          <div className="mb-6 p-6 bg-secondary/50 rounded-2xl border border-border">
            <p className="text-lg">Добро пожаловать! Создайте свой первый план меню.</p>
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => navigateWeek("prev")}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-lg font-semibold min-w-[200px] text-center">{formatWeekRange()}</div>
            <Button variant="outline" size="icon" onClick={() => navigateWeek("next")}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={goToCurrentWeek}>
              Сегодня
            </Button>
            <Button variant="outline" onClick={() => setShowNextWeek(!showNextWeek)}>
              {showNextWeek ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-2" />
                  Скрыть следующую неделю
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-2" />
                  Показать следующую неделю
                </>
              )}
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Загрузка плана меню...</div>
        ) : (
          <div className="space-y-6">
            <WeekRow weekOffset={0} />
            {showNextWeek && <WeekRow weekOffset={1} />}
          </div>
        )}

        <SelectRecipeDialog
          open={selectDialogOpen}
          onOpenChange={setSelectDialogOpen}
          onSelectRecipe={handleSelectRecipe}
        />
      </main>
    </div>
  )
}
