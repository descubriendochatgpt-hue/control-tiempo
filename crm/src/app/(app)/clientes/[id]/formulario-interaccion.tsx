"use client";

import { useActionState, useEffect, useRef } from "react";
import { enviarSinVaciar } from "@/lib/enviar-formulario";
import type { EstadoFormulario } from "@/lib/formularios";
import { TIPOS_INTERACCION } from "@/lib/tipos";

/** Añadir una llamada, email, reunión… al histórico del cliente. */
export function FormularioInteraccion({
  accion,
}: {
  accion: (prev: EstadoFormulario, formData: FormData) => Promise<EstadoFormulario>;
}) {
  const [estado, enviar, enviando] = useActionState(accion, {});

  const form = useRef<HTMLFormElement>(null);

  // Solo se vacía el formulario si se ha guardado bien
  useEffect(() => {
    if (estado.ok) form.current?.reset();
  }, [estado]);

  // La fecha se envía con la zona horaria del navegador para que no se descuadre
  const onSubmit = enviarSinVaciar(enviar, (formData) => {
    const local = String(formData.get("fecha_local") ?? "");
    if (local) formData.set("fecha_iso", new Date(local).toISOString());
  });

  return (
    <form ref={form} onSubmit={onSubmit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs font-medium text-slate-600">Tipo</span>
          <select name="tipo" defaultValue="llamada" className="input mt-1">
            {TIPOS_INTERACCION.map((t) => (
              <option key={t.valor} value={t.valor}>{t.texto}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-medium text-slate-600">Fecha (vacío = ahora)</span>
          <input type="datetime-local" name="fecha_local" className="input mt-1" />
        </label>
      </div>
      <textarea
        name="descripcion"
        rows={3}
        required
        placeholder="¿Qué ha pasado? Ej.: Llamada, le interesa la propuesta, volver a llamar el lunes."
        className="input"
      />
      {estado.error && <p role="alert" className="text-sm text-red-600">{estado.error}</p>}
      <button disabled={enviando} className="btn-primario">
        {enviando ? "Guardando…" : "Añadir al histórico"}
      </button>
    </form>
  );
}
