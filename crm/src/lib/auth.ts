import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Perfil } from "@/lib/tipos";

/**
 * Devuelve el perfil (nombre, rol…) del usuario que ha iniciado sesión.
 * Si no hay sesión, o el usuario está dado de baja, lo manda a /login.
 * `cache` hace que en una misma carga de página solo se consulte una vez.
 */
export const getUsuarioActual = cache(async (): Promise<Perfil> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/login");

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("id, email, nombre, rol, activo, created_at")
    .eq("id", userId)
    .single<Perfil>();

  if (!perfil || !perfil.activo) {
    await supabase.auth.signOut();
    redirect("/login?error=inactivo");
  }
  return perfil;
});

/** Igual que getUsuarioActual, pero solo deja pasar a administradores. */
export async function requireAdmin(): Promise<Perfil> {
  const usuario = await getUsuarioActual();
  if (usuario.rol !== "admin") redirect("/");
  return usuario;
}
