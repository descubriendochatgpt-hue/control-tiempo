import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Cliente de Supabase con la clave SECRETA: se salta todos los permisos.
 * Solo se usa en el servidor y solo para tareas de administración
 * (dar de alta usuarios, bloquearlos…). Nunca llega al navegador.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
