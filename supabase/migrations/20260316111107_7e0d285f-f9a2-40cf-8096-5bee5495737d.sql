
-- 1. Re-create the trigger on auth.users (if missing)
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 2. Seed user_roles for existing users who have no role (default to 'player')
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, COALESCE(
  NULLIF(TRIM(u.raw_user_meta_data->>'role'), ''),
  'player'
)::public.app_role
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles ur WHERE ur.user_id = u.id
);

-- 3. Seed profiles for existing users who have no profile
INSERT INTO public.profiles (user_id, full_name, avatar_url)
SELECT u.id,
  COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name'),
  COALESCE(u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'picture')
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.user_id = u.id
);
