// supabase/functions/asaas-webhook/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0'

Deno.serve(async (req) => {
  const supabase = createClient(
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
      
      // --- CORRECTION HERE ---
      // We now select only the 'id' and get the payment value from the Asaas payload.
      const { data: updatedOrder, error } = await supabase
        .from('whatsapp_orders')
        .update({ status: 'pago' })
        .eq('asaas_payment_id', asaasPaymentId)
        .select('id') // We only need the order ID
        .single();

      if (error || !updatedOrder) {
        console.error('Error or no order found to update:', error);
      } else {
        console.log(`Order with Asaas ID ${asaasPaymentId} updated to 'paid'.`);

        // Use the value from the Asaas 'payment' object for the notification.
        const formattedAmount = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(payment.value);
        const notificationMessage = `Pagamento de ${formattedAmount} recebido para o pedido #${updatedOrder.id.substring(0, 8)}.`;
        
        await supabase.from('notifications').insert({
          message: notificationMessage,
          link_to: updatedOrder.id
        });
      }
    }
    return new Response('Webhook received and processed', { status: 200 });
  } catch (error) {
    console.error("Error processing webhook body:", error);
    return new Response('Invalid JSON body', { status: 400 });
  }
});