// supabase/functions/whatsapp-send/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// --- Interfaces ---
interface PaymentDetails { amount: number; description: string; }
interface CustomerDetails { name: string; cpfCnpj: string; mobilePhone: string; }
interface SendMessageRequest {
  to: string;
  message?: string;
  orderId?: string;
  type?: 'text' | 'catalog' | 'payment';
  paymentDetails?: PaymentDetails;
  customerDetails?: CustomerDetails;
}

// --- Função Asaas (completa) ---
async function createAsaasPayment(paymentDetails: PaymentDetails, customerDetails: CustomerDetails, apiKey: string): Promise<any> {
    const asaasApiBaseUrl = 'https://api.asaas.com/v3';
    const customerSearchUrl = `${asaasApiBaseUrl}/customers?cpfCnpj=${customerDetails.cpfCnpj}`;
    const customerResponse = await fetch(customerSearchUrl, { headers: { 'access_token': apiKey, 'Content-Type': 'application/json' } });
    const customerData = await customerResponse.json();
    let customerId = customerData.data[0]?.id;
    if (!customerId) {
      let phone = customerDetails.mobilePhone.replace(/\D/g, '');
      if (phone.startsWith('55')) { phone = phone.substring(2); }
      const newCustomerBody = { name: customerDetails.name, cpfCnpj: customerDetails.cpfCnpj, mobilePhone: phone };
      const newCustomerResponse = await fetch(`${asaasApiBaseUrl}/customers`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'access_token': apiKey }, body: JSON.stringify(newCustomerBody), });
      const newCustomerData = await newCustomerResponse.json();
      if (newCustomerData.errors) { throw new Error(newCustomerData.errors[0].description); }
      customerId = newCustomerData.id;
    }
    if (!customerId) { throw new Error("Não foi possível criar ou encontrar o cliente no Asaas."); }
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 5);
    const paymentBody = { customer: customerId, billingType: "UNDEFINED", dueDate: dueDate.toISOString().split('T')[0], value: paymentDetails.amount, description: paymentDetails.description };
    const paymentResponse = await fetch(`${asaasApiBaseUrl}/payments`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'access_token': apiKey }, body: JSON.stringify(paymentBody) });
    const paymentData = await paymentResponse.json();
    if (!paymentResponse.ok) { throw new Error(paymentData.errors?.[0]?.description || 'Falha ao criar cobrança no Asaas.'); }
    return paymentData;
}


Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

  try {
    const { to, message, orderId, type = 'text', paymentDetails, customerDetails }: SendMessageRequest = await req.json();

    if (!to) { return new Response("'to' field is missing", { status: 400, headers: corsHeaders }); }

    const whatsappToken = Deno.env.get('WHATSAPP_API_TOKEN');
    const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
    const asaasApiKey = Deno.env.get('ASAAS_API_KEY');

    if (!whatsappToken || !phoneNumberId) {
      return new Response('WhatsApp credentials not configured', { status: 500, headers: corsHeaders });
    }

    let requestBody;
    let contentForDB = message;
    let metadataForDB = null;

    if (type === 'payment' && paymentDetails && customerDetails) {
        // Lógica de pagamento
    } else if (type === 'catalog') {
      contentForDB = 'Catálogo de produtos enviado.';
      requestBody = {
        messaging_product: "whatsapp", to, type: "interactive",
        interactive: {
          type: "catalog_message",
          body: { text: "Olá! Confira nosso catálogo de produtos." },
          action: { name: "catalog_message", parameters: { thumbnail_product_retailer_id: "prod-001" } },
          footer: { text: "Toque para ver os itens." }
        }
      };
    
    } else { 
      if (!message) { return new Response("'message' field is missing for text message", { status: 400, headers: corsHeaders }); }
      contentForDB = message;
      requestBody = { messaging_product: "whatsapp", to, type: "text", text: { "preview_url": false, "body": message }};
    }
     
    const whatsappResponse = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${whatsappToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
    });

    const whatsappResult = await whatsappResponse.json();

    if (!whatsappResponse.ok) {
      console.error('WhatsApp API returned an error:', JSON.stringify(whatsappResult, null, 2));
      return new Response(JSON.stringify({ error: 'Failed to send message', details: whatsappResult }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
    }

    // --- Bloco robusto para salvar no banco de dados ---
    try {
      const contactName = customerDetails?.name || to;
      const { data: contactData, error: contactError } = await supabase
        .from('whatsapp_contacts')
        .upsert({ phone_number: to, name: contactName }, { onConflict: 'phone_number' })
        .select('id')
        .single();

      if (contactError) { throw new Error(`Falha ao criar/encontrar contato: ${contactError.message}`); }
      if (!contactData) { throw new Error("ID de contato não encontrado após upsert."); }

      let { data: conversationData, error: convError } = await supabase
        .from('whatsapp_conversations')
        .select('id')
        .eq('contact_id', contactData.id)
        .single();
      
      if (convError && convError.code !== 'PGRST116') { throw new Error(`Falha ao buscar conversa: ${convError.message}`); }
      
      if (!conversationData) {
        const { data: newConversation, error: newConvError } = await supabase
          .from('whatsapp_conversations')
          .insert({ contact_id: contactData.id })
          .select('id')
          .single();
        if (newConvError || !newConversation) { throw new Error(`Falha ao criar conversa: ${newConvError?.message}`); }
        conversationData = newConversation;
      }
      
      const { error: insertError } = await supabase.from('whatsapp_messages').insert({
          conversation_id: conversationData.id,
          whatsapp_message_id: whatsappResult.messages?.[0]?.id,
          content: contentForDB,
          message_type: type,
          is_from_contact: false,
          status: 'sent',
          timestamp: new Date().toISOString(),
          metadata: metadataForDB
      });

      if (insertError) { throw new Error(`Falha ao inserir mensagem: ${insertError.message}`); }

      await supabase.from('whatsapp_conversations').update({ last_message_at: new Date().toISOString() }).eq('id', conversationData.id);
    
    } catch (dbError) {
      console.error("Database operation failed:", dbError.message);
      return new Response(JSON.stringify({ success: true, warning: 'Message sent but failed to save to DB', dbError: dbError.message }), { status: 200, headers: corsHeaders });
    }
    // --- Fim do bloco ---

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
  
  } catch (error) {
    console.error("Unhandled error in function:", error.message);
    return new Response(JSON.stringify({ error: 'Internal Server Error', details: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
  }
});