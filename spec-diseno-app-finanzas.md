# Brief de diseño — App de finanzas de hogar + personales

## 1. Qué es la app, en una frase

Una app donde una persona crea un "hogar", invita a otras (pareja, roommates), y entre todos llevan los gastos compartidos de la casa, definen objetivos de ahorro en común, y además cada uno lleva por separado sus propios gastos y objetivos personales.

## 2. Quién la usa

Personas en pareja o conviviendo, que quieren transparencia sobre la plata compartida sin perder su espacio de finanzas personales. Uso principal: **celular**, sesiones cortas y frecuentes (cargar un gasto en el momento, chequear el balance cada tanto). Pensar mobile-first; desktop es secundario.

## 3. Lo que la app tiene que resolver, para el usuario

- "¿Cuánto gastamos este mes en la casa y quién le debe a quién?"
- "Quiero anotar este gasto ya, en menos de 10 segundos."
- "¿Cuánto llevamos ahorrado para el objetivo X?"
- "¿Cuánta plata tengo yo guardada, y cuánta mi pareja/roommate?"
- "Quiero anotar un gasto mío que no tiene nada que ver con la casa."
- "¿En qué se nos fue la plata el mes pasado?"

## 4. Estructura general / navegación

Barra de navegación inferior (mobile) con estas secciones:

1. **Inicio** — resumen/dashboard
2. **Gastos**
3. **Objetivos**
4. **Ahorros**
5. **Historial**

Arriba de todo, siempre visible, un **selector de contexto**: en qué "hogar" está parado el usuario, o si está viendo su vista **Personal**. Esto es clave — casi todas las pantallas cambian de contenido según el contexto elegido (Hogar A / Hogar B / Personal), así que el selector tiene que sentirse siempre presente y fácil de cambiar, no escondido en un menú.

Acceso a "Ajustes del hogar" (miembros, invitar gente, moneda) desde un ícono, no ocupa un tab propio.

## 5. Pantallas a diseñar

### 5.1 Onboarding / Login
- Pantalla de login o registro (email/password o link mágico — el diseño debe contemplar ambos, la elección final es técnica).
- Primer ingreso: pedir nombre y elegir un color identificatorio (se usa después para diferenciar a cada persona en gastos y gráficos).
- Pantalla de "no tenés ningún hogar todavía" con dos caminos igual de visibles: **crear un hogar** o **unirte con una invitación**.

### 5.2 Crear hogar
- Formulario simple: nombre del hogar + selector de moneda por defecto (UYU, USD, ARS, EUR — dejar espacio para más).
- Confirmación / siguiente paso natural: invitar gente (puede saltearse).

### 5.3 Invitar personas
- Input de email + botón invitar.
- Lista de invitaciones pendientes (con estado: pendiente, y opción de reenviar o cancelar).
- Lista de miembros actuales del hogar (nombre, color, fecha en que se sumó).

### 5.4 Aceptar invitación
- Pantalla que ve alguien que clickeó un link de invitación: nombre del hogar, quién invita, botón aceptar/rechazar. Si no tiene cuenta, primero pasa por registro y vuelve acá.

### 5.5 Inicio (dashboard)
Contenido según contexto:

**Vista Hogar:**
- Balance del mes: cuánto puso cada miembro, y quién le debe a quién (esto es lo más importante de toda la pantalla — tiene que ser lo primero que se entienda, sin tener que interpretar números).
- Objetivos activos del hogar, con barra de progreso.
- Ahorro combinado del hogar (suma del ahorro de todos los miembros).
- Accesos rápidos: cargar gasto, aportar a un objetivo.

**Vista Personal:**
- Gastos del mes.
- Objetivos personales activos con progreso.
- Ahorro propio.
- Acceso rápido: cargar gasto personal.

### 5.6 Gastos (listado)
- Lista cronológica agrupada por mes.
- Cada fila: descripción, categoría (con algún ícono/color por categoría), monto, quién pagó (avatar/color), fecha.
- Filtros: por categoría, por persona, por rango de fechas.
- Botón de agregar gasto bien visible (flotante o fijo).
- Estado vacío: primera vez que entra sin gastos cargados — invitar a cargar el primero.

