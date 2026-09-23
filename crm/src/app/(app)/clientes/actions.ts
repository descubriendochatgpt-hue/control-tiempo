"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getUsuarioActual } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { texto, type EstadoFormulario } from "@/lib/formularios";
import {
  ESTADOS_CLIENTE,
  TIPOS_INTERACCION,
  textoEstado,
  type EstadoCliente,
  type Perfil,
  type TipoInteraccion,
} from "@/lib/tipos";

const esEstado = (v: unknown): v is EstadoCliente =>
  ESTADOS_CLIENTE.some((e) => e.valor === v);

/** Convierte lo que llega del formulario en una fila de la tabla clientes. */
function leerCliente(formData: FormData, usuario: Perfil) {
  const nombre = texto(formData, "nombre");
  const linea = Number(formData.get("linea_negocio_id"));
  const estado = formData.get("estado");
  if (!nombre) return { error: "El nombre es obligatorio." } as const;
  if (!linea) return { error: "Elige una línea de negocio." } as const;
  if (!esEstado(estado)) return { error: "Estado no válido." } as const;

  // Un empleado siempre es el responsable de lo que crea; el admin elige.
  const responsable_id =
    usuario.rol === "admin" ? texto(formData, "responsable_id") : usuario.id;

  return {
    datos: {
      nombre,
      razon_social: texto(formData, "razon_social"),
      nif: texto(formData, "nif")?.toUpperCase() ?? null,
      email: texto(formData, "email")?.toLowerCase() ?? null,
      telefono: texto(formData, "telefono"),
      direccion: texto(formData, "direccion"),
      codigo_postal: texto(formData, "codigo_postal"),
      ciudad: texto(formData, "ciudad"),
      provincia: texto(formData, "provincia"),
      pais: (texto(formData, "pais") ?? "ES").toUpperCase(),
      linea_negocio_id: linea,
      estado,
      responsable_id,
      notas: texto(formData, "notas"),
    },
  } as const;
}

export async function crearCliente(
  _prev: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const usuario = await getUsuarioActual();
  const leido = leerCliente(formData, usuario);
  if ("error" in leido) return { error: leido.error };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clientes")
    .insert(leido.datos)
    .select("id")
    .single();
  if (error) return { error: `No se pudo guardar: ${error.message}` };

  revalidatePath("/clientes");
  redirect(`/clientes/${data.id}`);
}

export async function actualizarCliente(
  id: string,
  _prev: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const usuario = await getUsuarioActual();
  const leido = leerCliente(formData, usuario);
  if ("error" in leido) return { error: leido.error };

  const supabase = await createClient();
  const { data: antes } = await supabase
    .from("clientes")
    .select("estado, responsable_id")
    .eq("id", id)
    .single();
  if (!antes) return { error: "Cliente no encontrado." };

  // Un empleado no puede cambiar el responsable (lo hace un admin)
  const datos =
    usuario.rol === "admin"
      ? leido.datos
      : { ...leido.datos, responsable_id: antes.responsable_id };

  const { error } = await supabase.from("clientes").update(datos).eq("id", id);
  if (error) return { error: `No se pudo guardar: ${error.message}` };

  await registrarCambioEstado(id, antes.estado, datos.estado);
  revalidatePath("/clientes");
  redirect(`/clientes/${id}`);
}

/** Cambio rápido de estado desde la ficha. */
export async function cambiarEstadoCliente(id: string, formData: FormData) {
  await getUsuarioActual();
  const estado = formData.get("estado");
  if (!esEstado(estado)) return;

  const supabase = await createClient();
  const { data: antes } = await supabase
    .from("clientes")
    .select("estado")
    .eq("id", id)
    .single();
  if (!antes) return;

  await supabase.from("clientes").update({ estado }).eq("id", id);
  await registrarCambioEstado(id, antes.estado, estado);
  revalidatePath(`/clientes/${id}`);
}

/**
 * Deja constancia en el histórico cuando cambia el estado.
 * (En la Fase 4, al pasar a "activo" se generará aquí la factura en Holded.)
 */
async function registrarCambioEstado(
  clienteId: string,
  antes: EstadoCliente,
  despues: EstadoCliente,
) {
  if (antes === despues) return;
  const supabase = await createClient();
  await supabase.from("interacciones").insert({
    cliente_id: clienteId,
    tipo: "nota",
    descripcion: `Estado cambiado: ${textoEstado(antes)} → ${textoEstado(despues)}`,
  });
}

export async function eliminarCliente(id: string) {
  const usuario = await getUsuarioActual();
  if (usuario.rol !== "admin") return;

  const supabase = await createClient();
  const { error } = await supabase.from("clientes").delete().eq("id", id);
  if (error) {
    const motivo = error.code === "23503" ? "tiene-facturas" : "error";
    redirect(`/clientes/${id}?error=${motivo}`);
  }
  revalidatePath("/clientes");
  redirect("/clientes");
}

export async function anadirInteraccion(
  clienteId: string,
  _prev: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  await getUsuarioActual();
  const descripcion = texto(formData, "descripcion");
  const tipo = formData.get("tipo") as TipoInteraccion;
  const fecha = texto(formData, "fecha_iso");
  if (!descripcion) return { error: "Escribe qué ha pasado." };
  if (!TIPOS_INTERACCION.some((t) => t.valor === tipo))
    return { error: "Tipo no válido." };

  const supabase = await createClient();
  const { error } = await supabase.from("interacciones").insert({
    cliente_id: clienteId,
    tipo,
    descripcion,
    ...(fecha && !Number.isNaN(Date.parse(fecha)) ? { fecha } : {}),
  });
  if (error) return { error: `No se pudo guardar: ${error.message}` };

  revalidatePath(`/clientes/${clienteId}`);
  return { ok: "Guardado." };
}

export async function borrarInteraccion(id: string, clienteId: string) {
  await getUsuarioActual();
  const supabase = await createClient();
  await supabase.from("interacciones").delete().eq("id", id);
  revalidatePath(`/clientes/${clienteId}`);
}
