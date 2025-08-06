// supabase/functions/asaas-webhook/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const asaasToken = req.headers.get('asaas-access-token');
  const expectedToken = Deno.env.get('ASAAS_VERIFICATION_TOKEN');

  if (asaasToken?.trim() !== expectedToken?.trim()) {
    return new Response('Authentication failed', { status: 401 });
  }

  try {
    const { event, payment } = await req.json();

    if (event === 'PAYMENT_CONFIRMED' || event === 'PAYMENT_RECEIVED') {
      const asaasPaymentId = payment.id;

      // Atualiza o pedido e obtém o ID da organização associada
      const { data: orderData, error: orderError } = await supabaseAdmin
        .from('whatsapp_orders')
        .update({ status: 'pago' })
        .eq('asaas_payment_id', asaasPaymentId)
        .select(`
          id,
          conversation:whatsapp_conversations (
            organization_id
          )
        `)
        .single();

      if (orderError || !orderData) {
        console.error(`Pedido não encontrado para o asaas_payment_id ${asaasPaymentId}:`, orderError);
        return new Response('Webhook acknowledged, but no order was updated.', { status: 200 });
      }

      const organizationId = orderData.conversation?.organization_id;
      if (!organizationId) {
        console.error(`Não foi possível encontrar a organização para o pedido ${orderData.id}`);
        return new Response('Order updated, but organization not found.', { status: 200 });
      }

      // Cria a notificação associada à organização
      const formattedAmount = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(payment.value);
      const orderIdentifier = `#${orderData.id.substring(0, 8)}`;
      const notificationMessage = `Pagamento de ${formattedAmount} recebido para o pedido ${orderIdentifier}.`;
      
      await supabaseAdmin.from('notifications').insert({
        message: notificationMessage,
        link_to: orderData.id,
        organization_id: organizationId // <-- Linha crucial adicionada
      });

      console.log(`Notificação criada para o pedido ${orderIdentifier} na organização ${organizationId}.`);
    }

    return new Response('Webhook received and processed successfully', { status: 200 });

  } catch (error) {
    console.error("Erro fatal ao processar o webhook:", error);
    return new Response('Invalid request body or internal error', { status: 400 });
  }
});