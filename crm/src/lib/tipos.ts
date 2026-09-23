// Tipos que reflejan las tablas de la base de datos (supabase/migrations).

export type Rol = "admin" | "empleado";
export type EstadoCliente = "lead" | "negociacion" | "activo" | "inactivo";
export type EtapaOportunidad =
  | "nuevo"
  | "contactado"
  | "propuesta"
  | "ganado"
  | "perdido";

export type Perfil = {
  id: string;
  email: string;
  nombre: string;
  rol: Rol;
  activo: boolean;
  created_at: string;
};

export type LineaNegocio = {
  id: number;
  slug: string;
  nombre: string;
  color: string;
  activa: boolean;
};

export const ETIQUETA_ROL: Record<Rol, string> = {
  admin: "Admin",
  empleado: "Empleado",
};
