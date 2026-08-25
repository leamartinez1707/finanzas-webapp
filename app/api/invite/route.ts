import { Resend } from 'resend'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { email, token } = await request.json()

    if (!email || !token) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
    }

    const { data: invite, error: inviteError } = await supabase
      .from('household_invites')
      .select('id, household_id, email_invitado')
      .eq('token', token)
      .maybeSingle()

    if (inviteError) {
      return NextResponse.json({ error: 'Error al buscar la invitación' }, { status: 500 })
    }
    if (!invite) {
      return NextResponse.json({ error: 'Invitación no encontrada' }, { status: 404 })
    }

    if (String(email).toLowerCase() !== String(invite.email_invitado).toLowerCase()) {
      return NextResponse.json({ error: 'El email no coincide con la invitación' }, { status: 403 })
    }

    const { data: membership, error: membershipError } = await supabase
      .from('household_members')
      .select('user_id')
      .eq('household_id', invite.household_id)
      .eq('user_id', user.id)
      .eq('activo', true)
      .maybeSingle()

    if (membershipError) {
      return NextResponse.json({ error: 'Error al verificar membresía' }, { status: 500 })
    }
    if (!membership) {
      return NextResponse.json({ error: 'No pertenecés a este hogar' }, { status: 403 })
    }

    const { data: household, error: householdError } = await supabase
      .from('households')
      .select('nombre')
      .eq('id', invite.household_id)
      .maybeSingle()
    if (householdError || !household) {
      return NextResponse.json({ error: 'Hogar no encontrado' }, { status: 404 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('nombre')
      .eq('id', user.id)
      .maybeSingle()

    const householdName = household.nombre
    const inviterName = profile?.nombre ?? 'Alguien'

    const appUrl = process.env.NEXT_PUBLIC_APP_URL
      || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

    const inviteUrl = `${appUrl}/invitacion/${token}`

    const from = process.env.RESEND_FROM || 'Nido <onboarding@resend.dev>'

    const { data, error } = await resend.emails.send({
      from,
      to: [email],
      subject: `${inviterName} te invitó a ${householdName} en Nido`,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
          <h1 style="font-size: 24px; font-weight: 700; margin: 0 0 8px; color: #1a1a1a;">
            Te invitaron a ${householdName}
          </h1>
          <p style="font-size: 16px; color: #555; line-height: 1.6; margin: 0 0 24px;">
            ${inviterName} quiere compartir gastos y objetivos con vos en Nido.
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
