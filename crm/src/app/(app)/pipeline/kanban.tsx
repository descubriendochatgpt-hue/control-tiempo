"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { ETAPAS, type EtapaOportunidad } from "@/lib/tipos";
import { moverOportunidad } from "./actions";

export type Tarjeta = {
  id: string;
  titulo: string;
  etapa: EtapaOportunidad;
  importe_estimado: number;
  fecha_cierre_prevista: string | null;
  cliente: { nombre: string } | null;
  responsable: { nombre: string } | null;
  linea: { color: string } | null;
};

const COLOR_COLUMNA: Record<EtapaOportunidad, string> = {
  nuevo: "border-t-sky-400",
  contactado: "border-t-indigo-400",
  propuesta: "border-t-amber-400",
  ganado: "border-t-emerald-500",
  perdido: "border-t-slate-400",
};

const euros = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

/**
 * Tablero kanban. Arrastra una tarjeta a otra columna para cambiar su etapa
 * (en el móvil, usa el desplegable "Mover a…" de cada tarjeta).
 * La tarjeta se mueve al instante y el cambio se guarda en segundo plano.
 */
export function Kanban({ tarjetas }: { tarjetas: Tarjeta[] }) {
  const [optimistas, moverLocal] = useOptimistic(
    tarjetas,
    (actual, { id, etapa }: { id: string; etapa: EtapaOportunidad }) =>
      actual.map((t) => (t.id === id ? { ...t, etapa } : t)),
  );
  const [, startTransition] = useTransition();
  const [sobre, setSobre] = useState<EtapaOportunidad | null>(null);
  const [error, setError] = useState<string | null>(null);

  function mover(id: string, etapa: EtapaOportunidad) {
    const tarjeta = optimistas.find((t) => t.id === id);
    if (!tarjeta || tarjeta.etapa === etapa) return;
    let motivo: string | undefined;
    if (etapa === "perdido") {
      const r = window.prompt("¿Por qué se ha perdido? (opcional)");
      if (r === null) return; // canceló
      motivo = r;
    }
    setError(null);
    startTransition(async () => {
      moverLocal({ id, etapa });
      const res = await moverOportunidad(id, etapa, motivo);
      if (res?.error) setError(`No se pudo mover: ${res.error}`);
    });
  }

  return (
    <div className="space-y-3">
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <div className="grid auto-cols-[minmax(180px,1fr)] grid-flow-col gap-4 overflow-x-auto pb-4">
        {ETAPAS.map(({ valor, texto }) => {
          const columna = optimistas.filter((t) => t.etapa === valor);
          const total = columna.reduce((s, t) => s + Number(t.importe_estimado), 0);
          return (
            <section
              key={valor}
              onDragOver={(e) => {
                e.preventDefault();
                setSobre(valor);
              }}
              onDragLeave={() => setSobre((s) => (s === valor ? null : s))}
              onDrop={(e) => {
                e.preventDefault();
                setSobre(null);
                mover(e.dataTransfer.getData("text/plain"), valor);
              }}
              className={`flex min-h-64 flex-col rounded-xl border border-t-4 border-slate-200 bg-slate-100/60 p-3 ${COLOR_COLUMNA[valor]} ${
                sobre === valor ? "ring-2 ring-indigo-300" : ""
              }`}
            >
              <header className="mb-3 flex items-baseline justify-between">
                <h2 className="text-sm font-semibold">
                  {texto} <span className="font-normal text-slate-500">({columna.length})</span>
                </h2>
                <span className="text-xs text-slate-500 tabular-nums">{euros.format(total)}</span>
              </header>
              <ul className="flex flex-1 flex-col gap-2">
                {columna.map((t) => (
                  <li
                    key={t.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("text/plain", t.id)}
                    className="cursor-grab rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-xs active:cursor-grabbing"
                  >
                    <div className="flex items-start gap-2">
                      {t.linea && (
                        <span className="mt-1.5 size-2 shrink-0 rounded-full" style={{ backgroundColor: t.linea.color }} aria-hidden />
                      )}
                      <Link href={`/pipeline/${t.id}`} className="font-medium hover:text-indigo-700 hover:underline">
                        {t.titulo}
                      </Link>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{t.cliente?.nombre ?? "—"}</p>
                    <div className="mt-2 flex items-center justify-between text-xs">
                      <span className="font-semibold tabular-nums">{euros.format(Number(t.importe_estimado))}</span>
                      <span className="text-slate-500">{t.responsable?.nombre ?? "Sin asignar"}</span>
                    </div>
                    <label className="mt-2 block">
                      <span className="sr-only">Mover a</span>
                      <select
                        value={t.etapa}
                        onChange={(e) => mover(t.id, e.target.value as EtapaOportunidad)}
                        className="w-full rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600"
                      >
                        {ETAPAS.map((e) => (
                          <option key={e.valor} value={e.valor}>
                            {e.valor === t.etapa ? `Etapa: ${e.texto}` : `Mover a ${e.texto}`}
                          </option>
                        ))}
                      </select>
                    </label>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
