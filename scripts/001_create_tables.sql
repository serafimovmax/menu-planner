-- Create recipes table
CREATE TABLE IF NOT EXISTS recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  ingredients JSONB NOT NULL DEFAULT '[]',
  servings INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create meal_plans table
CREATE TABLE IF NOT EXISTS meal_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner')),
  week_start DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_meal_plans_week ON meal_plans(week_start);
CREATE INDEX IF NOT EXISTS idx_meal_plans_day ON meal_plans(day_of_week);
CREATE INDEX IF NOT EXISTS idx_recipes_category ON recipes(category);

-- Enable Row Level Security (RLS)
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;

-- Create policies for recipes (public access for simplicity)
CREATE POLICY "Allow public to view recipes" ON recipes FOR SELECT USING (true);
CREATE POLICY "Allow public to insert recipes" ON recipes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public to update recipes" ON recipes FOR UPDATE USING (true);
CREATE POLICY "Allow public to delete recipes" ON recipes FOR DELETE USING (true);

-- Create policies for meal_plans (public access for simplicity)
CREATE POLICY "Allow public to view meal plans" ON meal_plans FOR SELECT USING (true);
CREATE POLICY "Allow public to insert meal plans" ON meal_plans FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public to update meal plans" ON meal_plans FOR UPDATE USING (true);
CREATE POLICY "Allow public to delete meal plans" ON meal_plans FOR DELETE USING (true);
