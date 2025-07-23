// supabase/functions/asaas-webhook/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0'

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  // --- CORREÇÃO AQUI ---
  // Corrigimos o nome do cabeçalho para corresponder ao que o Asaas envia.
  const asaasToken = req.headers.get('asaas-access-token');
  const expectedToken = Deno.env.get('ASAAS_VERIFICATION_TOKEN');

  if (asaasToken?.trim() !== expectedToken?.trim()) {
    console.error('Falha na autenticação do Webhook: os tokens não correspondem.');
    // Log para ver o que foi recebido vs. o que era esperado
    console.log(`Recebido: "${asaasToken}" | Esperado: "${expectedToken}"`);
    return new Response('Authentication failed', { status: 401 });
  }
  
  try {
    const { event, payment } = await req.json();

    if (event === 'PAYMENT_CONFIRMED' || event === 'PAYMENT_RECEIVED') {
      const asaasPaymentId = payment.id;
      console.log(`Evento de pagamento recebido para o Asaas ID: ${asaasPaymentId}`);

      const { data, error, count } = await supabase
        .from('whatsapp_orders')
        .update({ status: 'pago' })
        .eq('asaas_payment_id', asaasPaymentId)
        .select();

      if (error) {
        console.error('Erro ao tentar atualizar o status do pedido:', error);
        return new Response('Error updating order', { status: 500 });
      }

      if (count === 0) {
          console.warn(`Nenhum pedido encontrado no banco de dados com o asaas_payment_id: ${asaasPaymentId}.`);
      } else {
          console.log(`${count} pedido(s) com Asaas ID ${asaasPaymentId} foram atualizados para 'pago'. Sucesso!`);
      }
    }

    return new Response('Webhook received and processed', { status: 200 });

  } catch (error) {
    console.error("Erro ao processar o corpo do webhook:", error);
    return new Response('Invalid JSON body', { status: 400 });
  }
});