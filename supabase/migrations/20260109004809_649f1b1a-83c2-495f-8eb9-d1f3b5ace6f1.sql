-- Create enum for ground/surface type
CREATE TYPE public.ground_type AS ENUM ('grass', 'turf', 'sand', 'hard', 'clay', 'other');

-- Create enum for payment timing
CREATE TYPE public.payment_timing AS ENUM ('at_booking', 'before_session');

-- Create enum for booking payment type
CREATE TYPE public.booking_payment_type AS ENUM ('single', 'split');

-- Add new columns to courts table
ALTER TABLE public.courts 
ADD COLUMN IF NOT EXISTS ground_type public.ground_type DEFAULT 'turf',
ADD COLUMN IF NOT EXISTS payment_timing public.payment_timing DEFAULT 'at_booking',
ADD COLUMN IF NOT EXISTS payment_hours_before integer DEFAULT 24;

-- Add new columns to venues for better NZ location support
ALTER TABLE public.venues
ADD COLUMN IF NOT EXISTS country text DEFAULT 'New Zealand',
ADD COLUMN IF NOT EXISTS suburb text;

-- Add payment_type to sessions table
ALTER TABLE public.sessions
ADD COLUMN IF NOT EXISTS payment_type public.booking_payment_type DEFAULT 'single';

-- Create storage bucket for court photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('court-photos', 'court-photos', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for court photos
CREATE POLICY "Anyone can view court photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'court-photos');

CREATE POLICY "Court managers can upload court photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'court-photos' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Court managers can update their court photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'court-photos' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Court managers can delete their court photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'court-photos' 
  AND auth.role() = 'authenticated'
);