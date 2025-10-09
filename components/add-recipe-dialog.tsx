"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Plus, Trash2 } from "lucide-react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { Recipe, Ingredient, RecipeStep } from "@/lib/types"

interface AddRecipeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onRecipeAdded?: (recipe: Recipe) => void
}

export default function AddRecipeDialog({ open, onOpenChange, onRecipeAdded }: AddRecipeDialogProps) {
  const supabase = createClientComponentClient()

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [ingredients, setIngredients] = useState<Ingredient[]>([{ name: "", amount: "", category: "" }])
  const [steps, setSteps] = useState<RecipeStep[]>([{ text: "" }])
  const [loading, setLoading] = useState(false)

  const resetForm = () => {
    setName("")
    setDescription("")
    setIngredients([{ name: "", amount: "", category: "" }])
    setSteps([{ text: "" }])
  }

  const handleAddIngredient = () => {
    setIngredients([...ingredients, { name: "", amount: "", category: "" }])
  }

  const handleRemoveIngredient = (index: number) => {
    const updated = ingredients.filter((_, i) => i !== index)
    setIngredients(updated)
  }

  const handleAddStep = () => {
    setSteps([...steps, { text: "" }])
  }

  const handleRemoveStep = (index: number) => {
    const updated = steps.filter((_, i) => i !== index)
    setSteps(updated)
  }

  const handleSubmit = async () => {
    if (!name.trim()) return alert("Введите название рецепта")
    setLoading(true)

    const { data, error } = await supabase
      .from("recipes")
      .insert([
        {
          name,
          description,
          ingredients,
          steps
        }
      ])
      .select()
      .single()

    setLoading(false)

    if (error) {
      console.error(error)
      alert("Ошибка при сохранении рецепта")
      return
    }

    if (data && onRecipeAdded) {
      onRecipeAdded(data)
    }

    resetForm()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Добавить рецепт</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Название</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Например: Борщ" />
          </div>

          <div>
            <Label>Описание (необязательно)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Краткое описание рецепта"
            />
          </div>

          <div>
            <Label>Ингредиенты</Label>
            <div className="space-y-2">
              {ingredients.map((ingredient, index) => (
                <div key={index} className="grid grid-cols-3 gap-2">
                  <Input
                    placeholder="Название"
                    value={ingredient.name}
                    onChange={(e) => {
                      const updated = [...ingredients]
                      updated[index].name = e.target.value
                      setIngredients(updated)
                    }}
                  />
                  <Input
                    placeholder="Количество"
                    value={ingredient.amount}
                    onChange={(e) => {
                      const updated = [...ingredients]
                      updated[index].amount = e.target.value
                      setIngredients(updated)
                    }}
                  />
                  <Input
                    placeholder="Категория (овощи, мясо...)"
                    value={ingredient.category}
                    onChange={(e) => {
                      const updated = [...ingredients]
                      updated[index].category = e.target.value
                      setIngredients(updated)
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveIngredient(index)}
                    className="col-span-3 justify-self-end text-red-500"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              ))}
              <Button onClick={handleAddIngredient} variant="outline" size="sm">
                <Plus size={14} className="mr-2" /> Добавить ингредиент
              </Button>
            </div>
          </div>

          <div>
            <Label>Шаги приготовления</Label>
            <div className="space-y-2">
              {steps.map((step, index) => (
                <div key={index} className="flex gap-2 items-start">
                  <Textarea
                    placeholder={`Шаг ${index + 1}`}
                    value={step.text}
                    onChange={(e) => {
                      const updated = [...steps]
                      updated[index].text = e.target.value
                      setSteps(updated)
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveStep(index)}
                    className="text-red-500 mt-1"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              ))}
              <Button onClick={handleAddStep} variant="outline" size="sm">
                <Plus size={14} className="mr-2" /> Добавить шаг
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Сохранение..." : "Сохранить"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
