-- Enable realtime for court_availability table to allow live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.court_availability;