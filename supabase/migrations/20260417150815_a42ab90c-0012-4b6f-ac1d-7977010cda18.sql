-- Embeddable Widget: API keys + analytics

CREATE TABLE public.venue_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  name text NOT NULL,
  key_hash text NOT NULL UNIQUE,
  key_prefix text NOT NULL,
  allowed_origins text[] NOT NULL DEFAULT '{}',
  theme jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  last_used_at timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_venue_api_keys_venue ON public.venue_api_keys(venue_id);
CREATE INDEX idx_venue_api_keys_hash ON public.venue_api_keys(key_hash);

ALTER TABLE public.venue_api_keys ENABLE ROW LEVEL SECURITY;

-- Owners can manage their venue's API keys
CREATE POLICY "Venue owners manage api keys"
ON public.venue_api_keys
FOR ALL
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.venues v WHERE v.id = venue_api_keys.venue_id AND v.owner_id = auth.uid())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.venues v WHERE v.id = venue_api_keys.venue_id AND v.owner_id = auth.uid())
);

-- Staff can view (not manage) keys for their assigned venues
CREATE POLICY "Staff can view venue api keys"
ON public.venue_api_keys
FOR SELECT
TO authenticated
USING (
  venue_id IN (SELECT public.get_staff_venue_ids(auth.uid()))
);

CREATE TRIGGER trg_venue_api_keys_updated_at
BEFORE UPDATE ON public.venue_api_keys
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Widget analytics (event log)
CREATE TABLE public.widget_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  api_key_id uuid REFERENCES public.venue_api_keys(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  event_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  origin text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_widget_analytics_venue_created ON public.widget_analytics(venue_id, created_at DESC);
CREATE INDEX idx_widget_analytics_event ON public.widget_analytics(event_type);

ALTER TABLE public.widget_analytics ENABLE ROW LEVEL SECURITY;

-- Owners view analytics for their venues
CREATE POLICY "Venue owners view widget analytics"
ON public.widget_analytics
FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.venues v WHERE v.id = widget_analytics.venue_id AND v.owner_id = auth.uid())
);

-- Staff view analytics for assigned venues
CREATE POLICY "Staff view widget analytics"
ON public.widget_analytics
FOR SELECT
TO authenticated
USING (
  venue_id IN (SELECT public.get_staff_venue_ids(auth.uid()))
);

-- No client INSERT policy: events are written by edge function (service role only).