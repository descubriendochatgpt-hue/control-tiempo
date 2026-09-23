import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Cliente de Supabase para usar en el servidor (páginas y acciones).
 * Actúa "en nombre" del usuario que ha iniciado sesión, así que la base
 * de datos le aplica sus permisos (admin ve todo, empleado solo lo suyo).
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Desde una página no se pueden escribir cookies; no pasa nada,
            // el proxy (src/proxy.ts) ya se encarga de renovar la sesión.
          }
        },
      },
    },
  );
}
