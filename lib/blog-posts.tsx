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
  const d = new Date(iso)
  return `${d.getDate()} de ${MONTHS_LONG[d.getMonth()]} de ${d.getFullYear()}`
}
