import { NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"

interface GeneratedRecipe {
  title: string
  description?: string
  ingredients: Array<{ name: string; amount: string; unit: string }>
  steps?: string[]
}

function normalizeRecipeName(name: string): string {
  return name.toLowerCase().trim()
}

function scaleIngredient(amount: string, scale: number): string {
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

async function checkCachedRecipe(dishName: string): Promise<GeneratedRecipe | null> {
  try {
    const supabase = await createClient()
    const normalized = normalizeRecipeName(dishName)

    const { data, error } = await supabase.from("cached_recipes").select("*").eq("dish_name", normalized).single()

    if (error || !data) return null

    return {
      title: data.title,
      description: data.description,
      ingredients: data.ingredients,
      steps: data.steps,
    }
  } catch (error) {
    console.error("[v0] Error checking cached recipe:", error)
    return null
  }
}

// async function saveCachedRecipe(dishName: string, recipe: GeneratedRecipe, baseServings: number): Promise<void> {
//   try {
//     const supabase = await createClient()
//     const normalized = normalizeRecipeName(dishName)

//     await supabase.from("cached_recipes").insert({
//       dish_name: normalized,
//       title: recipe.title,
//       description: recipe.description,
//       ingredients: recipe.ingredients,
//       steps: recipe.steps || [],
//       base_servings: baseServings,
//     })
//   } catch (error) {
//     console.error("[v0] Error saving cached recipe:", error)
//   }
// }

async function saveCachedRecipe(dishName: string, recipe: GeneratedRecipe, baseServings: number): Promise<void> {
  try {
    const supabase = createServiceClient()
    const normalized = normalizeRecipeName(dishName)

    console.log("[v0] Saving recipe to cache:", { dishName: normalized, title: recipe.title })

    const { error } = await supabase
      .from("cached_recipes")
      .insert({
        dish_name: normalized,
        title: recipe.title,
        description: recipe.description,
        ingredients: recipe.ingredients,
        steps: recipe.steps || [],
        base_servings: baseServings,
      })

    if (error) {
      console.error("[v0] Supabase insert error:", error)
    } else {
      console.log("[v0] Recipe cached successfully:", recipe.title)
    }
  } catch (error) {
    console.error("[v0] Error saving cached recipe:", error)
  }
}


async function generateRecipeWithAI(dishName: string, servings: number): Promise<GeneratedRecipe> {
  const apiUrl = process.env.AI_API_URL || "https://api.deepseek.com/chat/completions"
  const apiKey = process.env.AI_API_KEY
  const model = process.env.AI_MODEL || "deepseek-chat"

  if (!apiKey) {
    throw new Error("AI_API_KEY не настроен в переменных окружения")
  }

  console.log("[v0] === AI API Request Debug Info ===")
  console.log("[v0] API URL:", apiUrl)
  console.log("[v0] Model:", model)
  console.log("[v0] API Key present:", !!apiKey)
  console.log("[v0] API Key length:", apiKey?.length)
  console.log("[v0] API Key prefix:", apiKey?.substring(0, 8) + "...")
  console.log("[v0] Dish name:", dishName)
  console.log("[v0] Servings:", servings)

  const prompt = `Ты — шеф-повар. Создай классический рецепт блюда "${dishName}" на ${servings} персон.
Формат ответа — строго JSON без дополнительного текста:
{
  "title": "Название блюда",
  "description": "Краткое описание",
  "ingredients": [
    {"name": "Ингредиент", "amount": "количество", "unit": "единица измерения"}
  ],
  "steps": ["Шаг 1", "Шаг 2"]
}`

  const requestBody = {
    model,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.7,
    max_tokens: 1000,
    stream: false,
  }

  console.log("[v0] Request body:", JSON.stringify(requestBody, null, 2))

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    })

    console.log("[v0] Response status:", response.status)
    console.log("[v0] Response headers:", Object.fromEntries(response.headers.entries()))

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[v0] === AI API Error ===")
      console.error("[v0] Status:", response.status)
      console.error("[v0] Response body:", errorText)
      console.error("[v0] === Troubleshooting ===")
      console.error("[v0] 1. Verify API key is correct: sk-97e8c70318944cf3bf7516e10cf89bfa")
      console.error("[v0] 2. Check if API key is active in DeepSeek dashboard")
      console.error("[v0] 3. Verify environment variable AI_API_KEY is set correctly")
      console.error("[v0] 4. Try regenerating the API key in DeepSeek dashboard")
      throw new Error(`AI API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    console.log("[v0] AI API response received successfully")
    console.log("[v0] Response data keys:", Object.keys(data))

    const content = data.choices?.[0]?.message?.content || ""

    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error("[v0] No JSON found in AI response:", content.substring(0, 200))
      throw new Error("Не удалось извлечь JSON из ответа AI")
    }

    const recipe = JSON.parse(jsonMatch[0]) as GeneratedRecipe

    if (!recipe.title || !Array.isArray(recipe.ingredients)) {
      console.error("[v0] Invalid recipe structure:", recipe)
      throw new Error("Некорректный формат рецепта от AI")
    }

    console.log("[v0] Recipe generated successfully:", recipe.title)
    return recipe
  } catch (error) {
    console.error("[v0] AI generation error:", error)
    throw error
  }
}

export async function POST(request: Request) {
  try {
    const { dishName, servings = 2 } = await request.json()

    if (!dishName) {
      return NextResponse.json({ error: "Название блюда обязательно" }, { status: 400 })
    }

    console.log("[v0] Generate recipe request:", { dishName, servings })

    const cachedRecipe = await checkCachedRecipe(dishName)

    let recipe: GeneratedRecipe
    let baseServings = servings

    if (cachedRecipe) {
      console.log("[v0] Using cached recipe for:", dishName)
      recipe = cachedRecipe
      baseServings = servings
    } else {
      try {
        recipe = await generateRecipeWithAI(dishName, servings)
        await saveCachedRecipe(dishName, recipe, servings)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Неизвестная ошибка"
        console.error("[v0] AI generation failed:", errorMessage)
        return NextResponse.json(
          {
            success: false,
            title: dishName,
            ingredients: [],
            steps: [`Не удалось сгенерировать рецепт. Ошибка: ${errorMessage}`],
            message: "Ошибка генерации рецепта через AI",
          },
          { status: 200 },
        )
      }
    }

    const scale = servings / baseServings
    const scaledIngredients = recipe.ingredients.map((ing) => ({
      ...ing,
      amount: scaleIngredient(ing.amount, scale),
    }))

    return NextResponse.json({
  success: true,
  cached: !!cachedRecipe, // если у тебя есть логика кеша
  recipe: {
    title: recipe.title,
    description: recipe.description,
    ingredients: recipe.ingredients,
    steps: recipe.steps || [],
    category: recipe.category || null,
    servings: servings || 2,
  },
})
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Неизвестная ошибка"
    console.error("[v0] Generate recipe error:", errorMessage, error)
    return NextResponse.json({ error: `Ошибка генерации рецепта: ${errorMessage}` }, { status: 500 })
  }
}
