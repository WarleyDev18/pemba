import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Não autorizado')

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) throw new Error('Não autorizado')

    const { data: me } = await userClient
      .from('usuarios')
      .select('perfil')
      .eq('id', user.id)
      .single()
    if (me?.perfil !== 'admin') throw new Error('Acesso negado')

    const { nome, email, senha, perfil: perfilRaw = 'cliente' } = await req.json()
    const perfil = ['admin', 'filho_santo', 'cliente'].includes(perfilRaw) ? perfilRaw : 'cliente'
    if (!nome?.trim() || !email?.trim() || !senha?.trim()) {
      throw new Error('Nome, email e senha são obrigatórios')
    }

    const { data: novo, error: createError } = await adminClient.auth.admin.createUser({
      email: email.trim(),
      password: senha,
      email_confirm: true,
    })
    if (createError) throw new Error(createError.message)

    const { error: insertError } = await adminClient
      .from('usuarios')
      .upsert({ id: novo.user.id, nome: nome.trim(), email: email.trim(), perfil }, { onConflict: 'id' })
    if (insertError) throw new Error(insertError.message)

    return new Response(
      JSON.stringify({ ok: true, usuario_id: novo.user.id }),
      { headers: { ...cors, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } }
    )
  }
})
