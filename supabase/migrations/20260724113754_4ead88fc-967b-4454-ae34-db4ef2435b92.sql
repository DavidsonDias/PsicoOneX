-- Ensure existing profiles have a stable username for username-based login.
-- Uses the e-mail prefix when no username was explicitly configured.
UPDATE public.profiles p
SET username = candidate.username
FROM (
  SELECT
    p_inner.id,
    CASE
      WHEN COUNT(*) OVER (PARTITION BY lower(regexp_replace(split_part(u.email, '@', 1), '[^a-zA-Z0-9._-]+', '-', 'g'))) = 1
        THEN lower(regexp_replace(split_part(u.email, '@', 1), '[^a-zA-Z0-9._-]+', '-', 'g'))
      ELSE lower(regexp_replace(split_part(u.email, '@', 1), '[^a-zA-Z0-9._-]+', '-', 'g')) || '-' || left(p_inner.id::text, 8)
    END AS username
  FROM public.profiles p_inner
  JOIN auth.users u ON u.id = p_inner.id
  WHERE p_inner.username IS NULL OR trim(p_inner.username) = ''
) AS candidate
WHERE p.id = candidate.id;

-- Keep the login resolver narrow: it resolves only explicit usernames.
CREATE OR REPLACE FUNCTION public.get_email_by_username(_username text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.email::text
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE lower(trim(p.username)) = lower(trim(_username))
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.get_email_by_username(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_email_by_username(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_email_by_username(text) TO authenticated;

-- New accounts also receive a default username based on their e-mail prefix.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_username text;
  final_username text;
BEGIN
  base_username := lower(regexp_replace(split_part(NEW.email, '@', 1), '[^a-zA-Z0-9._-]+', '-', 'g'));

  IF base_username IS NULL OR trim(base_username) = '' THEN
    base_username := 'usuario';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.profiles WHERE lower(username) = base_username
  ) THEN
    final_username := base_username || '-' || left(NEW.id::text, 8);
  ELSE
    final_username := base_username;
  END IF;

  INSERT INTO public.profiles (id, full_name, username, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    final_username,
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE
  SET username = COALESCE(NULLIF(trim(public.profiles.username), ''), EXCLUDED.username),
      full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
      avatar_url = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url);

  RETURN NEW;
END;
$$;