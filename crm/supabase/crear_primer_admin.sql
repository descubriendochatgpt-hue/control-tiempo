-- Convierte en ADMIN al primer usuario (solo hace falta una vez).
-- 1) Crea tu usuario en Supabase → Authentication → Users → Add user
--    (marca "Auto Confirm User").
-- 2) Cambia el email de abajo por el tuyo y ejecuta esto en el SQL Editor.
-- A partir de ahí, el resto de usuarios se dan de alta desde el propio CRM.

update public.perfiles set rol = 'admin', nombre = 'Tu nombre'
where email = 'tu-email@vertian.es';

update auth.users
set raw_app_meta_data = raw_app_meta_data || '{"rol": "admin"}'
where email = 'tu-email@vertian.es';
