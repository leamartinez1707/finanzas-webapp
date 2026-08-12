# Nido — Finanzas compartidas del hogar

**[Nido App](https://finanzas-nido.vercel.app/)**

Una app para parejas, roommates y familias que quieren transparencia sobre la plata compartida sin perder su espacio personal. Creás un hogar, invitás a quienes convivís, y entre todos llevan gastos, objetivos de ahorro y balances. Cada persona además tiene su espacio privado de finanzas.

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
- **Gastos compartidos** — cargá gastos del hogar con categoría, monto, fecha y quién pagó. División en partes iguales entre los miembros activos. Balance del mes: quién le debe a quién.
- **Objetivos de ahorro** — del hogar y personales. Con barra de progreso, historial de aportes y moneda editable por objetivo.
- **Ahorro individual** — cada persona registra depósitos y retiros en su cuenta de ahorro. Transparencia total dentro del hogar.
- **Finanzas personales** — gastos y objetivos privados, separados de cualquier hogar. Funcionan incluso si no pertenecés a ningún hogar.
- **Dashboard** — resumen con balance entre miembros, objetivos activos, ahorro combinado. Cambia según el contexto (hogar o personal).
- **Historial** — línea de tiempo combinada con filtros por tipo, persona, categoría y fecha.
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

**Base de datos:** 10 tablas con tipos, constraints, índices y foreign keys con cascade. Migraciones versionadas en `supabase/migrations/`.

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
│   ├── (auth)/           # Rutas públicas: login, onboarding, invitación
│   │   ├── bienvenida/
│   │   ├── crear-hogar/
│   │   ├── invitacion/[token]/
│   │   └── onboarding/
│   └── (app)/            # Rutas protegidas (requieren sesión)
│       ├── inicio/       # Dashboard
│       ├── gastos/       # Listado + alta de gastos
│       ├── objetivos/    # Objetivos de ahorro + detalle
│       ├── ahorros/      # Cuenta de ahorro individual
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
- **División de gastos 1/N:** la regla más simple y justa. En el roadmap queda la división configurable por porcentaje o por gasto.
- **Multi-moneda sin conversión automática:** cada objetivo y gasto guarda su propia moneda. Los totales se muestran por moneda. La conversión automática es un feature complejo que va para v2.

## Roadmap

- [ ] Conversión automática entre monedas (API de cotizaciones)
- [ ] División de gastos configurable (porcentaje, por persona)
- [ ] Roles y permisos dentro del hogar
- [ ] Notificaciones push
- [ ] Exportar a Excel / PDF
- [ ] Gastos recurrentes automáticos
- [ ] Gráficos de tendencias por categoría

## Sobre mí

Soy **Leandro Martinez**, desarrollador full-stack. Esta app la construí en solitario, desde el modelo de datos hasta el último pixel de la UI — con foco en usabilidad mobile, seguridad y una arquitectura limpia que escale.

Si te interesa charlar sobre el proyecto, colaborar, o querés sumar a alguien con esta forma de trabajar a tu equipo:

- 🌐 [leandromartinez](https://leandromartinez.com.uy)
- 💼 [linkedin.com/in/leamartinez1707](https://linkedin.com/in/leamartinez1707)
- 📧 leandromartinez.dev@gmail.com

---

Licencia: MIT. Sentite libre de forkear, usar y contribuir.
