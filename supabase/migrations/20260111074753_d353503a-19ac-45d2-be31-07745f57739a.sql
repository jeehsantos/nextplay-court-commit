
-- =============================================
-- STEP 1: Add INSERT policy for authenticated users to book courts
-- =============================================
CREATE POLICY "Authenticated users can insert bookings"
ON public.court_availability
FOR INSERT
TO authenticated
WITH CHECK (
  is_booked = true 
  AND booked_by_user_id = auth.uid()
);

-- =============================================
-- STEP 2: Equipment Inventory Table
-- =============================================
CREATE TABLE public.equipment_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  quantity_available INTEGER NOT NULL DEFAULT 1,
  price_per_unit NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.equipment_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Equipment viewable by everyone"
ON public.equipment_inventory
FOR SELECT
USING (is_active = true);

CREATE POLICY "Venue owners can manage equipment"
ON public.equipment_inventory
FOR ALL
USING (EXISTS (
  SELECT 1 FROM venues v WHERE v.id = equipment_inventory.venue_id AND v.owner_id = auth.uid()
));

CREATE TRIGGER update_equipment_inventory_updated_at
BEFORE UPDATE ON public.equipment_inventory
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- STEP 3: Booking Equipment Junction Table
-- =============================================
CREATE TABLE public.booking_equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.court_availability(id) ON DELETE CASCADE,
  equipment_id UUID NOT NULL REFERENCES public.equipment_inventory(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  price_at_booking NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(booking_id, equipment_id)
);

ALTER TABLE public.booking_equipment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their booking equipment"
ON public.booking_equipment
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM court_availability ca 
  WHERE ca.id = booking_equipment.booking_id 
  AND ca.booked_by_user_id = auth.uid()
));

CREATE POLICY "Users can add equipment to their bookings"
ON public.booking_equipment
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM court_availability ca 
  WHERE ca.id = booking_equipment.booking_id 
  AND ca.booked_by_user_id = auth.uid()
));

CREATE POLICY "Users can update their booking equipment"
ON public.booking_equipment
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM court_availability ca 
  WHERE ca.id = booking_equipment.booking_id 
  AND ca.booked_by_user_id = auth.uid()
));

CREATE POLICY "Users can delete their booking equipment"
ON public.booking_equipment
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM court_availability ca 
  WHERE ca.id = booking_equipment.booking_id 
  AND ca.booked_by_user_id = auth.uid()
));

-- =============================================
-- STEP 4: Sport Categories Table
-- =============================================
CREATE TABLE public.sport_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  icon TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sport_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sport categories viewable by everyone"
ON public.sport_categories
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage sport categories"
ON public.sport_categories
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_sport_categories_updated_at
BEFORE UPDATE ON public.sport_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.sport_categories (name, display_name, sort_order) VALUES
  ('futsal', 'Futsal', 1),
  ('tennis', 'Tennis', 2),
  ('volleyball', 'Volleyball', 3),
  ('basketball', 'Basketball', 4),
  ('turf_hockey', 'Turf Hockey', 5),
  ('badminton', 'Badminton', 6),
  ('other', 'Other', 99);

-- =============================================
-- STEP 5: Surface Types Table
-- =============================================
CREATE TABLE public.surface_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.surface_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Surface types viewable by everyone"
ON public.surface_types
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage surface types"
ON public.surface_types
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_surface_types_updated_at
BEFORE UPDATE ON public.surface_types
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.surface_types (name, display_name, sort_order) VALUES
  ('grass', 'Grass', 1),
  ('turf', 'Turf', 2),
  ('sand', 'Sand', 3),
  ('hard', 'Hard Court', 4),
  ('clay', 'Clay', 5),
  ('other', 'Other', 99);
