import Link from "next/link";
import { notFound } from "next/navigation";
import { getUsuarioActual } from "@/lib/auth";
import { getLineas, getPerfilesActivos } from "@/lib/datos";
import { getClientesParaSelector } from "@/lib/oportunidades";
import { createClient } from "@/lib/supabase/server";
import type { Oportunidad } from "@/lib/tipos";
import { actualizarOportunidad, eliminarOportunidad } from "../actions";
import { FormularioOportunidad } from "../formulario-oportunidad";
import { BotonConfirmar } from "@/components/boton-confirmar";

export default async function EditarOportunidadPage({
  params,
}: PageProps<"/pipeline/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const [usuario, lineas, perfiles, clientes, { data: oportunidad }] =
    await Promise.all([
      getUsuarioActual(),
      getLineas(),
      getPerfilesActivos(),
      getClientesParaSelector(),
      supabase.from("oportunidades").select("*").eq("id", id).maybeSingle<Oportunidad>(),
    ]);
  if (!oportunidad) notFound();

  // Si el cliente está inactivo no sale en el desplegable: lo añadimos
  const lista = clientes.some((c) => c.id === oportunidad.cliente_id)
    ? clientes
    : [...clientes, { id: oportunidad.cliente_id, nombre: "(cliente actual)" }];

  return (
    <div className="max-w-3xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/pipeline" className="text-sm text-slate-500 hover:underline">← Pipeline</Link>
          <h1 className="mt-1 text-2xl font-semibold">{oportunidad.titulo}</h1>
        </div>
        <div className="flex gap-2">
          <Link href={`/clientes/${oportunidad.cliente_id}`} className="btn-secundario">Ver cliente</Link>
          <form action={eliminarOportunidad.bind(null, id)}>
            <BotonConfirmar mensaje="¿Eliminar esta oportunidad?" className="btn-secundario text-red-700">
              Eliminar
            </BotonConfirmar>
          </form>
        </div>
      </header>
      <FormularioOportunidad
        accion={actualizarOportunidad.bind(null, id)}
        clientes={lista}
        lineas={lineas}
        perfiles={perfiles}
        esAdmin={usuario.rol === "admin"}
        usuarioId={usuario.id}
        oportunidad={oportunidad}
      />
    </div>
  );
}
