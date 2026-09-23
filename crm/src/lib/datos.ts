import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { LineaNegocio, Perfil } from "@/lib/tipos";

/** Consultas que se repiten en varias pantallas. */

export const getLineas = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("lineas_negocio")
    .select("id, slug, nombre, color, activa")
    .eq("activa", true)
    .order("id")
    .returns<LineaNegocio[]>();
  return data ?? [];
});

/** Usuarios activos, para elegir responsable. */
export const getPerfilesActivos = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("perfiles")
    .select("id, email, nombre, rol, activo, created_at")
    .eq("activo", true)
    .order("nombre")
    .returns<Perfil[]>();
  return data ?? [];
});

export const euros = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export const fechaCorta = new Intl.DateTimeFormat("es-ES", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "Europe/Madrid",
});

export const fechaHora = new Intl.DateTimeFormat("es-ES", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Madrid",
});
