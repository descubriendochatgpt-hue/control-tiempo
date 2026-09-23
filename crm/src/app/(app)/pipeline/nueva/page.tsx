import { getUsuarioActual } from "@/lib/auth";
import { getLineas, getPerfilesActivos } from "@/lib/datos";
import { getClientesParaSelector } from "@/lib/oportunidades";
import { crearOportunidad } from "../actions";
import { FormularioOportunidad } from "../formulario-oportunidad";

export default async function NuevaOportunidadPage({
  searchParams,
}: PageProps<"/pipeline/nueva">) {
  const { cliente } = await searchParams;
  const [usuario, lineas, perfiles, clientes] = await Promise.all([
    getUsuarioActual(),
    getLineas(),
    getPerfilesActivos(),
    getClientesParaSelector(),
  ]);

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">Nueva oportunidad</h1>
      <FormularioOportunidad
        accion={crearOportunidad}
        clientes={clientes}
        lineas={lineas}
        perfiles={perfiles}
        esAdmin={usuario.rol === "admin"}
        usuarioId={usuario.id}
        clienteInicial={typeof cliente === "string" ? cliente : undefined}
      />
    </div>
  );
}
