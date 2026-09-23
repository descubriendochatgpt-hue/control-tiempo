import Link from "next/link";
import { notFound } from "next/navigation";
import { getUsuarioActual } from "@/lib/auth";
import { euros, fechaCorta, fechaHora } from "@/lib/datos";
import { createClient } from "@/lib/supabase/server";
import {
  ESTADOS_CLIENTE,
  TIPOS_INTERACCION,
  textoEtapa,
  type Cliente,
  type EtapaOportunidad,
  type TipoInteraccion,
} from "@/lib/tipos";
import { EtiquetaEstado, EtiquetaLinea } from "@/components/etiquetas";
import {
  anadirInteraccion,
  borrarInteraccion,
  cambiarEstadoCliente,
  eliminarCliente,
} from "../actions";
import { FormularioInteraccion } from "./formulario-interaccion";
import { BotonConfirmar } from "@/components/boton-confirmar";

type ClienteFicha = Cliente & {
  linea: { nombre: string; color: string } | null;
  responsable: { nombre: string } | null;
};

const ERRORES: Record<string, string> = {
  "tiene-facturas": "No se puede eliminar: el cliente tiene facturas. Márcalo como inactivo.",
  error: "No se pudo eliminar el cliente.",
};

export default async function FichaClientePage({
  params,
  searchParams,
}: PageProps<"/clientes/[id]">) {
  const { id } = await params;
  const { error } = await searchParams;
  const usuario = await getUsuarioActual();
  const supabase = await createClient();

  const [{ data: cliente }, { data: interacciones }, { data: oportunidades }] =
    await Promise.all([
      supabase
        .from("clientes")
        .select("*, linea:lineas_negocio(nombre, color), responsable:perfiles!responsable_id(nombre)")
        .eq("id", id)
        .maybeSingle<ClienteFicha>(),
      supabase
        .from("interacciones")
        .select("id, tipo, descripcion, fecha, autor_id, autor:perfiles!autor_id(nombre)")
        .eq("cliente_id", id)
        .order("fecha", { ascending: false })
        .returns<
          {
            id: string;
            tipo: TipoInteraccion;
            descripcion: string;
            fecha: string;
            autor_id: string | null;
            autor: { nombre: string } | null;
          }[]
        >(),
      supabase
        .from("oportunidades")
        .select("id, titulo, etapa, importe_estimado")
        .eq("cliente_id", id)
        .order("created_at", { ascending: false })
        .returns<{ id: string; titulo: string; etapa: EtapaOportunidad; importe_estimado: number }[]>(),
    ]);

  if (!cliente) notFound();
  const esAdmin = usuario.rol === "admin";
  const mensajeError = typeof error === "string" ? ERRORES[error] : undefined;

  const direccion = [
    cliente.direccion,
    [cliente.codigo_postal, cliente.ciudad].filter(Boolean).join(" "),
    cliente.provincia,
    cliente.pais,
  ].filter(Boolean).join(", ");

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/clientes" className="text-sm text-slate-500 hover:underline">← Clientes</Link>
          <h1 className="mt-1 text-2xl font-semibold">{cliente.nombre}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <EtiquetaEstado estado={cliente.estado} />
            <EtiquetaLinea linea={cliente.linea} />
            <span className="text-xs text-slate-500">
              Responsable: {cliente.responsable?.nombre ?? "sin asignar"}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/clientes/${id}/editar`} className="btn-secundario">Editar</Link>
          {esAdmin && (
            <form action={eliminarCliente.bind(null, id)}>
              <BotonConfirmar mensaje={`¿Eliminar a ${cliente.nombre} y todo su histórico? No se puede deshacer.`} className="btn-secundario text-red-700">
                Eliminar
              </BotonConfirmar>
            </form>
          )}
        </div>
      </header>

      {mensajeError && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">{mensajeError}</p>}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <section className="tarjeta space-y-3 text-sm">
            <h2 className="font-semibold">Datos</h2>
            <Dato titulo="Email" valor={cliente.email} enlace={cliente.email ? `mailto:${cliente.email}` : undefined} />
            <Dato titulo="Teléfono" valor={cliente.telefono} enlace={cliente.telefono ? `tel:${cliente.telefono}` : undefined} />
            <Dato titulo="Razón social" valor={cliente.razon_social} />
            <Dato titulo="NIF / CIF" valor={cliente.nif} />
            <Dato titulo="Dirección" valor={direccion} />
            <Dato titulo="Alta" valor={fechaCorta.format(new Date(cliente.created_at))} />
            {cliente.notas && (
              <div>
                <p className="text-xs text-slate-500">Notas</p>
                <p className="whitespace-pre-line">{cliente.notas}</p>
              </div>
            )}
          </section>

          <section className="tarjeta text-sm">
            <h2 className="mb-3 font-semibold">Cambiar estado</h2>
            <form action={cambiarEstadoCliente.bind(null, id)} className="flex gap-2">
              <select name="estado" defaultValue={cliente.estado} className="input">
                {ESTADOS_CLIENTE.map((e) => (
                  <option key={e.valor} value={e.valor}>{e.texto}</option>
                ))}
              </select>
              <button className="btn-secundario">Aplicar</button>
            </form>
          </section>

          <section className="tarjeta text-sm">
            <h2 className="mb-2 font-semibold">Holded</h2>
            <p className="text-slate-500">
              {cliente.holded_contact_id
                ? `Sincronizado (contacto ${cliente.holded_contact_id})`
                : "Aún no sincronizado. La conexión con Holded llega en la Fase 4."}
            </p>
          </section>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <section className="tarjeta">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">Oportunidades</h2>
              <Link href={`/pipeline/nueva?cliente=${id}`} className="btn-secundario">+ Oportunidad</Link>
            </div>
            {(oportunidades ?? []).length === 0 ? (
              <p className="text-sm text-slate-500">Sin oportunidades.</p>
            ) : (
              <ul className="divide-y divide-slate-100 text-sm">
                {oportunidades!.map((o) => (
                  <li key={o.id} className="flex items-center justify-between gap-3 py-2">
                    <Link href={`/pipeline/${o.id}`} className="font-medium text-indigo-700 hover:underline">
                      {o.titulo}
                    </Link>
                    <span className="flex items-center gap-3 text-xs text-slate-500">
                      {textoEtapa(o.etapa)}
                      <span className="tabular-nums">{euros.format(Number(o.importe_estimado))}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="tarjeta">
            <h2 className="mb-3 font-semibold">Histórico de interacciones</h2>
            <FormularioInteraccion accion={anadirInteraccion.bind(null, id)} />
            <ol className="mt-6 space-y-4 border-l border-slate-200 pl-4">
              {(interacciones ?? []).map((i) => (
                <li key={i.id} className="relative text-sm">
                  <span className="absolute top-1.5 -left-[21px] size-2.5 rounded-full bg-indigo-400 ring-4 ring-white" aria-hidden />
                  <div className="flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                    <span className="font-medium text-slate-700">
                      {TIPOS_INTERACCION.find((t) => t.valor === i.tipo)?.texto}
                    </span>
                    <span>{fechaHora.format(new Date(i.fecha))}</span>
                    {i.autor && <span>· {i.autor.nombre}</span>}
                    {(esAdmin || i.autor_id === usuario.id) && (
                      <form action={borrarInteraccion.bind(null, i.id, id)} className="ml-auto">
                        <BotonConfirmar mensaje="¿Borrar esta entrada del histórico?" className="text-slate-400 hover:text-red-600">
                          Borrar
                        </BotonConfirmar>
                      </form>
                    )}
                  </div>
                  <p className="mt-1 whitespace-pre-line">{i.descripcion}</p>
                </li>
              ))}
              {(interacciones ?? []).length === 0 && (
                <li className="text-sm text-slate-500">Todavía no hay nada registrado.</li>
              )}
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}

function Dato({ titulo, valor, enlace }: { titulo: string; valor: string | null; enlace?: string }) {
  if (!valor) return null;
  return (
    <div>
      <p className="text-xs text-slate-500">{titulo}</p>
      {enlace ? <a href={enlace} className="text-indigo-700 hover:underline">{valor}</a> : <p>{valor}</p>}
    </div>
  );
}
