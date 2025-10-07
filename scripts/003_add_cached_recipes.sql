-- Add cached_recipes table for AI-generated recipe caching
CREATE TABLE IF NOT EXISTS cached_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dish_name TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  ingredients JSONB NOT NULL DEFAULT '[]',
  steps JSONB NOT NULL DEFAULT '[]',
  base_servings INTEGER NOT NULL DEFAULT 2,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_cached_recipes_dish_name ON cached_recipes(dish_name);

-- Enable RLS
ALTER TABLE cached_recipes ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read cached recipes (they're public)
CREATE POLICY "Anyone can view cached recipes"
  ON cached_recipes FOR SELECT
  USING (true);

-- Only allow insert from service role (API will handle this)
CREATE POLICY "Service role can insert cached recipes"
  ON cached_recipes FOR INSERT
  WITH CHECK (true);
