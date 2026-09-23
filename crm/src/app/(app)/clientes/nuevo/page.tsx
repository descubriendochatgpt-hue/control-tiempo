import { getUsuarioActual } from "@/lib/auth";
import { getLineas, getPerfilesActivos } from "@/lib/datos";
import { crearCliente } from "../actions";
import { FormularioCliente } from "../formulario-cliente";

export default async function NuevoClientePage() {
  const [usuario, lineas, perfiles] = await Promise.all([
    getUsuarioActual(),
    getLineas(),
    getPerfilesActivos(),
  ]);

  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-2xl font-semibold">Nuevo cliente</h1>
      <FormularioCliente
        accion={crearCliente}
        lineas={lineas}
        perfiles={perfiles}
        esAdmin={usuario.rol === "admin"}
        usuarioId={usuario.id}
        volverA="/clientes"
      />
    </div>
  );
}
