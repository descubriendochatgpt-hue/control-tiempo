# CRM interno · Vertian Solutions

CRM para las tres líneas de negocio de Vertian (afiliados, certificaciones
energéticas, IA/SaaS). La facturación y la contabilidad se delegan en
**Holded** a través de su API.

**Tecnología:** Next.js (web + servidor en un solo proyecto) · Supabase (base de
datos y usuarios) · Vercel (publicación). Todo tiene plan gratuito.

---

## Estado por fases

| Fase | Qué incluye | Estado |
|------|-------------|--------|
| 1 | Estructura del proyecto y esquema de base de datos | ✅ Hecha |
| 2 | Inicio de sesión, roles admin/empleado, gestión de usuarios, panel básico | ✅ Hecha |
| 3 | Clientes (ficha, filtros, interacciones) y pipeline kanban | ✅ Hecha |
| 4 | Holded: sincronizar contactos y generar/consultar facturas | ⏳ Pendiente |

---

## Estructura de carpetas

```
crm/
├── supabase/
│   ├── migrations/0001_esquema_inicial.sql  ← crea todas las tablas y permisos
│   └── crear_primer_admin.sql               ← te convierte en admin (una vez)
├── src/
│   ├── proxy.ts                ← "portero": sin sesión → a /login
│   ├── lib/
│   │   ├── auth.ts             ← quién es el usuario y qué rol tiene
│   │   ├── tipos.ts            ← descripción de los datos (cliente, rol…)
│   │   └── supabase/           ← conexión con Supabase (normal y "admin")
│   ├── components/             ← piezas visuales reutilizables (menú…)
│   └── app/                    ← cada carpeta = una pantalla (URL)
│       ├── login/              ← /login
│       └── (app)/              ← zona privada (requiere sesión)
│           ├── layout.tsx      ← menú lateral común
│           ├── page.tsx        ← /          Panel
│           ├── clientes/       ← /clientes, /clientes/nuevo, /clientes/[id] (ficha)
│           ├── pipeline/       ← /pipeline (kanban), /pipeline/nueva, /pipeline/[id]
│           └── usuarios/       ← /usuarios  (solo admin)
│   (Fase 4 añadirá src/lib/holded/ con la conexión a Holded)
└── .env.example                ← plantilla de claves secretas
```

## Esquema de base de datos

```
lineas_negocio ─┬─< clientes >── perfiles (responsable)
                │      ├─< interacciones      (histórico: llamadas, notas…)
                │      ├─< oportunidades      (pipeline kanban)
                │      ├─< conceptos_cliente  (qué se le va a facturar)
                │      └─< facturas ─< factura_lineas
                └─< servicios (catálogo de conceptos por línea)
```

- **perfiles**: un registro por usuario (nombre, rol `admin`/`empleado`, activo).
- **clientes**: datos de contacto y fiscales, línea de negocio, estado
  (`lead`, `negociacion`, `activo`, `inactivo`), responsable, notas y los
  campos de Holded (`holded_contact_id`, estado de sincronización).
- **oportunidades**: etapa (`nuevo → contactado → propuesta → ganado/perdido`),
  importe estimado, responsable.
- **facturas**: guarda `holded_invoice_id`, número y estado (pagada, pendiente…).
  La factura "de verdad" vive en Holded; el CRM solo guarda la referencia.

**Permisos (los aplica la propia base de datos):** el admin ve todo; un
empleado solo ve los clientes y oportunidades de los que es responsable; un
usuario dado de baja no ve nada y no puede entrar.

---

## Cómo funciona (Fase 3)

- **Clientes**: listado con buscador y filtros por línea, estado y responsable
  (los filtros quedan en la dirección de la página, puedes guardarla en
  favoritos). En la ficha: datos, cambio rápido de estado, oportunidades del
  cliente e histórico de interacciones (llamadas, emails, reuniones…).
- **Pipeline**: tablero con 5 columnas. Arrastra una tarjeta para cambiar de
  etapa (en el móvil, usa el desplegable de la tarjeta). Al pasar a "Perdido"
  pregunta el motivo.
- **Todo cambio de estado o etapa queda anotado solo** en el histórico del cliente.
- **Facturación estimada** del panel = suma de las oportunidades abiertas
  (nuevo, contactado, propuesta). En la Fase 4 se añadirá lo facturado real.
- Un empleado siempre es el responsable de lo que crea; solo el admin puede
  reasignar clientes y oportunidades, y solo el admin puede eliminar clientes.

---

## Puesta en marcha

### 1. Supabase
1. Crea una cuenta en <https://supabase.com> y un proyecto nuevo
   (región: *West EU (Ireland)* o *Central EU (Frankfurt)*). Guarda la
   contraseña de la base de datos en un lugar seguro.
2. Menú **SQL Editor → New query**: pega el contenido de
   `supabase/migrations/0001_esquema_inicial.sql` y pulsa **Run**.
3. **Authentication → Sign In / Providers**: desactiva *Allow new users to
   sign up* (las altas se hacen solo desde el CRM).
4. **Authentication → Users → Add user → Create new user**: tu email y una
   contraseña, marcando *Auto Confirm User*.
5. En el **SQL Editor**, ejecuta `supabase/crear_primer_admin.sql` cambiando
   el email por el tuyo.
6. **Project Settings → API Keys**: copia la *Project URL*, la
   *Publishable key* y la *Secret key*.

### 2. Vercel
1. Crea una cuenta en <https://vercel.com> entrando con GitHub.
2. **Add New → Project** → elige el repositorio `control-tiempo`.
3. En **Root Directory** selecciona la carpeta `crm`.
4. En **Environment Variables** añade las tres de `.env.example` con los
   valores de Supabase.
5. **Deploy**. Cada vez que se suban cambios a GitHub, Vercel publica solo.

### (Opcional) Probarlo en tu ordenador
Necesitas [Node.js](https://nodejs.org) 20 o superior.
```bash
cd crm
cp .env.example .env.local   # y rellena los valores
npm install
npm run dev                  # abre http://localhost:3000
```
