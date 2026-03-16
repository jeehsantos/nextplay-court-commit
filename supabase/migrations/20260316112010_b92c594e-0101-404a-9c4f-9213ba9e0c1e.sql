-- Add unique constraint on user_id so UPSERT works correctly in set-initial-role
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_unique UNIQUE (user_id);