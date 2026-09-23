"use client";

import { useActionState, useEffect, useRef } from "react";
import { enviarSinVaciar } from "@/lib/enviar-formulario";
import { crearUsuario, type EstadoFormulario } from "./actions";

export function FormularioAlta() {
  const [estado, accion, enviando] = useActionState<EstadoFormulario, FormData>(
    crearUsuario,
    {},
  );
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (estado.ok) form.current?.reset();
  }, [estado]);

  return (
    <form ref={form} onSubmit={enviarSinVaciar(accion)} className="grid gap-3 md:grid-cols-5 md:items-end">
      <label className="block">
        <span className="text-xs font-medium text-slate-600">Nombre</span>
        <input name="nombre" required className="input mt-1" />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-slate-600">Email</span>
        <input name="email" type="email" required className="input mt-1" />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-slate-600">Contraseña inicial</span>
        <input name="password" type="text" minLength={8} required className="input mt-1" autoComplete="off" />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-slate-600">Rol</span>
        <select name="rol" defaultValue="empleado" className="input mt-1">
          <option value="empleado">Empleado</option>
          <option value="admin">Admin</option>
        </select>
      </label>
      <button disabled={enviando} className="btn-primario">
        {enviando ? "Creando…" : "Dar de alta"}
      </button>
      {(estado.error || estado.ok) && (
        <p
          role="status"
          className={`text-sm md:col-span-5 ${estado.error ? "text-red-600" : "text-emerald-700"}`}
        >
          {estado.error ?? estado.ok}
        </p>
      )}
    </form>
  );
}
