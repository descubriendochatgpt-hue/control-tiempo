import { notFound } from "next/navigation";
import { getUsuarioActual } from "@/lib/auth";
import { getLineas, getPerfilesActivos } from "@/lib/datos";
import { createClient } from "@/lib/supabase/server";
import type { Cliente } from "@/lib/tipos";
import { actualizarCliente } from "../../actions";
import { FormularioCliente } from "../../formulario-cliente";

export default async function EditarClientePage({
  params,
}: PageProps<"/clientes/[id]/editar">) {
  const { id } = await params;
  const supabase = await createClient();
  const [usuario, lineas, perfiles, { data: cliente }] = await Promise.all([
    getUsuarioActual(),
    getLineas(),
    getPerfilesActivos(),
    supabase.from("clientes").select("*").eq("id", id).maybeSingle<Cliente>(),
  ]);
  if (!cliente) notFound();

  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-2xl font-semibold">Editar · {cliente.nombre}</h1>
      <FormularioCliente
        accion={actualizarCliente.bind(null, id)}
        lineas={lineas}
        perfiles={perfiles}
        esAdmin={usuario.rol === "admin"}
        usuarioId={usuario.id}
        cliente={cliente}
        volverA={`/clientes/${id}`}
      />
    </div>
  );
}
