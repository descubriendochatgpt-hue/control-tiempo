import { getUsuarioActual } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { LineaNegocio } from "@/lib/tipos";

/**
 * Panel de inicio. No hace falta filtrar a mano por usuario: la base de
 * datos ya solo devuelve al empleado sus propios clientes y oportunidades,
 * y al admin todo. Por eso la misma página sirve de vista general y personal.
 */
export default async function PanelPage() {
  const usuario = await getUsuarioActual();
  const supabase = await createClient();

  const [{ data: lineas }, { data: clientes }, { data: oportunidades }] =
    await Promise.all([
      supabase
        .from("lineas_negocio")
        .select("id, slug, nombre, color, activa")
        .eq("activa", true)
        .order("id")
        .returns<LineaNegocio[]>(),
      supabase.from("clientes").select("linea_negocio_id, estado"),
      supabase
        .from("oportunidades")
        .select("linea_negocio_id, etapa, importe_estimado"),
    ]);

  const resumen = (lineas ?? []).map((linea) => {
    const activos = (clientes ?? []).filter(
      (c) => c.linea_negocio_id === linea.id && c.estado === "activo",
    ).length;
    const abiertas = (oportunidades ?? []).filter(
      (o) =>
        o.linea_negocio_id === linea.id &&
        o.etapa !== "ganado" &&
        o.etapa !== "perdido",
    );
    const estimado = abiertas.reduce(
      (suma, o) => suma + Number(o.importe_estimado),
      0,
    );
    return { linea, activos, abiertas: abiertas.length, estimado };
  });

  const euros = new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Hola, {usuario.nombre}</h1>
        <p className="text-sm text-slate-500">
          {usuario.rol === "admin"
            ? "Vista general de toda la empresa"
            : "Tu actividad: tus clientes y oportunidades"}
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        {resumen.map(({ linea, activos, abiertas, estimado }) => (
          <article key={linea.id} className="tarjeta">
            <div className="mb-4 flex items-center gap-2">
              <span
                className="size-2.5 rounded-full"
                style={{ backgroundColor: linea.color }}
                aria-hidden
              />
              <h2 className="text-sm font-semibold">{linea.nombre}</h2>
            </div>
            <dl className="grid grid-cols-3 gap-2 text-center">
              <Dato titulo="Clientes activos" valor={String(activos)} />
              <Dato titulo="Leads abiertos" valor={String(abiertas)} />
              <Dato titulo="Fact. estimada" valor={euros.format(estimado)} />
            </dl>
          </article>
        ))}
      </section>
    </div>
  );
}

function Dato({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div>
      <dd className="text-xl font-semibold tabular-nums">{valor}</dd>
      <dt className="text-xs text-slate-500">{titulo}</dt>
    </div>
  );
}
