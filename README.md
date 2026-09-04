# Nido — Finanzas y organización del hogar

**[Nido App](https://finanzas-nido.vercel.app/)**

Una app para parejas, roommates y familias que quieren transparencia sobre la plata compartida sin perder su espacio personal, y una forma simple de repartirse las tareas de la casa. Creás un hogar, invitás a quienes convivís, y entre todos llevan gastos, objetivos de ahorro, balances y tareas. Cada persona además tiene su espacio privado de finanzas y sus propios pendientes.

Mobile-first, pensada para sesiones rápidas: cargar un gasto en 10 segundos, chequear quién debe qué, ver cuánto falta para ese objetivo.

---

## Stack

| Capa | Tecnología |
|---|---|
| Framework | [Next.js 16](https://nextjs.org/) (App Router) |
| Lenguaje | TypeScript |
| Estilos | [Tailwind CSS v4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) |
| Backend | [Supabase](https://supabase.com/) (Postgres + Auth + Row Level Security) |
| Emails | [Resend](https://resend.com/) |
| Hosting | [Vercel](https://vercel.com/) |
| PWA | Manifest + service worker, instalable en iOS/Android |
| Package manager | pnpm |

## Funcionalidades

- **Autenticación** — registro y login con email/password vía Supabase Auth. Perfil con nombre y color personalizado.
- **Multi-hogar** — creá uno o varios hogares, cada uno con su moneda por defecto. Selector de contexto siempre visible para cambiar entre hogares y vista personal.
- **Invitaciones** — invitá por email a otras personas. Reciben un link de Resend, aceptan y quedan dentro del hogar.
- **Gastos compartidos** — cargá gastos del hogar con categoría, monto, fecha y quién pagó. División configurable: partes iguales por defecto, un % fijo por hogar, o un ajuste manual gasto por gasto. Balance del mes: quién le debe a quién, con el mínimo de pagos posible.
- **Gastos recurrentes** — armá una plantilla (alquiler, Internet, gimnasio) y Nido genera el gasto solo cada mes, en el día que definas.
- **Presupuestos** — poné un tope mensual por categoría. Un indicador visual avisa cuando te acercás (80%) o superás el límite.
- **Objetivos de ahorro** — del hogar y personales. Con barra de progreso, historial de aportes y moneda editable por objetivo.
- **Ingresos** — cada persona registra los ingresos y retiros con los que paga sus gastos del mes.
- **Ahorros** — plata apartada, separada de los ingresos. Se puede transferir directo desde Ingresos en un solo paso.
- **Tareas** — agenda de tareas del hogar (o personales): descripción, quién la tiene que hacer, fecha límite y hora opcional. Se completan al toque, agrupadas en Atrasadas / Hoy / Futuras.
- **Finanzas personales** — gastos y objetivos privados, separados de cualquier hogar. Funcionan incluso si no pertenecés a ningún hogar.
- **Dashboard** — resumen con balance entre miembros, objetivos activos, ahorro combinado. Cambia según el contexto (hogar o personal).
- **Resumen** — total del mes con variación contra el anterior, desglose por categoría y por persona, y exportación a CSV.
- **Tendencia** — gráfico de barras con el total gastado en cada uno de los últimos 6 meses (hasta el mes seleccionado), dentro de Resumen.
- **Historial** — línea de tiempo combinada con filtros por tipo, persona, categoría y fecha.
- **Novedades** — blog público con las funcionalidades nuevas a medida que se suman.
- **PWA** — se instala como app nativa en el celular. Funciona offline para consultas, online para escritura.

## Arquitectura

```
┌─────────────────────────────┐
│         Navegador            │
│  ┌───────────────────────┐  │
│  │   React 19 + Next.js  │  │
│  │   Context API (store) │  │
│  └──────────┬────────────┘  │
│             │                │
│     @supabase/ssr            │
│     ┌───────▼────────┐      │
│     │   Supabase      │      │
│     │  ┌────────────┐ │      │
│     │  │ Auth        │ │      │
│     │  │ Postgres    │ │      │
│     │  │ RLS         │ │      │
│     │  └────────────┘ │      │
│     └────────────────┘      │
└─────────────────────────────┘
```

**Seguridad por diseño:** Row Level Security en todas las tablas. Un usuario solo ve los datos de los hogares a los que pertenece y sus propias finanzas personales. Las invitaciones no dan acceso hasta ser aceptadas.

**Estado:** React Context con un único `AppProvider`. Carga inicial de todos los datos del usuario (hogares, miembros, gastos, objetivos, ahorros). Mutaciones optimistas con rollback implícito vía Supabase.

**Base de datos:** 12 tablas con tipos, constraints, índices y foreign keys con cascade. Migraciones versionadas en `supabase/migrations/`.

## Levantar el proyecto

### Requisitos

- Node.js 20+
- pnpm
- Una cuenta de [Supabase](https://supabase.com/) (free tier alcanza)
- Una cuenta de [Resend](https://resend.com/) (free tier alcanza para desarrollo)

### Setup

```bash
# Clonar
git clone https://github.com/leamartinez1707/finanzas-webapp.git
cd finanzas-compartidas

# Instalar dependencias
pnpm install

# Variables de entorno — creá un .env.local con:
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=<tu-url-de-supabase>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<tu-publishable-key>
SUPABASE_SERVICE_ROLE_KEY=<tu-service-role-key>
RESEND_API_KEY=<tu-api-key-de-resend>
RESEND_FROM=Nido <invitacion@tudominio.com>

# Correr migraciones (ejecutá el SQL en el dashboard de Supabase o vía CLI)
# El archivo está en supabase/migrations/001_schema.sql

# Dev
pnpm dev
# Abrí http://localhost:3000
```

### Migraciones

La migración inicial (`001_schema.sql`) crea todas las tablas, tipos enum, índices y políticas RLS. Ejecutala desde el SQL Editor de Supabase o con `supabase db push`.

## Estructura del proyecto

```
finanzas-compartidas/
├── app/
│   ├── novedades/        # Blog público de funcionalidades nuevas
│   ├── (auth)/           # Rutas públicas: login, onboarding, invitación
│   │   ├── bienvenida/
│   │   ├── crear-hogar/
│   │   ├── ingresar/
│   │   ├── invitacion/[token]/
│   │   └── onboarding/
│   └── (app)/            # Rutas protegidas (requieren sesión)
│       ├── inicio/       # Dashboard
│       ├── gastos/       # Listado + alta de gastos, recurrentes y presupuestos
│       ├── objetivos/    # Objetivos de ahorro + detalle
│       ├── tareas/       # Agenda de tareas del hogar y personales
│       ├── ingresos/     # Ingresos y retiros con los que se pagan los gastos
│       ├── ahorros/      # Plata apartada, separada de los ingresos
│       ├── resumen/      # Totales, por categoría, por persona, export CSV
│       ├── ajustes/      # Ajustes del hogar, miembros, invitaciones
│       └── historial/    # Línea de tiempo con filtros
├── components/           # Componentes reutilizables (22)
│   ├── ui/               # Primitivas (botón, etc.)
│   ├── app-header.tsx    # Header con context switcher
│   ├── bottom-nav.tsx    # Navegación inferior
│   ├── balance-card.tsx  # Balance entre miembros
│   ├── expense-form.tsx  # Formulario de gasto
│   ├── goal-card.tsx     # Tarjeta de objetivo
│   └── ...               # auth-guard, person-avatar, money, etc.
├── lib/
│   ├── store.tsx         # Estado global (Context API)
│   ├── types.ts          # Tipos compartidos
│   ├── categories.ts     # Categorías, monedas, colores
│   ├── balance.ts        # Cálculos de balance
│   ├── format.ts         # Formateo de montos y fechas
│   └── supabase/
│       ├── client.ts     # Cliente browser
│       ├── middleware.ts # Middleware del servidor
│       ├── server.ts     # Cliente server-side
│       └── queries.ts    # Todas las queries a la DB
├── supabase/
│   └── migrations/       # Migraciones SQL
├── public/               # Íconos PWA, manifest
└── scripts/              # Utilidades
```

## Decisiones técnicas

- **App Router con Route Groups:** `(auth)` para flujo público, `(app)` para lo autenticado. Separación limpia de layouts y guards.
- **Sin server components pesados:** la app depende del cliente de Supabase para datos en tiempo real. Los server components se usan solo para metadata y SEO.
- **Context API sobre Zustand/Redux:** el estado es simple (datos de un solo usuario + sus hogares). No justifica una librería externa.
- **RLS como única capa de autorización:** no hay lógica de permisos en el frontend. Si Supabase no te devuelve una fila, no la ves. Punto.
- **División de gastos configurable:** 1/N por defecto (la regla más simple y justa), con un % fijo opcional por hogar (`households.default_split`) que se congela en cada gasto al crearlo (`splitSnapshot`), y un override manual por gasto individual (`shares`). Los gastos viejos nunca cambian de balance porque no releen la config actual del hogar.
- **Multi-moneda sin conversión automática:** cada objetivo y gasto guarda su propia moneda. Los totales se muestran por moneda. La conversión automática es un feature complejo que va para v2.

## Roadmap

- [ ] Conversión automática entre monedas (API de cotizaciones)
- [ ] Roles y permisos dentro del hogar
- [ ] Notificaciones push
- [ ] Exportar a Excel / PDF (hoy: CSV desde Resumen)
- [ ] Gráficos de tendencia por categoría a lo largo de varios meses (hoy la tendencia es solo del total, no discriminada por categoría)

## Sobre mí

Soy **Leandro Martinez**, desarrollador full-stack. Esta app la construí en solitario, desde el modelo de datos hasta el último pixel de la UI — con foco en usabilidad mobile, seguridad y una arquitectura limpia que escale.

Si te interesa charlar sobre el proyecto, colaborar, o querés sumar a alguien con esta forma de trabajar a tu equipo:

- 🌐 [leandromartinez](https://leandromartinez.com.uy)
- 💼 [linkedin.com/in/leamartinez1707](https://linkedin.com/in/leamartinez1707)
- 📧 leandromartinez.dev@gmail.com

---

Licencia: MIT. Sentite libre de forkear, usar y contribuir.
