"use client";

import { useActionState } from "react";
import { iniciarSesion, type EstadoLogin } from "./actions";

export function FormularioLogin({ avisoInicial }: { avisoInicial?: string }) {
  const [estado, accion, enviando] = useActionState<EstadoLogin, FormData>(
    iniciarSesion,
    { error: avisoInicial },
  );

  return (
    <form action={accion} className="space-y-4">
      <label className="block">
        <span className="text-sm font-medium text-slate-700">Email</span>
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          className="input mt-1"
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-slate-700">Contraseña</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="input mt-1"
        />
      </label>
      {estado.error && (
        <p role="alert" className="text-sm text-red-600">
          {estado.error}
        </p>
      )}
      <button type="submit" disabled={enviando} className="btn-primario w-full">
        {enviando ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
