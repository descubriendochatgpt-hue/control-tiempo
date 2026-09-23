import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ETIQUETA_ROL, type Perfil } from "@/lib/tipos";
import { cambiarActivo, cambiarRol } from "./actions";
import { FormularioAlta } from "./formulario-alta";

export default async function UsuariosPage() {
  const yo = await requireAdmin();
  const supabase = await createClient();
  const { data: usuarios } = await supabase
    .from("perfiles")
    .select("id, email, nombre, rol, activo, created_at")
    .order("activo", { ascending: false })
    .order("nombre")
    .returns<Perfil[]>();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Usuarios</h1>

      <section className="tarjeta">
        <h2 className="mb-4 text-sm font-semibold">Nuevo usuario</h2>
        <FormularioAlta />
      </section>

      <section className="tarjeta overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-xs text-slate-500 uppercase">
            <tr>
              <th className="px-5 py-3 font-medium">Nombre</th>
              <th className="px-5 py-3 font-medium">Email</th>
              <th className="px-5 py-3 font-medium">Rol</th>
              <th className="px-5 py-3 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(usuarios ?? []).map((u) => {
              const soyYo = u.id === yo.id;
              return (
                <tr key={u.id} className={u.activo ? "" : "text-slate-400"}>
                  <td className="px-5 py-3 font-medium">
                    {u.nombre} {soyYo && <span className="text-xs text-slate-400">(tú)</span>}
                  </td>
                  <td className="px-5 py-3">{u.email}</td>
                  <td className="px-5 py-3">
                    {soyYo ? (
                      ETIQUETA_ROL[u.rol]
                    ) : (
                      <form action={cambiarRol.bind(null, u.id)} className="flex gap-2">
                        <select name="rol" defaultValue={u.rol} className="input w-auto py-1">
                          <option value="empleado">Empleado</option>
                          <option value="admin">Admin</option>
                        </select>
                        <button className="btn-secundario">Guardar</button>
                      </form>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    {soyYo ? (
                      "Activo"
                    ) : (
                      <form action={cambiarActivo.bind(null, u.id, !u.activo)}>
                        <button className="btn-secundario">
                          {u.activo ? "Dar de baja" : "Reactivar"}
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}
