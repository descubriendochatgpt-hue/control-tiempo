"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getUsuarioActual } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { numero, texto, type EstadoFormulario } from "@/lib/formularios";
import { ETAPAS, textoEtapa, type EtapaOportunidad, type Perfil } from "@/lib/tipos";

const esEtapa = (v: unknown): v is EtapaOportunidad =>
  ETAPAS.some((e) => e.valor === v);
const cerrada = (e: EtapaOportunidad) => e === "ganado" || e === "perdido";

async function leerOportunidad(formData: FormData, usuario: Perfil) {
  const titulo = texto(formData, "titulo");
  const cliente_id = texto(formData, "cliente_id");
  const etapa = formData.get("etapa");
  if (!titulo) return { error: "El título es obligatorio." } as const;
  if (!cliente_id) return { error: "Elige un cliente." } as const;
  if (!esEtapa(etapa)) return { error: "Etapa no válida." } as const;

  // La línea de negocio, si no se indica, se hereda del cliente
  let linea = Number(formData.get("linea_negocio_id")) || null;
  if (!linea) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("clientes")
      .select("linea_negocio_id")
      .eq("id", cliente_id)
      .maybeSingle();
    if (!data) return { error: "Cliente no encontrado." } as const;
    linea = data.linea_negocio_id;
  }

  return {
    datos: {
      titulo,
      cliente_id,
      linea_negocio_id: linea,
      etapa,
      responsable_id:
        usuario.rol === "admin" ? texto(formData, "responsable_id") : usuario.id,
      importe_estimado: numero(formData, "importe_estimado") ?? 0,
      fecha_cierre_prevista: texto(formData, "fecha_cierre_prevista"),
      motivo_perdida: etapa === "perdido" ? texto(formData, "motivo_perdida") : null,
      notas: texto(formData, "notas"),
    },
  } as const;
}

export async function crearOportunidad(
  _prev: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const usuario = await getUsuarioActual();
  const leido = await leerOportunidad(formData, usuario);
  if ("error" in leido) return { error: leido.error };

  const supabase = await createClient();
  const { error } = await supabase.from("oportunidades").insert({
    ...leido.datos,
    cerrada_at: cerrada(leido.datos.etapa) ? new Date().toISOString() : null,
  });
  if (error) return { error: `No se pudo guardar: ${error.message}` };

  revalidatePath("/pipeline");
  redirect("/pipeline");
}

export async function actualizarOportunidad(
  id: string,
  _prev: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const usuario = await getUsuarioActual();
  const leido = await leerOportunidad(formData, usuario);
  if ("error" in leido) return { error: leido.error };

  const supabase = await createClient();
  const { data: antes } = await supabase
    .from("oportunidades")
    .select("etapa, responsable_id, cerrada_at")
    .eq("id", id)
    .single();
  if (!antes) return { error: "Oportunidad no encontrada." };

  const { error } = await supabase
    .from("oportunidades")
    .update({
      ...leido.datos,
      responsable_id:
        usuario.rol === "admin" ? leido.datos.responsable_id : antes.responsable_id,
      cerrada_at: cerrada(leido.datos.etapa)
        ? (antes.cerrada_at ?? new Date().toISOString())
        : null,
    })
    .eq("id", id);
  if (error) return { error: `No se pudo guardar: ${error.message}` };

  await anotarEnCliente(leido.datos.cliente_id, leido.datos.titulo, antes.etapa, leido.datos.etapa);
  revalidatePath("/pipeline");
  redirect("/pipeline");
}

/** Se llama al arrastrar una tarjeta a otra columna del kanban. */
export async function moverOportunidad(
  id: string,
  etapa: EtapaOportunidad,
  motivoPerdida?: string,
) {
  await getUsuarioActual();
  if (!esEtapa(etapa)) return { error: "Etapa no válida." };

  const supabase = await createClient();
  const { data: antes } = await supabase
    .from("oportunidades")
    .select("etapa, titulo, cliente_id, cerrada_at")
    .eq("id", id)
    .single();
  if (!antes) return { error: "Oportunidad no encontrada." };

  const { error } = await supabase
    .from("oportunidades")
    .update({
      etapa,
      cerrada_at: cerrada(etapa) ? (antes.cerrada_at ?? new Date().toISOString()) : null,
      ...(etapa === "perdido" ? { motivo_perdida: motivoPerdida?.trim() || null } : {}),
    })
    .eq("id", id);
  if (error) return { error: error.message };

  await anotarEnCliente(antes.cliente_id, antes.titulo, antes.etapa, etapa);
  revalidatePath("/pipeline");
  return {};
}

export async function eliminarOportunidad(id: string) {
  await getUsuarioActual();
  const supabase = await createClient();
  await supabase.from("oportunidades").delete().eq("id", id);
  revalidatePath("/pipeline");
  redirect("/pipeline");
}

/** Deja constancia en el histórico del cliente cuando cambia la etapa. */
async function anotarEnCliente(
  clienteId: string,
  titulo: string,
  antes: EtapaOportunidad,
  despues: EtapaOportunidad,
) {
  if (antes === despues) return;
  const supabase = await createClient();
  await supabase.from("interacciones").insert({
    cliente_id: clienteId,
    tipo: "nota",
    descripcion: `Oportunidad «${titulo}»: ${textoEtapa(antes)} → ${textoEtapa(despues)}`,
  });
  revalidatePath(`/clientes/${clienteId}`);
}
