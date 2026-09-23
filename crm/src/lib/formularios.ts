/** Pequeñas ayudas para leer los campos que llegan de un formulario. */

/** Texto recortado; si está vacío devuelve null (se guarda como "vacío"). */
export function texto(formData: FormData, campo: string): string | null {
  const v = String(formData.get(campo) ?? "").trim();
  return v === "" ? null : v;
}

/** Número (acepta coma decimal: "1.250,50" o "1250,5"). */
export function numero(formData: FormData, campo: string): number | null {
  const v = String(formData.get(campo) ?? "").trim();
  if (v === "") return null;
  const limpio = v.includes(",") ? v.replace(/\./g, "").replace(",", ".") : v;
  const n = Number(limpio);
  return Number.isFinite(n) ? n : null;
}

export type EstadoFormulario = { error?: string; ok?: string };
