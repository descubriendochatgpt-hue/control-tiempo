import { ESTADOS_CLIENTE, type EstadoCliente, type LineaNegocio } from "@/lib/tipos";

export function EtiquetaEstado({ estado }: { estado: EstadoCliente }) {
  const e = ESTADOS_CLIENTE.find((x) => x.valor === estado);
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${e?.clase ?? ""}`}
    >
      {e?.texto ?? estado}
    </span>
  );
}

export function EtiquetaLinea({ linea }: { linea?: Pick<LineaNegocio, "nombre" | "color"> | null }) {
  if (!linea) return null;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
      <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: linea.color }} aria-hidden />
      {linea.nombre}
    </span>
  );
}
