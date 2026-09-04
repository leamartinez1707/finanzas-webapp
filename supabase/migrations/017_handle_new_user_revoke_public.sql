-- El revoke de 016 no alcanzó del todo: handle_new_user tenía EXECUTE
-- otorgado a PUBLIC (el grant por defecto de Postgres al crear una
-- función sin especificar), y anon/authenticated heredan de PUBLIC.
-- Hay que revocar de PUBLIC explícitamente, no solo de los roles —
-- mismo problema encontrado (y corregido) para transferir_a_ahorro
-- en 014_ahorros_bucket.sql.
revoke execute on function public.handle_new_user() from public;
