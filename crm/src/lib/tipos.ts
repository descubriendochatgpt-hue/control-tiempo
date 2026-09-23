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

export type TipoInteraccion =
  | "nota"
  | "llamada"
  | "email"
  | "reunion"
  | "whatsapp"
  | "otro";

export type Cliente = {
  id: string;
  nombre: string;
  razon_social: string | null;
  nif: string | null;
  email: string | null;
  telefono: string | null;
  direccion: string | null;
  codigo_postal: string | null;
  ciudad: string | null;
  provincia: string | null;
  pais: string;
  linea_negocio_id: number;
  estado: EstadoCliente;
  responsable_id: string | null;
  notas: string | null;
  holded_contact_id: string | null;
  holded_sync_estado: "pendiente" | "sincronizado" | "error";
  created_at: string;
  updated_at: string;
};

export type Interaccion = {
  id: string;
  cliente_id: string;
  autor_id: string | null;
  tipo: TipoInteraccion;
  descripcion: string;
  fecha: string;
};

export type Oportunidad = {
  id: string;
  titulo: string;
  cliente_id: string;
  linea_negocio_id: number;
  etapa: EtapaOportunidad;
  responsable_id: string | null;
  importe_estimado: number;
  fecha_cierre_prevista: string | null;
  motivo_perdida: string | null;
  notas: string | null;
  updated_at: string;
};

export const ESTADOS_CLIENTE: { valor: EstadoCliente; texto: string; clase: string }[] = [
  { valor: "lead", texto: "Lead", clase: "bg-sky-50 text-sky-700 ring-sky-200" },
  { valor: "negociacion", texto: "En negociación", clase: "bg-amber-50 text-amber-700 ring-amber-200" },
  { valor: "activo", texto: "Activo", clase: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  { valor: "inactivo", texto: "Inactivo", clase: "bg-slate-100 text-slate-600 ring-slate-200" },
];

export const ETAPAS: { valor: EtapaOportunidad; texto: string }[] = [
  { valor: "nuevo", texto: "Nuevo" },
  { valor: "contactado", texto: "Contactado" },
  { valor: "propuesta", texto: "Propuesta" },
  { valor: "ganado", texto: "Ganado" },
  { valor: "perdido", texto: "Perdido" },
];

export const TIPOS_INTERACCION: { valor: TipoInteraccion; texto: string }[] = [
  { valor: "nota", texto: "Nota" },
  { valor: "llamada", texto: "Llamada" },
  { valor: "email", texto: "Email" },
  { valor: "reunion", texto: "Reunión" },
  { valor: "whatsapp", texto: "WhatsApp" },
  { valor: "otro", texto: "Otro" },
];

export const textoEstado = (e: EstadoCliente) =>
  ESTADOS_CLIENTE.find((x) => x.valor === e)?.texto ?? e;
export const textoEtapa = (e: EtapaOportunidad) =>
  ETAPAS.find((x) => x.valor === e)?.texto ?? e;
