-- ============================================
-- CREATE INVENTORY TABLES IN SUPABASE
-- Run this in Supabase SQL Editor
-- ============================================

-- Create chemicals table
CREATE TABLE IF NOT EXISTS chemicals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  bottle_size TEXT,
  cost_per_bottle DECIMAL(10,2),
  threshold INTEGER DEFAULT 0,
  current_stock INTEGER DEFAULT 0,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create materials table
CREATE TABLE IF NOT EXISTS materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  subtype TEXT,
  quantity INTEGER DEFAULT 0,
  cost_per_item DECIMAL(10,2),
  notes TEXT,
  low_threshold INTEGER DEFAULT 0,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create tools table
CREATE TABLE IF NOT EXISTS tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  warranty TEXT,
  purchase_date DATE,
  price DECIMAL(10,2),
  life_expectancy TEXT,
  notes TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create usage_history table
CREATE TABLE IF NOT EXISTS usage_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  chemical_id UUID REFERENCES chemicals(id) ON DELETE SET NULL,
  material_id UUID REFERENCES materials(id) ON DELETE SET NULL,
  tool_id UUID REFERENCES tools(id) ON DELETE SET NULL,
  service_name TEXT,
  date TIMESTAMPTZ DEFAULT NOW(),
  remaining_stock INTEGER,
  amount_used TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS (Row Level Security)
ALTER TABLE chemicals ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chemicals
CREATE POLICY "Users can view their own chemicals" ON chemicals
  FOR SELECT USING (auth.uid() = user_id);
  
CREATE POLICY "Users can insert their own chemicals" ON chemicals
  FOR INSERT WITH CHECK (auth.uid() = user_id);
  
CREATE POLICY "Users can update their own chemicals" ON chemicals
  FOR UPDATE USING (auth.uid() = user_id);
  
CREATE POLICY "Users can delete their own chemicals" ON chemicals
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for materials
CREATE POLICY "Users can view their own materials" ON materials
  FOR SELECT USING (auth.uid() = user_id);
  
CREATE POLICY "Users can insert their own materials" ON materials
  FOR INSERT WITH CHECK (auth.uid() = user_id);
  
CREATE POLICY "Users can update their own materials" ON materials
  FOR UPDATE USING (auth.uid() = user_id);
  
CREATE POLICY "Users can delete their own materials" ON materials
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for tools
CREATE POLICY "Users can view their own tools" ON tools
  FOR SELECT USING (auth.uid() = user_id);
  
CREATE POLICY "Users can insert their own tools" ON tools
  FOR INSERT WITH CHECK (auth.uid() = user_id);
  
CREATE POLICY "Users can update their own tools" ON tools
  FOR UPDATE USING (auth.uid() = user_id);
  
CREATE POLICY "Users can delete their own tools" ON tools
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for usage_history
CREATE POLICY "Users can view their own usage history" ON usage_history
  FOR SELECT USING (auth.uid() = user_id);
  
CREATE POLICY "Users can insert their own usage history" ON usage_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);
  
CREATE POLICY "Users can delete their own usage history" ON usage_history
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chemicals_user_id ON chemicals(user_id);
CREATE INDEX IF NOT EXISTS idx_materials_user_id ON materials(user_id);
CREATE INDEX IF NOT EXISTS idx_tools_user_id ON tools(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_history_user_id ON usage_history(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_history_date ON usage_history(date DESC);

-- ============================================
-- DONE! Tables created successfully!
-- ============================================
-- Next step: Run the migration to move data from localforage to Supabase
-- ============================================
