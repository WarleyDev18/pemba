import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  // PagSeguro sempre reenvia se não receber 200 — retornar 200 mesmo em erros não críticos
  if (req.method !== 'POST') {
    return new Response('OK', { status: 200 })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const payload = await req.json()
    console.log('Webhook PagSeguro recebido:', JSON.stringify(payload))

    // Verificar assinatura (HMAC-SHA256)
    const secret = Deno.env.get('PAGSEGURO_WEBHOOK_SECRET')
    if (secret) {
      const signature = req.headers.get('x-pagseguro-signature') ?? ''
      const body = JSON.stringify(payload)
      const key = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign'],
      )
      const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body))
      const expected = Array.from(new Uint8Array(sig))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')

      if (signature !== expected) {
        console.warn('Assinatura inválida — ignorando webhook')
        return new Response('OK', { status: 200 })
      }
    }

    const orderStatus = payload.charges?.[0]?.status ?? payload.status ?? ''
    const orderId = payload.reference_id ?? payload.id ?? ''
    const chargeId = payload.charges?.[0]?.id ?? ''

    if (!orderId) {
      return new Response('OK', { status: 200 })
    }

    // Buscar doação pelo pagseguro_order_id ou reference_id (= doacao.id)
    const { data: doacao } = await supabase
      .from('doacoes')
      .select('id')
      .or(`pagseguro_order_id.eq.${orderId},id.eq.${orderId}`)
      .single()

    if (!doacao) {
      console.warn('Doação não encontrada para order_id:', orderId)
      return new Response('OK', { status: 200 })
    }

    if (['PAID', 'AUTHORIZED', 'AVAILABLE'].includes(orderStatus)) {
      await supabase.rpc('fn_aprovar_doacao', {
        p_doacao_id: doacao.id,
        p_charge_id: chargeId,
        p_webhook_payload: payload,
      })
    } else if (['CANCELED', 'DECLINED'].includes(orderStatus)) {
      await supabase.rpc('fn_cancelar_doacao', {
        p_doacao_id: doacao.id,
        p_webhook_payload: payload,
      })
    }

    return new Response('OK', { status: 200 })
  } catch (err) {
    console.error('Erro no webhook:', err)
    // Retornar 200 para o PagSeguro não reenviar em loop
    return new Response('OK', { status: 200 })
  }
})
