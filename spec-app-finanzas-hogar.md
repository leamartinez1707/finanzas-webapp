# Brief técnico — App de finanzas de hogar + finanzas personales

## 1. Resumen

App para llevar finanzas en dos niveles:

- **Nivel hogar (compartido):** un usuario crea un "hogar", invita a otras personas a sumarse, y entre todos los miembros llevan gastos compartidos, dividen esos gastos y definen objetivos de ahorro comunes.
- **Nivel personal (privado):** cada usuario, independientemente del hogar, lleva sus propios gastos y objetivos de ahorro personales.

Backend: **Supabase** (Postgres + Auth + Row Level Security). No requiere infraestructura propia.

Moneda: cada hogar tiene una **moneda por defecto**. Los objetivos (de hogar o personales) usan esa moneda por defecto, pero se puede elegir otra moneda distinta para un objetivo puntual.

---

## 2. Usuarios y modelo de cuentas

- Cada persona tiene **una cuenta de usuario** (Supabase Auth: email/password o magic link).
- Un usuario puede **crear uno o más hogares**, y también puede **pertenecer a hogares creados por otros** (aceptando una invitación).
- Un usuario puede pertenecer a **más de un hogar** a la vez (ej. si en el futuro convive con otra persona, o comparte gastos con roommates además de con su pareja). *Asunción a validar: si en su caso de uso real alcanza con un solo hogar por usuario, se puede simplificar y sacar el multi-hogar del alcance.*
- Dentro de un hogar, todos los miembros son simétricos (no hay roles de "admin" en v1 más allá de quién lo creó).
- Las finanzas **personales** (gastos y objetivos propios) no dependen de pertenecer a un hogar: existen aunque el usuario no esté en ninguno.

---

## 3. Alcance de la v1 (MVP)

1. Autenticación de usuarios (Supabase Auth)
2. Crear hogar + configurar moneda por defecto
3. Invitar personas a un hogar (por email) y aceptar/rechazar invitación
4. Gastos compartidos del hogar, con división entre sus miembros
5. Objetivos de ahorro del hogar (moneda por defecto o elegida aparte)
6. Gastos personales (privados, fuera del hogar)
7. Objetivos de ahorro personales (moneda propia o elegida aparte)
8. Ahorro total de cada persona (visible para el resto del hogar)
9. Dashboard / resumen (hogar + personal)
10. Historial y trazabilidad completa

Fuera de alcance v1: notificaciones push, exportar a Excel/PDF, conversión automática entre monedas (ver sección 9), gastos recurrentes automáticos, roles/permisos avanzados dentro de un hogar.

---

## 4. Modelo de datos (orientado a tablas de Supabase/Postgres)

### 4.1 `users`
Gestionada por Supabase Auth. Extender con tabla `profiles`:
| Campo | Tipo | Descripción |
|---|---|---|
| id | uuid (FK a auth.users) | — |
| nombre | text | nombre visible |
| color | text (hex) | color identificador en la UI |
| creado_en | timestamp | — |

### 4.2 `households` (hogares)
| Campo | Tipo | Descripción |
|---|---|---|
| id | uuid | — |
| nombre | text | ej. "Casa de Juan y Ana" |
| moneda_default | text | código ISO, ej. "UYU" |
| creado_por | uuid (FK users) | — |
| creado_en | timestamp | — |

### 4.3 `household_members`
| Campo | Tipo | Descripción |
|---|---|---|
| household_id | uuid (FK households) | — |
| user_id | uuid (FK users) | — |
| fecha_ingreso | timestamp | — |
| activo | boolean | permite "salir" del hogar sin borrar historial |

### 4.4 `household_invites`
| Campo | Tipo | Descripción |
|---|---|---|
| id | uuid | — |
| household_id | uuid (FK households) | — |
| email_invitado | text | — |
| invitado_por | uuid (FK users) | — |
| estado | enum | pendiente, aceptada, rechazada, expirada |
| token | text | para el link de invitación |
| creado_en | timestamp | — |
| expira_en | timestamp | — |

