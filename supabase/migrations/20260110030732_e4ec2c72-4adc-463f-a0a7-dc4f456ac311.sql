-- Add rules column to courts table for court managers to set booking rules
ALTER TABLE public.courts 
ADD COLUMN rules text;