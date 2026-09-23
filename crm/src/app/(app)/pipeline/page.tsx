import Link from "next/link";
import { getUsuarioActual } from "@/lib/auth";
import { getLineas, getPerfilesActivos } from "@/lib/datos";
import { createClient } from "@/lib/supabase/server";
import { Kanban, type Tarjeta } from "./kanban";

const uno = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function PipelinePage({ searchParams }: PageProps<"/pipeline">) {
  const sp = await searchParams;
  const filtro = { linea: uno(sp.linea), responsable: uno(sp.responsable) };

  const [usuario, lineas, perfiles] = await Promise.all([
    getUsuarioActual(),
    getLineas(),
    getPerfilesActivos(),
  ]);
  const esAdmin = usuario.rol === "admin";

  const supabase = await createClient();
  let consulta = supabase
    .from("oportunidades")
    .select(
      "id, titulo, etapa, importe_estimado, fecha_cierre_prevista, cliente:clientes(nombre), responsable:perfiles!responsable_id(nombre), linea:lineas_negocio(color)",
    )
    .order("updated_at", { ascending: false });

  if (filtro.linea) consulta = consulta.eq("linea_negocio_id", Number(filtro.linea));
  if (esAdmin && filtro.responsable) consulta = consulta.eq("responsable_id", filtro.responsable);

  const { data, error } = await consulta.returns<Tarjeta[]>();

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Pipeline</h1>
        <Link href="/pipeline/nueva" className="btn-primario">+ Nueva oportunidad</Link>
      </header>

      <form className="flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="text-xs font-medium text-slate-600">Línea de negocio</span>
          <select name="linea" defaultValue={filtro.linea} className="input mt-1">
            <option value="">Todas</option>
            {lineas.map((l) => (
              <option key={l.id} value={l.id}>{l.nombre}</option>
            ))}
          </select>
        </label>
        {esAdmin && (
          <label className="block">
            <span className="text-xs font-medium text-slate-600">Responsable</span>
            <select name="responsable" defaultValue={filtro.responsable} className="input mt-1">
              <option value="">Todos</option>
              {perfiles.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </label>
        )}
        <button className="btn-secundario">Filtrar</button>
      </form>

      {error && <p className="text-sm text-red-600">Error al cargar: {error.message}</p>}
      <Kanban tarjetas={data ?? []} />
    </div>
  );
}
