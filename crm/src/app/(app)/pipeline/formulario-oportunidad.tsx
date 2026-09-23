"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { EstadoFormulario } from "@/lib/formularios";
import { enviarSinVaciar } from "@/lib/enviar-formulario";
import { ETAPAS, type LineaNegocio, type Oportunidad, type Perfil } from "@/lib/tipos";

type Props = {
  accion: (prev: EstadoFormulario, formData: FormData) => Promise<EstadoFormulario>;
  clientes: { id: string; nombre: string }[];
  lineas: LineaNegocio[];
  perfiles: Perfil[];
  esAdmin: boolean;
  usuarioId: string;
  oportunidad?: Oportunidad;
  clienteInicial?: string;
};

export function FormularioOportunidad({
  accion,
  clientes,
  lineas,
  perfiles,
  esAdmin,
  usuarioId,
  oportunidad,
  clienteInicial,
}: Props) {
  const [estado, enviar, enviando] = useActionState(accion, {});
  const [etapa, setEtapa] = useState(oportunidad?.etapa ?? "nuevo");

  return (
    <form onSubmit={enviarSinVaciar(enviar)} className="tarjeta grid gap-4 md:grid-cols-2">
      <label className="block md:col-span-2">
        <span className="text-sm font-medium text-slate-700">Título *</span>
        <input
          name="titulo"
          required
          defaultValue={oportunidad?.titulo}
          placeholder="Ej.: Certificado energético vivienda C/ Colón"
          className="input mt-1"
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-slate-700">Cliente *</span>
        <select
          name="cliente_id"
          required
          defaultValue={oportunidad?.cliente_id ?? clienteInicial ?? ""}
          className="input mt-1"
        >
          <option value="" disabled>Elige…</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>
        {clientes.length === 0 && (
          <span className="mt-1 block text-xs text-slate-500">
            Primero <Link href="/clientes/nuevo" className="text-indigo-700 underline">crea un cliente</Link>.
          </span>
        )}
      </label>
      <label className="block">
        <span className="text-sm font-medium text-slate-700">Línea de negocio</span>
        <select name="linea_negocio_id" defaultValue={oportunidad?.linea_negocio_id ?? ""} className="input mt-1">
          <option value="">La del cliente</option>
          {lineas.map((l) => (
            <option key={l.id} value={l.id}>{l.nombre}</option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="text-sm font-medium text-slate-700">Etapa</span>
        <select
          name="etapa"
          value={etapa}
          onChange={(e) => setEtapa(e.target.value as typeof etapa)}
          className="input mt-1"
        >
          {ETAPAS.map((e) => (
            <option key={e.valor} value={e.valor}>{e.texto}</option>
          ))}
        </select>
      </label>
      {esAdmin && (
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Responsable</span>
          <select
            name="responsable_id"
            defaultValue={oportunidad ? (oportunidad.responsable_id ?? "") : usuarioId}
            className="input mt-1"
          >
            <option value="">Sin asignar</option>
            {perfiles.map((p) => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>
        </label>
      )}
      <label className="block">
        <span className="text-sm font-medium text-slate-700">Importe estimado (€, sin IVA)</span>
        <input
          name="importe_estimado"
          inputMode="decimal"
          defaultValue={oportunidad ? String(oportunidad.importe_estimado).replace(".", ",") : ""}
          placeholder="0"
          className="input mt-1"
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-slate-700">Cierre previsto</span>
        <input
          name="fecha_cierre_prevista"
          type="date"
          defaultValue={oportunidad?.fecha_cierre_prevista ?? ""}
          className="input mt-1"
        />
      </label>
      {etapa === "perdido" && (
        <label className="block md:col-span-2">
          <span className="text-sm font-medium text-slate-700">Motivo de pérdida</span>
          <input name="motivo_perdida" defaultValue={oportunidad?.motivo_perdida ?? ""} className="input mt-1" />
        </label>
      )}
      <label className="block md:col-span-2">
        <span className="text-sm font-medium text-slate-700">Notas</span>
        <textarea name="notas" rows={3} defaultValue={oportunidad?.notas ?? ""} className="input mt-1" />
      </label>

      {estado.error && (
        <p role="alert" className="text-sm text-red-600 md:col-span-2">{estado.error}</p>
      )}
      <div className="flex gap-3 md:col-span-2">
        <button disabled={enviando} className="btn-primario">
          {enviando ? "Guardando…" : "Guardar"}
        </button>
        <Link href="/pipeline" className="btn-secundario">Cancelar</Link>
      </div>
    </form>
  );
}
