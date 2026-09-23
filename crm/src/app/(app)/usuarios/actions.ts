"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Rol } from "@/lib/tipos";

export type EstadoFormulario = { error?: string; ok?: string };

const ROLES: Rol[] = ["admin", "empleado"];

/** Da de alta un empleado nuevo con una contraseña inicial. */
export async function crearUsuario(
  _prev: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  await requireAdmin(); // cada acción comprueba el permiso por sí misma

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const nombre = String(formData.get("nombre") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const rol = String(formData.get("rol") ?? "empleado") as Rol;

  if (!email || !nombre) return { error: "Nombre y email son obligatorios." };
  if (password.length < 8)
    return { error: "La contraseña debe tener al menos 8 caracteres." };
  if (!ROLES.includes(rol)) return { error: "Rol no válido." };

  const { error } = await createAdminClient().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nombre },
    app_metadata: { rol }, // la base de datos lee el rol de aquí al crear el perfil
  });
  if (error) {
    return {
      error: error.message.includes("already")
        ? "Ya existe un usuario con ese email."
        : `No se pudo crear el usuario: ${error.message}`,
    };
  }

  revalidatePath("/usuarios");
  return { ok: `Usuario ${email} creado. Pásale su contraseña inicial.` };
}

export async function cambiarRol(id: string, formData: FormData) {
  const admin = await requireAdmin();
  const rol = String(formData.get("rol")) as Rol;
  if (id === admin.id || !ROLES.includes(rol)) return;

  const supabase = await createClient();
  await supabase.from("perfiles").update({ rol }).eq("id", id);
  await createAdminClient().auth.admin.updateUserById(id, {
    app_metadata: { rol },
  });
  revalidatePath("/usuarios");
}

/** Baja/alta: un usuario dado de baja no puede entrar ni ver datos. */
export async function cambiarActivo(id: string, activo: boolean) {
  const admin = await requireAdmin();
  if (id === admin.id) return; // nadie puede darse de baja a sí mismo

  const supabase = await createClient();
  await supabase.from("perfiles").update({ activo }).eq("id", id);
  await createAdminClient().auth.admin.updateUserById(id, {
    // bloquea el inicio de sesión (≈100 años) o lo desbloquea
    ban_duration: activo ? "none" : "876000h",
  });
  revalidatePath("/usuarios");
}
