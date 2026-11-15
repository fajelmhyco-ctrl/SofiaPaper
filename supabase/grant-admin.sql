-- Create this email/password user in Authentication > Users first.
-- Replace the email below, run this SQL, then sign out and back into admin.html.
do $$
declare
  admin_email text := 'REPLACE_WITH_YOUR_ADMIN_EMAIL';
begin
  if admin_email = 'REPLACE_WITH_YOUR_ADMIN_EMAIL' then
    raise exception 'Replace REPLACE_WITH_YOUR_ADMIN_EMAIL with your admin account email';
  end if;
  update auth.users
    set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
    where lower(email) = lower(admin_email);
  if not found then raise exception 'Create the admin user in Authentication > Users first'; end if;
end $$;
