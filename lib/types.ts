export interface Recipe {
  id: string
  name: string
  category: string
  description: string | null
  ingredients: Ingredient[]
  steps: RecipeStep[]
  servings: number
  user_id: string
  created_at: string
  updated_at: string
}

export interface Ingredient {
  name: string
  amount: string
  unit: string
}

export interface MealPlan {
  id: string
  recipe_id: string
  day_of_week: number
  meal_type: "breakfast" | "lunch" | "dinner"
  week_start: string
  user_id: string
  created_at: string
  recipe?: Recipe
}

export interface RecipeStep {
  id?: string
  text: string
}

export type MealType = "breakfast" | "lunch" | "dinner"
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6

export interface Profile {
  id: string
  username: string | null
  created_at: string
}
