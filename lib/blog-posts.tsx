import type { ReactNode } from 'react'

// Plain TypeScript objects, not MDX — no new dependencies. `content` is
// JSX so future posts can use headings, lists, etc. without a markdown
// parser. Keep entries ordered newest-first; /novedades reads this array
// directly for both the list and the detail pages.
export interface BlogPost {
  slug: string
  title: string
  excerpt: string
  date: string // ISO date, e.g. '2026-08-28'
  content: ReactNode
}

export const blogPosts: BlogPost[] = [
  {
    slug: 'disponible-incluye-hogares',
    title: 'Disponible y Gasto del mes ahora incluyen tu parte en los hogares',
    excerpt:
      'Lo que gastás como tu parte de un hogar compartido es plata real que sale de tu bolsillo — ahora se ve reflejado en tu vista personal, sin que tengas que cargarlo dos veces.',
    date: '2026-09-05',
    content: (
      <>
        <p key="p1">
          Hasta ahora, <strong>Disponible</strong> y <strong>Gasto del mes</strong> en
          tu vista personal solo miraban tus gastos personales — los que no
          pertenecen a ningún hogar. El problema: si compartís gastos con tu
          pareja, tu familia o roommates, tu parte de esos gastos también sale
          de tu bolsillo, y antes esa plata era invisible en tus finanzas
          personales.
        </p>
        <p key="p2">
          No hacía falta cargar esos gastos dos veces (una en el hogar y otra
          como personal) — eso los iba a desincronizar apenas alguien los
          edite o borre del lado del hogar. En cambio, ahora la app calcula tu
          parte automáticamente a partir de los gastos de cada hogar del que
          formás parte, con el mismo cálculo de reparto que ya usa el balance
          del hogar (montos manuales, porcentajes o partes iguales, según
          corresponda a cada gasto).
        </p>
        <p key="p3">
          Para que el número no sea una caja negra, <strong>Gasto del mes</strong>{' '}
          ahora muestra debajo el detalle: cuánto es personal y cuánto es tu
          parte en cada hogar. Si alguno de tus hogares usa una moneda
          distinta a la tuya, esa parte se muestra aparte — no se puede sumar
          automáticamente sin un tipo de cambio, así que preferimos mostrarla
          bien clara en vez de mezclarla.
        </p>
      </>
    ),
  },
  {
    slug: 'ahorros-ahora-es-ingresos',
    title: '"Ahorros" ahora se llama "Ingresos"',
    excerpt:
      'Le cambiamos el nombre a la sección de depósitos y retiros: no era un ahorro aparte, era la plata con la que pagás tus gastos del mes.',
    date: '2026-09-04',
    content: (
      <>
        <p key="p1">
          La sección que hasta ahora se llamaba <strong>Ahorros</strong> — donde
          registrabas depósitos y retiros — en realidad no representaba un
          ahorro guardado aparte: era la plata que entra (tu sueldo, un
          ingreso extra) y con la que después pagás los gastos del mes. Llamarla
          &ldquo;ahorros&rdquo; generaba confusión, así que le cambiamos el
          nombre a <strong>Ingresos</strong> en todos lados: el menú, el
          historial y la tarjeta &ldquo;Disponible&rdquo; del inicio.
        </p>
        <p key="p2">
          No cambia nada en tus datos — los depósitos y retiros que ya tenías
          cargados siguen ahí igual, con los mismos montos y fechas. Solo
          cambia cómo se llama y se explica en la app.
        </p>
        <p key="p3">
          Un ahorro de verdad — plata que apartás con una meta, separada de lo
          que gastás — ya existe como <strong>Objetivos</strong>, y estamos
          pensando si tiene sentido sumar además una sección de ahorro
          general, sin meta ni fecha. Si te sirve, contanos.
        </p>
      </>
    ),
  },
  {
    slug: 'saldo-disponible',
    title: 'Ahora ves cuánto te queda disponible',
    excerpt:
      'En Mis finanzas sumamos una tarjeta de "Disponible" que resta lo que gastaste de tus ahorros, para que sepas de un vistazo cuánta plata te queda.',
    date: '2026-09-04',
    content: (
      <>
        <p key="p1">
          Hasta ahora, en la pantalla de inicio de <strong>Mis finanzas</strong>{' '}
          veías dos números separados: cuánto gastaste este mes y cuánto
          tenías ahorrado. El problema es que esos dos números nunca se
          cruzaban, así que después de cargar un gasto no había forma de ver,
          de un vistazo, cuánta plata te quedaba en realidad.
        </p>
        <p key="p2">
          Agregamos una tarjeta de <strong>Disponible</strong> arriba de todo,
          que resta el total de tus gastos a tus ahorros. Es la respuesta
          directa a &ldquo;¿cuánto me queda?&rdquo;: se actualiza cada vez que
          cargás un gasto o un movimiento de ahorro, y se pinta en rojo si el
          resultado da negativo.
        </p>
        <p key="p3" className="text-sm text-muted-foreground">
          Por ahora está disponible en el contexto personal (Mis finanzas).
        </p>
      </>
    ),
  },
  {
    slug: 'instalar-nido-como-app',
    title: 'Instalá Nido como una app en tu celular',
    excerpt:
      'Sin App Store ni Play Store: agregá Nido a la pantalla de inicio de tu iPhone o Android y usala como una app más.',
    date: '2026-09-02',
    content: (
      <>
        <p key="p1">
          Nido funciona como una PWA (Progressive Web App), que es una forma
          elegante de decir que podés instalarla directo desde el navegador,
          sin pasar por ninguna tienda de aplicaciones. Queda con su ícono en
          tu pantalla de inicio, abre a pantalla completa como cualquier app
          nativa, y podés consultar tus datos aunque te quedes sin señal por
          un rato — para cargar o editar algo sí necesitás conexión.
        </p>
        <p key="p2">
          La instalación se hace distinto según el celular. Acá van los dos
          caminos.
        </p>

        <h2 key="h2-ios" className="text-lg font-bold tracking-tight text-foreground">
          En iPhone o iPad (Safari)
        </h2>
        <p key="p3-ios" className="text-sm text-muted-foreground">
          Tiene que ser desde Safari — en iOS es el único navegador que puede
          instalar apps a la pantalla de inicio, aunque tengas Chrome
          instalado.
        </p>
        <ol key="ol-ios" className="list-decimal space-y-2 pl-5">
          <li>
            Entrá a{' '}
            <a
              href="https://finanzas-nido.vercel.app"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              finanzas-nido.vercel.app
            </a>{' '}
            desde Safari.
          </li>
          <li>Tocá el ícono de compartir (el cuadrado con la flecha hacia arriba).</li>
          <li>Deslizá la lista de opciones y elegí <strong>Agregar a inicio</strong>.</li>
          <li>Confirmá tocando <strong>Agregar</strong> arriba a la derecha.</li>
        </ol>

        <h2 key="h2-android" className="text-lg font-bold tracking-tight text-foreground">
          En Android (Chrome)
        </h2>
        <ol key="ol-android" className="list-decimal space-y-2 pl-5">
          <li>
            Entrá a{' '}
            <a
              href="https://finanzas-nido.vercel.app"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              finanzas-nido.vercel.app
            </a>{' '}
            desde Chrome.
          </li>
          <li>Tocá los tres puntos, arriba a la derecha.</li>
          <li>Elegí <strong>Instalar app</strong> (o <strong>Agregar a pantalla de inicio</strong>, según la versión).</li>
          <li>Confirmá. A veces Chrome te muestra directamente un cartel de &ldquo;Instalar&rdquo; abajo de la pantalla — con tocarlo alcanza.</li>
        </ol>

        <p key="p4">
          Una vez instalada, Nido se comporta como cualquier otra app: la
          buscás por su ícono, abre sin la barra del navegador, y queda
          disponible aunque estés sin datos para ver lo que ya cargaste.
        </p>
      </>
    ),
  },
  {
    slug: 'tendencia-de-gastos',
    title: 'Cómo viene la mano, mes a mes',
    excerpt:
      'Un gráfico con los últimos 6 meses de gasto total, para ver de un vistazo si vas para arriba o para abajo.',
    date: '2026-09-01',
    content: (
      <>
        <p key="p1">
          El Resumen te decía cuánto gastaste este mes y cómo quedó contra el
          anterior, pero ahí se cortaba: un solo número, un solo porcentaje.
          Para saber si veníamos gastando de más hacía dos o tres meses,
          había que ir mes por mes a mano.
        </p>
        <p key="p2">
          Ahora hay un gráfico de barras nuevo, arriba de todo en Resumen:
          Tendencia. Muestra el total gastado en cada uno de los últimos 6
          meses, terminando en el mes que tengas seleccionado. La barra del
          mes actual se destaca del resto, así siempre sabés dónde estás
          parado dentro del panorama completo.
        </p>
        <p key="p3">
          Se mueve junto con el resto de la pantalla: si navegás a un mes
          anterior, el gráfico recalcula los 6 meses terminando ahí. Y si
          preferís ver todo el historial, toma como referencia el mes
          actual.
        </p>
        <p key="p4">
          Es el mismo total que ya calculábamos para el resto de Resumen —
          por moneda, respetando si estás en modo hogar o personal — nada
          más que ahora lo ves evolucionar en el tiempo, no solo como una
          foto de un mes puntual.
        </p>
      </>
    ),
  },
  {
    slug: 'resumen-mensual-y-exportar-csv',
    title: 'Un resumen de en qué se fue la plata',
    excerpt:
      'Nueva pantalla con el total del mes, en qué categorías gastaste más y quién pagó qué — más exportar todo a CSV.',
    date: '2026-08-28',
    content: (
      <>
        <p key="p1">
          El historial te muestra cada gasto uno por uno, pero a veces lo que
          querés es la foto completa: cuánto gastaste este mes, en qué se te
          fue la plata, y quién puso qué en el hogar.
        </p>
        <p key="p2">
          Para eso está el nuevo Resumen — accesible desde Inicio. Arriba de
          todo, el total del período con la variación contra el mes anterior.
          Después, un desglose por categoría ordenado de mayor a menor, y si
          estás en modo hogar, quién pagó cuánto.
        </p>
        <p key="p3">
          Navegás entre meses igual que en Gastos e Historial, o pasás a “ver
          todo” si querés mirar el panorama completo en vez de un mes puntual.
        </p>
        <p key="p4">
          Y si necesitás los datos afuera de Nido — para una planilla, para
          mandárselos a alguien — el botón “Exportar CSV” baja exactamente lo
          que estás mirando en pantalla, con fecha, descripción, categoría,
          monto y quién pagó cada gasto.
        </p>
      </>
    ),
  },
  {
    slug: 'presupuestos-por-categoria',
    title: 'Ponele un techo a cada categoría',
    excerpt:
      'Definí cuánto querés gastar por mes en cada categoría y Nido te avisa, sin mandarte notificaciones molestas.',
    date: '2026-08-28',
    content: (
      <>
        <p key="p1">
          Hasta ahora Nido era puro registro: cargabas gastos y veías el
          historial, pero nada te avisaba si te estabas pasando en alguna
          categoría hasta que ya era tarde.
        </p>
        <p key="p2">
          Ahora podés ponerle un tope mensual a las categorías que quieras —
          Comida, Salidas, lo que sea — y a medida que cargás gastos ese mes,
          la barra se va llenando. Pasa a amarillo cerca del límite, y a rojo
          si te lo pasaste.
        </p>
        <p key="p3">
          Nada de pop-ups ni notificaciones que interrumpen: el aviso es
          visual, lo ves cuando entrás a mirar tus gastos, no antes.
        </p>
        <p key="p4">
          Funciona igual en modo hogar y en modo personal — cada uno con sus
          propios topes, en su propia moneda.
        </p>
        <p key="p5">
          Se configura tocando “Presupuestos” en la pantalla de Gastos, con
          un mes filtrado.
        </p>
      </>
    ),
  },
  {
    slug: 'division-flexible-de-gastos',
    title: 'Repartí los gastos como te haga sentido',
    excerpt:
      'El 1/N ya no es la única opción: fijá un % por hogar o ajustá cada gasto por separado.',
    date: '2026-08-28',
    content: (
      <>
        <p key="p1">
          Hasta ahora, cada gasto compartido se dividía siempre por partes
          iguales entre quienes viven en la casa. Funciona bien para muchos
          hogares, pero no siempre refleja cómo se reparten las cosas en la
          vida real.
        </p>
        <p key="p2">
          Ahora podés configurar un % fijo para tu hogar — 60/40, 70/30, lo
          que corresponda — y todos los gastos nuevos van a usar esa
          proporción por defecto. Y si un gasto puntual necesita otra
          división, lo ajustás ahí mismo, sin tocar la configuración general.
        </p>
        <p key="p3">
          El 1/N sigue estando: es lo que usa Nido cuando no configuraste
          nada. Si tu casa ya se llevaba bien con partes iguales, no tenés
          que cambiar nada.
        </p>
        <p key="p4">
          Los gastos viejos tampoco se mueven de lugar — cada uno queda con
          la división que tenía en el momento en que lo cargaste, así los
          balances de meses anteriores nunca cambian de golpe.
        </p>
        <p key="p5">
          Lo encontrás en la configuración del hogar y al cargar cualquier
          gasto.
        </p>
      </>
    ),
  },
  {
    slug: 'gastos-recurrentes',
    title: 'Los gastos de siempre, sin cargarlos de nuevo cada mes',
    excerpt:
      'Alquiler, Internet, el gimnasio — armá la plantilla una vez y Nido genera el gasto solo, todos los meses.',
    date: '2026-08-28',
    content: (
      <>
        <p key="p1">
          Hay gastos que se repiten mes a mes sin cambiar casi nada: el
          alquiler, Internet, el gimnasio, la cuota del auto. Cargarlos a
          mano cada vez es una pérdida de tiempo, y es fácil olvidarse
          alguno.
        </p>
        <p key="p2">
          Ahora podés crear un gasto recurrente: definís el monto, la
          categoría, quién lo paga y el día del mes en que corresponde. A
          partir de ahí, Nido se encarga.
        </p>
        <p key="p3">
          Cuando llega la fecha, el gasto aparece solo en tu lista, como si
          lo hubieras cargado vos ese día. Nada de recordatorios ni de sumar
          de memoria a fin de mes.
        </p>
        <p key="p4">
          Podés pausar o borrar la plantilla cuando quieras. Un gasto que ya
          se generó queda como cualquier otro — editable, con su propia
          división, como siempre.
        </p>
        <p key="p5">
          Se configura desde la misma pantalla donde cargás un gasto nuevo.
        </p>
      </>
    ),
  },
  {
    slug: 'ingreso-con-google',
    title: 'Entrá con Google, sin otra contraseña que recordar',
    excerpt:
      'Sumamos el ingreso con Google como alternativa a mail y contraseña — un paso menos para arrancar.',
    date: '2026-08-28',
    content: (
      <>
        <p key="p1">
          Una contraseña más para recordar nunca suma. Por eso ahora podés
          entrar a Nido con tu cuenta de Google, sin crear ni memorizar nada
          nuevo.
        </p>
        <p key="p2">
          Lo vas a ver como una opción más en la pantalla de ingreso, arriba
          del login con mail y contraseña. Un clic y estás adentro.
        </p>
        <p key="p3">
          Si ya tenés cuenta con mail, seguís pudiendo usarla igual — esto es
          una alternativa, no un reemplazo.
        </p>
        <p key="p4">
          Menos fricción para arrancar significa que invitar a tu pareja o a
          tus roommates a sumarse es todavía más simple.
        </p>
      </>
    ),
  },
]

export function getBlogPost(slug: string): BlogPost | undefined {
  return blogPosts.find((post) => post.slug === slug)
}

const MONTHS_LONG = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'setiembre',
  'octubre',
  'noviembre',
  'diciembre',
]

export function formatPostDate(iso: string) {
  // Parse the Y-M-D literally instead of via `new Date(iso)` — that parses
  // as UTC midnight, which rolls back to the previous day once converted to
  // any UTC-negative local time (e.g. Uruguay, UTC-3), showing every post
  // one day earlier than its actual `date`.
  const [year, month, day] = iso.split('-').map(Number)
  return `${day} de ${MONTHS_LONG[month - 1]} de ${year}`
}