### 4.5 `expenses` (gastos — con `household_id` nulo si son personales)
| Campo | Tipo | Descripción |
|---|---|---|
| id | uuid | — |
| household_id | uuid nullable | si es null → gasto personal |
| user_id | uuid (FK users) | quién lo cargó / quién pagó |
| monto | numeric | — |
| moneda | text | hereda la del hogar si aplica, o la del usuario si es personal |
| descripcion | text | — |
| categoria | enum | Vivienda, Comida, Servicios, Transporte, Ocio, Salud, Otros |
| fecha | date | — |
| notas | text nullable | — |
| creado_en | timestamp | — |

### 4.6 `goals` (objetivos — con `household_id` nulo si son personales)
| Campo | Tipo | Descripción |
|---|---|---|
| id | uuid | — |
| household_id | uuid nullable | si es null → objetivo personal |
| user_id | uuid nullable | dueño si es objetivo personal (null si es de hogar) |
| nombre | text | — |
| moneda | text | por defecto la del hogar/usuario, editable por objetivo |
| monto_objetivo | numeric | meta |
| monto_ahorrado | numeric | acumulado |
| fecha_limite | date nullable | — |
| estado | enum | activo, cumplido, pausado |
| creado_en | timestamp | — |

### 4.7 `goal_contributions` (aportes a un objetivo — trazabilidad)
| Campo | Tipo | Descripción |
|---|---|---|
| id | uuid | — |
| goal_id | uuid (FK goals) | — |
| user_id | uuid (FK users) | quién aportó |
| monto | numeric | — |
| fecha | date | — |

### 4.8 `savings_accounts` (ahorro total de cada persona)
| Campo | Tipo | Descripción |
|---|---|---|
| user_id | uuid (FK users) | — |
| monto_actual | numeric | saldo |
| moneda | text | — |

### 4.9 `savings_movements`
| Campo | Tipo | Descripción |
|---|---|---|
| id | uuid | — |
| user_id | uuid (FK users) | — |
| tipo | enum | deposito, retiro |
| monto | numeric | — |
| fecha | date | — |
| nota | text nullable | — |

### 4.10 Seguridad (Row Level Security)
- `expenses`/`goals` con `household_id` no nulo: visibles solo para `user_id` en `household_members` activos de ese hogar.
- `expenses`/`goals` con `household_id` nulo (personales): visibles solo para su propio `user_id`.
- `savings_accounts`/`savings_movements`: visibles para el propio usuario **y** para los miembros de cualquier hogar que comparta con él (si se mantiene la transparencia total definida en la v1 anterior — a confirmar si aplica igual ahora que puede haber más de 2 personas por hogar).

---

## 5. Funcionalidades detalladas

### 5.1 Autenticación y perfil
- Registro/login con Supabase Auth.
- Completar nombre y color al primer ingreso.

### 5.2 Crear y gestionar un hogar
- Crear hogar: nombre + moneda por defecto (selector de monedas comunes, ej. UYU, USD, ARS, EUR).
- Ver miembros actuales del hogar.
- Invitar por email: genera invitación pendiente y (idealmente) dispara un email con link.
- Aceptar/rechazar invitación (si el invitado ya tiene cuenta, se suma directo; si no, primero crea cuenta y luego se une).
- Salir de un hogar (no borra el historial de gastos ya cargados, solo deja de ver nuevos movimientos).
- Si el usuario pertenece a más de un hogar: selector para cambiar de hogar activo.

### 5.3 Gastos del hogar
- Igual que en la v1 anterior (alta, edición, categorías, filtros, listado cronológico).
- **División del gasto entre miembros:** con N miembros posibles (no solo 2), definir la regla — ver sección 6.
- Balance por miembro: cuánto pagó cada uno vs. cuánto le correspondía, saldo neto (a favor o en contra) por persona.

