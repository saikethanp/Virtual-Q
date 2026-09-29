-- ==========================================
-- 0. UTILITY FUNCTIONS
-- ==========================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Safely generate sequential queue numbers per business per day
CREATE OR REPLACE FUNCTION public.generate_queue_number()
RETURNS TRIGGER AS $$
DECLARE
  next_num INT;
BEGIN
  -- Lock the business row to prevent race conditions during concurrent inserts
  PERFORM 1 FROM public.businesses WHERE id = NEW.business_id FOR UPDATE;
  
  SELECT COUNT(*) + 1 INTO next_num 
  FROM public.queue_entries 
  WHERE business_id = NEW.business_id 
  AND DATE(created_at) = DATE(timezone('utc'::text, now()));
  
  NEW.queue_number := 'Q' || LPAD(next_num::TEXT, 3, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ==========================================
-- 1. TABLES & CONSTRAINTS
-- ==========================================

-- PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  role TEXT DEFAULT 'customer',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- BUSINESSES
CREATE TABLE IF NOT EXISTS public.businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  location TEXT NOT NULL,
  address TEXT,
  image_url TEXT,
  queue_status TEXT DEFAULT 'Open',
  estimated_wait INTEGER DEFAULT 0 CHECK (estimated_wait >= 0),
  max_capacity INTEGER DEFAULT 50 CHECK (max_capacity > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- MENU ITEMS
CREATE TABLE IF NOT EXISTS public.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL CHECK (price >= 0),
  image_url TEXT,
  is_available BOOLEAN DEFAULT true,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ORDERS
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  total NUMERIC NOT NULL CHECK (total >= 0),
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ORDER ITEMS
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  price NUMERIC NOT NULL CHECK (price >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- QUEUE ENTRIES
CREATE TABLE IF NOT EXISTS public.queue_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  queue_number TEXT NOT NULL,
  status TEXT DEFAULT 'Waiting',
  estimated_wait INTEGER CHECK (estimated_wait >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (business_id, queue_number)
);

-- ==========================================
-- 2. INDEXES
-- ==========================================

-- Partial unique index: Prevent a customer from having multiple active queue entries for the same business
CREATE UNIQUE INDEX idx_unique_active_queue 
ON public.queue_entries (user_id, business_id) 
WHERE status IN ('Waiting', 'Serving');

-- Foreign key lookups index optimization
CREATE INDEX idx_menu_items_business_id ON public.menu_items(business_id);
CREATE INDEX idx_orders_user_id ON public.orders(user_id);
CREATE INDEX idx_orders_business_id ON public.orders(business_id);
CREATE INDEX idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX idx_queue_entries_business_id ON public.queue_entries(business_id);
CREATE INDEX idx_queue_entries_user_id ON public.queue_entries(user_id);


-- ==========================================
-- 3. TRIGGERS
-- ==========================================

-- Updated_at triggers
CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER set_businesses_updated_at BEFORE UPDATE ON public.businesses FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER set_menu_items_updated_at BEFORE UPDATE ON public.menu_items FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER set_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER set_queue_entries_updated_at BEFORE UPDATE ON public.queue_entries FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- Queue number generation trigger (fires before insert if queue_number is not explicitly provided)
CREATE TRIGGER trigger_generate_queue_number
BEFORE INSERT ON public.queue_entries
FOR EACH ROW
WHEN (NEW.queue_number IS NULL)
EXECUTE PROCEDURE generate_queue_number();


-- ==========================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ==========================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queue_entries ENABLE ROW LEVEL SECURITY;


-- PROFILES
CREATE POLICY "Users can view their own profile" 
ON public.profiles FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE USING (auth.uid() = user_id);


-- BUSINESSES
CREATE POLICY "Public can view businesses" 
ON public.businesses FOR SELECT USING (true);

CREATE POLICY "Owners can insert their business" 
ON public.businesses FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their business" 
ON public.businesses FOR UPDATE USING (auth.uid() = owner_id);


-- MENU ITEMS
CREATE POLICY "Public can view available menu items" 
ON public.menu_items FOR SELECT USING (true);

CREATE POLICY "Owners can manage menu items" 
ON public.menu_items FOR ALL USING (
  EXISTS (SELECT 1 FROM public.businesses WHERE id = menu_items.business_id AND owner_id = auth.uid())
);


-- ORDERS
CREATE POLICY "Users can view their own orders" 
ON public.orders FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own orders" 
ON public.orders FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can view/manage orders for their business" 
ON public.orders FOR ALL USING (
  EXISTS (SELECT 1 FROM public.businesses WHERE id = orders.business_id AND owner_id = auth.uid())
);


-- ORDER ITEMS
CREATE POLICY "Users can view their own order items" 
ON public.order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.orders WHERE id = order_items.order_id AND user_id = auth.uid())
);

CREATE POLICY "Users can insert order items into their orders" 
ON public.order_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.orders WHERE id = order_items.order_id AND user_id = auth.uid())
);

CREATE POLICY "Owners can view/manage order items for their business" 
ON public.order_items FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.orders 
    JOIN public.businesses ON orders.business_id = businesses.id
    WHERE orders.id = order_items.order_id AND businesses.owner_id = auth.uid()
  )
);


-- QUEUE ENTRIES
CREATE POLICY "Users can view their own queue entries" 
ON public.queue_entries FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own queue entries" 
ON public.queue_entries FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can view/manage queue entries for their business" 
ON public.queue_entries FOR ALL USING (
  EXISTS (SELECT 1 FROM public.businesses WHERE id = queue_entries.business_id AND owner_id = auth.uid())
);


-- Create business-images storage bucket
insert into storage.buckets (id, name, public)
values ('business-images', 'business-images', true)
on conflict (id) do nothing;

-- Policy: Public Read Access
create policy "Public Read Access" on storage.objects for select using ( bucket_id = 'business-images' );

-- Policy: Owner Insert Access
create policy "Owner Insert Access" on storage.objects for insert with check ( bucket_id = 'business-images' and auth.uid()::text = (storage.foldername(name))[1] );

-- Policy: Owner Update Access
create policy "Owner Update Access" on storage.objects for update using ( bucket_id = 'business-images' and auth.uid()::text = (storage.foldername(name))[1] );

-- Policy: Owner Delete Access
create policy "Owner Delete Access" on storage.objects for delete using ( bucket_id = 'business-images' and auth.uid()::text = (storage.foldername(name))[1] );