### 5.7 Agregar / editar gasto
- Formulario: monto (protagonista, teclado numérico), descripción, categoría (selector visual), fecha (hoy por defecto), quién pagó (si es de hogar, elegir entre miembros; si es personal, no aplica).
- Tiene que poder completarse muy rápido — pensar en minimizar taps.

### 5.8 Objetivos (listado)
- Tarjetas por objetivo: nombre, barra de progreso, monto ahorrado / meta, moneda, fecha límite si tiene.
- Distinguir visualmente objetivos de hogar vs. personales si conviven en la misma vista, o separarlos por el selector de contexto (a definir con el diseñador cuál se entiende mejor).
- Botón "crear objetivo".

### 5.9 Detalle de un objetivo
- Progreso grande y claro.
- Historial de aportes (quién aportó, cuánto, cuándo).
- Botón para aportar.
- Selector de moneda visible si el objetivo tiene una moneda distinta a la del hogar (esto hay que dejarlo muy claro para que no genere confusión con los totales).

### 5.10 Ahorros
- Saldo actual de cada persona (propio y, si aplica, el de compañeros de hogar — transparencia total dentro del hogar).
- Botón para registrar depósito o retiro.
- Historial de movimientos.

### 5.11 Historial general
- Línea de tiempo combinada: gastos, aportes a objetivos, depósitos/retiros de ahorro.
- Filtros por tipo de movimiento, persona, categoría, fecha.
- Es la pantalla "densa" de la app — tiene que poder escanearse rápido aunque haya mucha información.

### 5.12 Ajustes del hogar
- Nombre y moneda del hogar (moneda editable con advertencia de que no convierte gastos viejos).
- Lista de miembros, invitar, y opción de "salir del hogar".
- Si el usuario tiene más de un hogar: acceso para crear otro o cambiar entre ellos.

## 6. Estados que hay que diseñar (no solo la pantalla "llena")

- **Vacío:** primera vez sin gastos/objetivos/ahorros cargados — cada uno necesita su propio mensaje invitando a la acción, no un genérico "no hay datos".
- **Cargando.**
- **Error** (ej. falla al guardar un gasto, invitación inválida o expirada).
- **Invitación pendiente vs. aceptada vs. expirada** (en la lista de miembros).
- **Balance en cero** (nadie le debe a nadie — es un estado bueno, debería sentirse como un logro, no como una pantalla vacía).

## 7. Cosas a tener en cuenta para el diseño visual

- Va a mostrar plata todo el tiempo — la tipografía y el tratamiento de los números tiene que priorizar la legibilidad y la jerarquía (el monto es casi siempre el dato más importante de una fila o tarjeta).
- Cada persona tiene un color identificatorio propio (elegido en el onboarding) — se usa para diferenciar rápidamente "quién" en gastos, avatares y gráficos de balance. Pensar una paleta que funcione bien para 2, 3 y hasta 4-5 personas en un mismo hogar, sin que se vuelva confuso.
- El **selector de contexto** (Hogar / Personal) es un elemento que aparece en casi todas las pantallas — vale la pena diseñarlo con cuidado porque es el que más se va a usar.
- Multi-moneda: cuando un monto no está en la moneda por defecto del hogar, tiene que quedar claro a simple vista (no alcanza con un texto chico al lado).
- Evitar que la app se sienta como una planilla de cálculo — es una herramienta de pareja/convivencia, el tono puede ser cercano y humano sin dejar de ser clara con los números.
- No hay una referencia visual definida todavía — el diseñador tiene libertad total para proponer identidad (paleta, tipografía, tono). Lo único no negociable es que los montos y el balance del hogar se entiendan de un vistazo.

## 8. Fuera de esta primera etapa de diseño

No hace falta diseñar todavía (quedan para más adelante): notificaciones, exportar a Excel/PDF, gráficos de tendencia por categoría, pantallas de conversión de moneda, roles/permisos dentro de un hogar.
