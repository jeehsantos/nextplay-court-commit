-- Add photo_urls column to courts table for multiple images (max 4)
ALTER TABLE courts ADD COLUMN IF NOT EXISTS photo_urls text[] DEFAULT '{}';

-- Migrate existing photo_url to photo_urls array
UPDATE courts 
SET photo_urls = ARRAY[photo_url] 
WHERE photo_url IS NOT NULL AND photo_url != '' AND (photo_urls IS NULL OR array_length(photo_urls, 1) IS NULL);
