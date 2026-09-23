import { getUsuarioActual } from "@/lib/auth";
import { ETIQUETA_ROL } from "@/lib/tipos";
import { Menu } from "@/components/menu";
import { cerrarSesion } from "@/app/login/actions";

/**
 * Estructura común de todas las pantallas internas: menú a la izquierda
 * y contenido a la derecha. Si no hay sesión, getUsuarioActual manda a /login.
 */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const usuario = await getUsuarioActual();

  const enlaces = [
    { href: "/", texto: "Panel" },
    { href: "/clientes", texto: "Clientes" },
    { href: "/pipeline", texto: "Pipeline" },
    ...(usuario.rol === "admin"
      ? [{ href: "/usuarios", texto: "Usuarios" }]
      : []),
  ];

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="flex flex-col gap-4 border-b border-slate-200 bg-white p-4 md:w-60 md:border-r md:border-b-0">
        <div>
          <p className="font-semibold">Vertian Solutions</p>
          <p className="text-xs text-slate-500">CRM interno</p>
        </div>
        <Menu enlaces={enlaces} />
        <div className="mt-auto border-t border-slate-100 pt-4 text-sm">
          <p className="truncate font-medium">{usuario.nombre}</p>
          <p className="mb-2 text-xs text-slate-500">{ETIQUETA_ROL[usuario.rol]}</p>
          <form action={cerrarSesion}>
            <button className="btn-secundario w-full">Cerrar sesión</button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
