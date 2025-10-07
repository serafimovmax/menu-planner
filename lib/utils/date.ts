export function getWeekStart(date: Date = new Date()): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Adjust when day is Sunday
  return new Date(d.setDate(diff))
}

export function formatWeekStart(date: Date): string {
  return date.toISOString().split("T")[0]
}

export function getDayName(dayIndex: number): string {
  const days = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"]
  return days[dayIndex]
}

export function getShortDayName(dayIndex: number): string {
  const days = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]
  return days[dayIndex]
}

export function getMealTypeName(mealType: "breakfast" | "lunch" | "dinner"): string {
  const names = {
    breakfast: "Завтрак",
    lunch: "Обед",
    dinner: "Ужин",
  }
  return names[mealType]
}
