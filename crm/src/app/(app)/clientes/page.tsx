import Link from "next/link";
import { getUsuarioActual } from "@/lib/auth";
import { fechaCorta, getLineas, getPerfilesActivos } from "@/lib/datos";
import { createClient } from "@/lib/supabase/server";
import { ESTADOS_CLIENTE, type EstadoCliente } from "@/lib/tipos";
import { EtiquetaEstado, EtiquetaLinea } from "@/components/etiquetas";

type Fila = {
  id: string;
  nombre: string;
  razon_social: string | null;
  email: string | null;
  telefono: string | null;
  estado: EstadoCliente;
  updated_at: string;
  linea: { nombre: string; color: string } | null;
  responsable: { nombre: string } | null;
};

const uno = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

/**
 * Listado de clientes. Los filtros viajan en la dirección de la página
 * (?linea=2&estado=activo…), así se pueden guardar en favoritos o compartir.
 */
export default async function ClientesPage({ searchParams }: PageProps<"/clientes">) {
  const sp = await searchParams;
  const filtro = {
    linea: uno(sp.linea),
    estado: uno(sp.estado),
    responsable: uno(sp.responsable),
    q: uno(sp.q).trim(),
  };

  const [usuario, lineas, perfiles] = await Promise.all([
    getUsuarioActual(),
    getLineas(),
    getPerfilesActivos(),
  ]);
  const esAdmin = usuario.rol === "admin";

  const supabase = await createClient();
  let consulta = supabase
    .from("clientes")
    .select(
      "id, nombre, razon_social, email, telefono, estado, updated_at, linea:lineas_negocio(nombre, color), responsable:perfiles!responsable_id(nombre)",
    )
    .order("updated_at", { ascending: false })
    .limit(500);

  if (filtro.linea) consulta = consulta.eq("linea_negocio_id", Number(filtro.linea));
  if (filtro.estado) consulta = consulta.eq("estado", filtro.estado);
  if (esAdmin && filtro.responsable === "sin") consulta = consulta.is("responsable_id", null);
  else if (esAdmin && filtro.responsable) consulta = consulta.eq("responsable_id", filtro.responsable);
  if (filtro.q) {
    // quitamos caracteres que tienen significado especial en la búsqueda
    const q = filtro.q.replace(/[,()%*\\]/g, " ");
    consulta = consulta.or(
      `nombre.ilike.%${q}%,razon_social.ilike.%${q}%,email.ilike.%${q}%,nif.ilike.%${q}%,telefono.ilike.%${q}%`,
    );
  }

  const { data, error } = await consulta.returns<Fila[]>();
  const clientes = data ?? [];
  const hayFiltros = Object.values(filtro).some(Boolean);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Clientes</h1>
        <Link href="/clientes/nuevo" className="btn-primario">+ Nuevo cliente</Link>
      </header>

      <form className="tarjeta grid gap-3 md:grid-cols-5 md:items-end">
        <label className="block md:col-span-2">
          <span className="text-xs font-medium text-slate-600">Buscar</span>
          <input name="q" defaultValue={filtro.q} placeholder="Nombre, email, NIF, teléfono…" className="input mt-1" />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-slate-600">Línea de negocio</span>
          <select name="linea" defaultValue={filtro.linea} className="input mt-1">
            <option value="">Todas</option>
            {lineas.map((l) => (
              <option key={l.id} value={l.id}>{l.nombre}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-medium text-slate-600">Estado</span>
          <select name="estado" defaultValue={filtro.estado} className="input mt-1">
            <option value="">Todos</option>
            {ESTADOS_CLIENTE.map((e) => (
              <option key={e.valor} value={e.valor}>{e.texto}</option>
            ))}
          </select>
        </label>
        {esAdmin && (
          <label className="block">
            <span className="text-xs font-medium text-slate-600">Responsable</span>
            <select name="responsable" defaultValue={filtro.responsable} className="input mt-1">
              <option value="">Todos</option>
              <option value="sin">Sin asignar</option>
              {perfiles.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </label>
        )}
        <div className="flex gap-2 md:col-span-5">
          <button className="btn-primario">Filtrar</button>
          {hayFiltros && <Link href="/clientes" className="btn-secundario">Quitar filtros</Link>}
        </div>
      </form>

      {error && <p className="text-sm text-red-600">Error al cargar: {error.message}</p>}

      <section className="tarjeta overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-xs text-slate-500 uppercase">
            <tr>
              <th className="px-5 py-3 font-medium">Cliente</th>
              <th className="px-5 py-3 font-medium">Línea</th>
              <th className="px-5 py-3 font-medium">Estado</th>
              <th className="px-5 py-3 font-medium">Responsable</th>
              <th className="px-5 py-3 font-medium">Contacto</th>
              <th className="px-5 py-3 font-medium">Actualizado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {clientes.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="px-5 py-3">
                  <Link href={`/clientes/${c.id}`} className="font-medium text-indigo-700 hover:underline">
                    {c.nombre}
                  </Link>
                  {c.razon_social && <p className="text-xs text-slate-500">{c.razon_social}</p>}
                </td>
                <td className="px-5 py-3"><EtiquetaLinea linea={c.linea} /></td>
                <td className="px-5 py-3"><EtiquetaEstado estado={c.estado} /></td>
                <td className="px-5 py-3">{c.responsable?.nombre ?? <span className="text-slate-400">—</span>}</td>
                <td className="px-5 py-3 text-xs text-slate-600">
                  {c.email && <p>{c.email}</p>}
                  {c.telefono && <p>{c.telefono}</p>}
                </td>
                <td className="px-5 py-3 text-xs whitespace-nowrap text-slate-500">
                  {fechaCorta.format(new Date(c.updated_at))}
                </td>
              </tr>
            ))}
            {clientes.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-slate-500">
                  {hayFiltros ? "Ningún cliente coincide con los filtros." : "Aún no hay clientes. ¡Crea el primero!"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
      <p className="text-xs text-slate-500">{clientes.length} cliente(s)</p>
    </div>
  );
}
