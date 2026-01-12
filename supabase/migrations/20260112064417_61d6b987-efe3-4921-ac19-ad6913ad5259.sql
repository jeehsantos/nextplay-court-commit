-- 1. Add admin role for user idreamzjsm@gmail.com
INSERT INTO user_roles (user_id, role)
VALUES ('f70ccf34-633d-4325-84eb-ee6629031b64', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- 2. Add photo_url column to equipment_inventory for equipment photos
ALTER TABLE equipment_inventory ADD COLUMN IF NOT EXISTS photo_url text;