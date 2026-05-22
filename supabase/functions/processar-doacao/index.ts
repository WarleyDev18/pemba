import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Verificar usuário autenticado
    const authHeader = req.headers.get('Authorization')
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader?.replace('Bearer ', '') ?? ''
    )
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { usuario_id, valor, metodo, descricao } = await req.json()

    if (!valor || valor < 5) {
      return new Response(JSON.stringify({ error: 'Valor mínimo: R$ 5,00' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Criar registro de doação
    const { data: doacao, error: doacaoError } = await supabase
      .from('doacoes')
      .insert({
        usuario_id,
        valor,
        metodo,
        mensagem: descricao,
        status: 'pendente',
      })
      .select('id')
      .single()

    if (doacaoError || !doacao) throw new Error('Erro ao criar doação')

    const pagseguroToken = Deno.env.get('PAGSEGURO_TOKEN')!
    const isSandbox = Deno.env.get('PAGSEGURO_ENV') === 'sandbox'
    const baseUrl = isSandbox
      ? 'https://sandbox.api.pagseguro.com'
      : 'https://api.pagseguro.com'

    const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/webhook-pagseguro`
    const valorCentavos = Math.round(valor * 100)

    // Buscar dados do usuário
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('nome, email')
      .eq('id', usuario_id)
      .single()

    // Montar body do pedido PagSeguro
    const orderBody: Record<string, unknown> = {
      reference_id: doacao.id,
      customer: {
        name: usuario?.nome ?? 'Doador',
        email: usuario?.email ?? user.email,
      },
      items: [{
        name: 'Doação ao Terreiro Pemba',
        quantity: 1,
        unit_amount: valorCentavos,
      }],
      notification_urls: [webhookUrl],
    }

    if (metodo === 'pix') {
      orderBody.qr_codes = [{ amount: { value: valorCentavos } }]
    } else if (metodo === 'boleto') {
      orderBody.charges = [{
        reference_id: doacao.id,
        description: 'Doação ao Terreiro Pemba',
        amount: { value: valorCentavos, currency: 'BRL' },
        payment_method: {
          type: 'BOLETO',
          boleto: {
            due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            instruction_lines: { line_1: 'Doação ao Terreiro Pemba' },
            holder: {
              name: usuario?.nome ?? 'Doador',
              email: usuario?.email ?? user.email,
            },
          },
        },
      }]
    } else {
      // Cartão: usar checkout
      orderBody.payment_methods = [{ type: 'CREDIT_CARD' }, { type: 'DEBIT_CARD' }]
      orderBody.redirect_url = `${req.headers.get('origin') ?? ''}/dashboard/doacao`
    }

    const pgRes = await fetch(`${baseUrl}/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${pagseguroToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderBody),
    })

    const pgData = await pgRes.json()

    if (!pgRes.ok) {
      console.error('PagSeguro error:', pgData)
      throw new Error('Erro na API do PagSeguro')
    }

    // Extrair dados conforme método
    let qr_code: string | null = null
    let qr_texto: string | null = null
    let link: string | null = null
    const order_id: string = pgData.id ?? ''

    if (metodo === 'pix' && pgData.qr_codes?.length) {
      const qr = pgData.qr_codes[0]
      qr_texto = qr.text ?? null
      // Link para a imagem do QR code
      const qrLink = qr.links?.find((l: {rel: string, href: string}) => l.rel === 'QRCODE.PNG')?.href
      if (qrLink) {
        const imgRes = await fetch(qrLink, {
          headers: { 'Authorization': `Bearer ${pagseguroToken}` },
        })
        const imgBuf = await imgRes.arrayBuffer()
        qr_code = btoa(String.fromCharCode(...new Uint8Array(imgBuf)))
      }
    } else if (metodo === 'boleto' && pgData.charges?.length) {
      const charge = pgData.charges[0]
      link = charge.links?.find((l: {rel: string, href: string}) => l.rel === 'BOLETO.PDF')?.href
        ?? charge.links?.[0]?.href
        ?? null
    } else {
      link = pgData.links?.find((l: {rel: string, href: string}) => l.rel === 'PAY')?.href
        ?? pgData.links?.[0]?.href
        ?? null
    }

    // Atualizar doação com dados do PagSeguro
    await supabase
      .from('doacoes')
      .update({
        pagseguro_order_id: order_id,
        pagseguro_qr_code: qr_code,
        pagseguro_qr_texto: qr_texto,
        pagseguro_link: link,
      })
      .eq('id', doacao.id)

    return new Response(
      JSON.stringify({ doacao_id: doacao.id, metodo, qr_code, qr_texto, link }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error(err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