### 5.4 Objetivos del hogar
- Igual que la v1 anterior: nombre, meta, aportes, progreso.
- Moneda del objetivo: por defecto la del hogar, con opción de elegir otra al crearlo (ej. un objetivo en USD dentro de un hogar que lleva sus gastos en UYU).
- Cualquier miembro del hogar puede aportar.

### 5.5 Finanzas personales
- Sección separada, no ligada a ningún hogar.
- Gastos personales: mismo modelo que los de hogar (monto, categoría, fecha, descripción), pero privados.
- Objetivos personales: mismo modelo que los de hogar, con moneda propia editable.
- Sirve tanto para quien no tiene hogar armado como para gastos que un miembro del hogar no quiere compartir (ej. regalos, gastos propios).

### 5.6 Ahorro total por persona
- Igual que v1 anterior: saldo y movimientos (depósitos/retiros) por usuario.
- Visible para los demás miembros de sus hogares (transparencia — a confirmar, ver 4.10).

### 5.7 Dashboard / resumen
- Con selector de contexto: "Hogar [nombre]" vs. "Personal".
- Vista hogar: balance del mes entre miembros, objetivos activos del hogar, ahorro combinado del hogar.
- Vista personal: gastos del mes, objetivos personales activos, ahorro propio.

### 5.8 Historial y trazabilidad
- Línea de tiempo combinada, filtrable por: hogar/personal, tipo de movimiento, persona, categoría, rango de fechas.

---

## 6. Reglas de negocio clave (actualizadas)

1. **División de gastos del hogar:** *(definir explícitamente antes de programar — no quedó cerrado en la conversación)*. Opciones:
   - (a) Partes iguales entre los miembros activos del hogar al momento del gasto (generaliza el 50/50 a 1/N).
   - (b) Split configurable por gasto (elegir a quién se le carga cada gasto puntual).
   - (c) Porcentajes fijos por miembro (ej. según ingresos), configurables en el hogar.
   
   *Recomendación: arrancar con (a) por ser la más simple y fiel a la idea original de "dividir los gastos de la casa", dejando (b)/(c) para el roadmap.*
2. **Moneda de los objetivos:** se hereda la moneda del hogar (o la del usuario, si es personal) al crear el objetivo, pero es editable en ese momento o después. No hay conversión automática entre monedas: cada objetivo guarda su propio saldo en su propia moneda.
3. **Sin conversión automática entre monedas:** si un hogar tiene gastos en UYU y un objetivo en USD, la app **no sabe el tipo de cambio** salvo que se lo carguen manualmente o se integre una fuente de cotización (fuera del alcance v1). Los totales combinados de un hogar deben calcularse solo dentro de la misma moneda.
4. **Transparencia dentro del hogar:** todos los miembros activos ven los gastos y objetivos del hogar. Las finanzas personales son privadas por defecto.
5. **Invitaciones:** una invitación pendiente no da acceso a los datos del hogar hasta ser aceptada. Expiran a los N días (definir N, ej. 7).
6. **Salir de un hogar:** no borra gastos históricos ya cargados por esa persona (quedan como parte del historial del hogar), pero deja de tener acceso a movimientos nuevos.
7. **Montos siempre positivos**; el tipo de movimiento define el signo en los cálculos.

---

## 7. Pantallas (navegación)

1. **Selector de contexto** (arriba de todo): Hogar activo ⇄ Personal.
2. **Inicio** — dashboard según contexto activo.
3. **Gastos** — listado + alta + filtros (de hogar o personales, según contexto).
4. **Objetivos** — objetivos de hogar o personales, según contexto.
5. **Ahorros** — ahorro individual (siempre visible, no depende del contexto).
6. **Hogar (ajustes)** — miembros, invitar gente, moneda del hogar, salir del hogar, crear otro hogar.
7. **Historial** — línea de tiempo combinada con filtros.

