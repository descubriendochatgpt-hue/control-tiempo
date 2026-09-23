"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { EstadoFormulario } from "@/lib/formularios";
import { enviarSinVaciar } from "@/lib/enviar-formulario";
import {
  ESTADOS_CLIENTE,
  type Cliente,
  type LineaNegocio,
  type Perfil,
} from "@/lib/tipos";

type Props = {
  accion: (prev: EstadoFormulario, formData: FormData) => Promise<EstadoFormulario>;
  lineas: LineaNegocio[];
  perfiles: Perfil[];
  esAdmin: boolean;
  usuarioId: string;
  cliente?: Cliente;
  volverA: string;
};

/** Formulario de alta y edición de clientes (el mismo para los dos casos). */
export function FormularioCliente({
  accion,
  lineas,
  perfiles,
  esAdmin,
  usuarioId,
  cliente,
  volverA,
}: Props) {
  const [estado, enviar, enviando] = useActionState(accion, {});

  return (
    <form onSubmit={enviarSinVaciar(enviar)} className="space-y-6">
      <fieldset className="tarjeta grid gap-4 md:grid-cols-2">
        <legend className="sr-only">Datos principales</legend>
        <Campo etiqueta="Nombre / contacto *" nombre="nombre" valor={cliente?.nombre} required />
        <Campo etiqueta="Email" nombre="email" tipo="email" valor={cliente?.email} />
        <Campo etiqueta="Teléfono" nombre="telefono" tipo="tel" valor={cliente?.telefono} />
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Línea de negocio *</span>
          <select
            name="linea_negocio_id"
            required
            defaultValue={cliente?.linea_negocio_id ?? ""}
            className="input mt-1"
          >
            <option value="" disabled>Elige…</option>
            {lineas.map((l) => (
              <option key={l.id} value={l.id}>{l.nombre}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Estado</span>
          <select name="estado" defaultValue={cliente?.estado ?? "lead"} className="input mt-1">
            {ESTADOS_CLIENTE.map((e) => (
              <option key={e.valor} value={e.valor}>{e.texto}</option>
            ))}
          </select>
        </label>
        {esAdmin && (
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Responsable</span>
            <select
              name="responsable_id"
              defaultValue={cliente ? (cliente.responsable_id ?? "") : usuarioId}
              className="input mt-1"
            >
              <option value="">Sin asignar</option>
              {perfiles.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </label>
        )}
      </fieldset>

      <fieldset className="tarjeta grid gap-4 md:grid-cols-2">
        <legend className="mb-2 px-1 text-sm font-semibold text-slate-700">
          Datos fiscales (para facturar en Holded)
        </legend>
        <Campo etiqueta="Razón social" nombre="razon_social" valor={cliente?.razon_social} />
        <Campo etiqueta="NIF / CIF" nombre="nif" valor={cliente?.nif} />
        <Campo etiqueta="Dirección" nombre="direccion" valor={cliente?.direccion} />
        <Campo etiqueta="Código postal" nombre="codigo_postal" valor={cliente?.codigo_postal} />
        <Campo etiqueta="Ciudad" nombre="ciudad" valor={cliente?.ciudad} />
        <Campo etiqueta="Provincia" nombre="provincia" valor={cliente?.provincia} />
        <Campo etiqueta="País (código, ej. ES)" nombre="pais" valor={cliente?.pais ?? "ES"} />
      </fieldset>

      <fieldset className="tarjeta">
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Notas</span>
          <textarea name="notas" rows={4} defaultValue={cliente?.notas ?? ""} className="input mt-1" />
        </label>
      </fieldset>

      {estado.error && (
        <p role="alert" className="text-sm text-red-600">{estado.error}</p>
      )}
      <div className="flex gap-3">
        <button disabled={enviando} className="btn-primario">
          {enviando ? "Guardando…" : "Guardar"}
        </button>
        <Link href={volverA} className="btn-secundario">Cancelar</Link>
      </div>
    </form>
  );
}

function Campo({
  etiqueta,
  nombre,
  valor,
  tipo = "text",
  required,
}: {
  etiqueta: string;
  nombre: string;
  valor?: string | null;
  tipo?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{etiqueta}</span>
      <input
        name={nombre}
        type={tipo}
        defaultValue={valor ?? ""}
        required={required}
        className="input mt-1"
      />
    </label>
  );
}
