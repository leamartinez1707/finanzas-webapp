import { Resend } from 'resend'
import { NextResponse } from 'next/server'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: Request) {
  try {
    const { email, householdName, token, inviterName } = await request.json()

    if (!email || !householdName || !token) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL
      || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

    const inviteUrl = `${appUrl}/invitacion/${token}`

    const from = process.env.RESEND_FROM || 'Nido <onboarding@resend.dev>'

    const { data, error } = await resend.emails.send({
      from,
      to: [email],
      subject: `${inviterName || 'Alguien'} te invitó a ${householdName} en Nido`,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
          <h1 style="font-size: 24px; font-weight: 700; margin: 0 0 8px; color: #1a1a1a;">
            Te invitaron a ${householdName}
          </h1>
          <p style="font-size: 16px; color: #555; line-height: 1.6; margin: 0 0 24px;">
            ${inviterName || 'Alguien'} quiere compartir gastos y objetivos con vos en Nido.
          </p>
          <a href="${inviteUrl}" style="display: inline-block; background: #16a34a; color: white; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 16px;">
            Unirme al hogar
          </a>
          <p style="font-size: 13px; color: #888; margin-top: 24px; line-height: 1.5;">
            O copiá este link:<br />
            <a href="${inviteUrl}" style="color: #16a34a;">${inviteUrl}</a>
          </p>
          <p style="font-size: 12px; color: #aaa; margin-top: 32px; border-top: 1px solid #eee; padding-top: 16px;">
            Este link expira en 7 días. Si no esperabas esta invitación, podés ignorar este mail.
          </p>
        </div>
      `,
    })

    if (error) {
      console.error('Resend error:', error)
      return NextResponse.json({ error: 'Error al enviar el mail' }, { status: 500 })
    }

    return NextResponse.json({ success: true, id: data?.id })
  } catch (err) {
    console.error('Invite email error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