---

## 8. Requisitos no funcionales

- **Backend:** Supabase (Postgres + Auth + Realtime opcional para que los cambios se vean casi en el momento entre miembros del hogar).
- **Seguridad:** Row Level Security en todas las tablas (ver 4.10) — nadie debe poder leer datos de un hogar al que no pertenece, ni finanzas personales ajenas.
- **Invitaciones por email:** requiere configurar envío de mail (Supabase tiene soporte básico, o integrar un proveedor como Resend/SendGrid).
- **Multi-hogar:** si se mantiene en el alcance, la UI necesita un selector claro de "en qué hogar estoy parado" en todo momento.
- **Multi-moneda:** sin conversión automática en v1 (ver regla de negocio 3) — la UI debe mostrar claramente en qué moneda está cada monto para no generar confusión.
- **Responsive:** uso principal en celular.
- **Persistencia:** todo se guarda en Supabase, sin pérdida de datos al cambiar de dispositivo (a diferencia de la versión anterior, ahora el login resuelve la sincronización).

---

## 9. Casos borde a contemplar

- Un usuario tiene objetivos/gastos personales *antes* de unirse a cualquier hogar → deben seguir existiendo igual después.
- Un hogar con 3+ miembros: confirmar la regla de división (ver 6.1) antes de programar el cálculo de balance.
- Alguien deja el hogar en medio de un mes con gastos ya cargados → cómo se recalcula el balance de ese mes.
- Invitación aceptada por alguien que ya pertenece a otro hogar → debe poder estar en ambos (si se mantiene multi-hogar) o elegir cuál dejar (si no).
- Objetivo creado en una moneda distinta a la del hogar → dejar claro en la UI que no se suma al total combinado del hogar sin conversión.
- Invitación a un email que no tiene cuenta todavía → flujo de "creá tu cuenta y quedás sumado automáticamente".
- Cambiar la moneda por defecto de un hogar después de tener gastos cargados en la moneda anterior → los gastos viejos no deberían "convertirse" solos.

---

## 10. Roadmap futuro (fuera de v1)

- Conversión automática entre monedas (integrar API de cotizaciones).
- División de gastos configurable (proporcional, por gasto, por porcentaje).
- Roles/permisos dentro de un hogar (ej. solo el creador puede invitar/expulsar).
- Notificaciones (invitaciones, recordatorios de carga de gastos).
- Exportar historial a Excel/PDF.
- Gastos recurrentes automáticos.
- Gráficos de tendencias por categoría y por hogar/personal.

---

## 11. Historias de usuario

1. Como usuario nuevo, quiero crear un hogar y elegir su moneda para empezar a cargar gastos compartidos.
2. Como creador de un hogar, quiero invitar a mi pareja por email para que se sume y veamos los mismos datos.
3. Como invitado, quiero aceptar una invitación y automáticamente ver los gastos y objetivos del hogar.
4. Como miembro de un hogar, quiero cargar un gasto personal que no quiero compartir con el resto.
5. Como miembro de un hogar, quiero crear un objetivo de ahorro personal en una moneda distinta a la del hogar (ej. ahorrar en USD).
6. Como miembro de un hogar, quiero ver cuánto le debo o me deben mis compañeros de hogar este mes.
7. Como usuario, quiero ver mi ahorro total y el de mis compañeros de hogar en un solo lugar.

---

## 12. Puntos abiertos que conviene cerrar antes de programar

- **Regla de división de gastos** con más de 2 personas en un hogar (ver sección 6.1) — es la decisión de negocio más importante que falta cerrar.
- **¿Un usuario puede estar en más de un hogar a la vez, o solo en uno?** Cambia bastante el modelo de datos y la UI si se simplifica a "uno solo".
- **¿Se mantiene la transparencia total del ahorro individual** ahora que un hogar puede tener más de 2 personas, o convendría que cada quien elija qué mostrar?
