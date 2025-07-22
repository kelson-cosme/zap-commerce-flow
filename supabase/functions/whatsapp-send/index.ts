// supabase/functions/whatsapp-send/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Interfaces para os dados recebidos pela função
interface PaymentDetails {
    amount: number;
    description: string;
}

interface CustomerDetails {
    name: string;
    cpfCnpj: string;
}

interface SendMessageRequest {
  to: string;
  message?: string;
  type?: 'text' | 'catalog' | 'payment';
  paymentDetails?: PaymentDetails;
  customerDetails?: CustomerDetails;
}

/**
 * Função para criar uma cobrança na API do Asaas e retornar o link de pagamento.
 */
async function createAsaasPayment(paymentDetails: PaymentDetails, customerDetails: CustomerDetails, apiKey: string): Promise<string> {
  const asaasApiBaseUrl = 'https://api.asaas.com/v3'; 
  
  // 1. Procurar ou criar cliente no Asaas
  const customerSearchUrl = `${asaasApiBaseUrl}/customers?cpfCnpj=${customerDetails.cpfCnpj}`;
  const customerResponse = await fetch(customerSearchUrl, {
      headers: { 'access_token': apiKey, 'Content-Type': 'application/json' }
  });
  const customerData = await customerResponse.json();
  console.log("Resposta da busca de cliente Asaas:", JSON.stringify(customerData, null, 2));
  
  let customerId = customerData.data[0]?.id;

  if (!customerId) {
      console.log("Cliente não encontrado, criando um novo...");
      const newCustomerResponse = await fetch(`${asaasApiBaseUrl}/customers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'access_token': apiKey },
          body: JSON.stringify({
              name: customerDetails.name,
              cpfCnpj: customerDetails.cpfCnpj,
          }),
      });
      const newCustomerData = await newCustomerResponse.json();
      console.log("Resposta da criação de cliente Asaas:", JSON.stringify(newCustomerData, null, 2));
      customerId = newCustomerData.id;
  }

  if (!customerId) {
      throw new Error("Não foi possível criar ou encontrar o cliente no Asaas.");
  }
  
  // 2. Criar a cobrança
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 5);

  const paymentBody = {
    customer: customerId,
    billingType: "UNDEFINED",
    dueDate: dueDate.toISOString().split('T')[0],
    value: paymentDetails.amount,
    description: paymentDetails.description,
  };

  console.log("Enviando corpo da cobrança para o Asaas:", JSON.stringify(paymentBody, null, 2));

  const paymentResponse = await fetch(`${asaasApiBaseUrl}/payments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'access_token': apiKey },
    body: JSON.stringify(paymentBody),
  });

  const paymentData = await paymentResponse.json();
  
  // --- LOG DE DEPURAÇÃO IMPORTANTE ---
  console.log("Resposta completa da criação de pagamento Asaas:", JSON.stringify(paymentData, null, 2));

  if (!paymentResponse.ok) {
    throw new Error(paymentData.errors?.[0]?.description || 'Falha ao criar cobrança no Asaas.');
  }

  // O link de pagamento geralmente está em `invoiceUrl` ou `bankSlipUrl`
  const paymentLink = paymentData.invoiceUrl || paymentData.bankSlipUrl;

  if (!paymentLink) {
    console.error("A resposta do Asaas não continha 'invoiceUrl' ou 'bankSlipUrl'.");
    throw new Error("Não foi possível obter o link de pagamento da resposta do Asaas.");
  }

  return paymentLink;
}


Deno.serve(async (req) => {
  // ... (o resto da sua função Deno.serve permanece exatamente igual)
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

  try {
    const { to, message, type = 'text', paymentDetails, customerDetails }: SendMessageRequest = await req.json();

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
        if (!asaasApiKey) { throw new Error("ASAAS_API_KEY não está configurada."); }
        
        const paymentLink = await createAsaasPayment(paymentDetails, customerDetails, asaasApiKey);
        const formattedAmount = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(paymentDetails.amount);
        const paymentMessage = `Olá, ${customerDetails.name}! 👋\n\nSegue o seu link de pagamento referente a "${paymentDetails.description}":\n\nValor: *${formattedAmount}*\nLink: ${paymentLink}\n\nQualquer dúvida, estamos à disposição!`;
        
        requestBody = {
            messaging_product: "whatsapp",
            to: to,
            type: "text",
            text: { "preview_url": false, "body": paymentMessage }
        };

        contentForDB = paymentMessage;
        metadataForDB = { paymentDetails: { ...paymentDetails, link: paymentLink } };
    
    } else if (type === 'catalog') {
      requestBody = {
        messaging_product: "whatsapp", to, type: "interactive",
        interactive: {
          type: "catalog_message",
          body: { text: "Olá! Confira nosso catálogo de produtos." },
          action: { name: "catalog_message", parameters: { thumbnail_product_retailer_id: "prod-001" } },
          footer: { text: "Toque para ver os itens." }
        }
      };
      contentForDB = 'Catálogo de produtos enviado.';
    
    } else { 
      if (!message) { return new Response("'message' field is missing for text message", { status: 400, headers: corsHeaders }); }
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

    // Salva a mensagem no banco de dados
    try {
      const { data: contactData } = await supabase.from('whatsapp_contacts').upsert({ phone_number: to, name: customerDetails?.name || to }, { onConflict: 'phone_number' }).select().single();
      let { data: conversationData } = await supabase.from('whatsapp_conversations').select('*').eq('contact_id', contactData!.id).eq('is_active', true).single();
      
      if (!conversationData) {
        const { data: newConversation } = await supabase.from('whatsapp_conversations').insert({ contact_id: contactData!.id, last_message_at: new Date().toISOString() }).select().single();
        conversationData = newConversation;
      }

      await supabase.from('whatsapp_messages').insert({
          conversation_id: conversationData!.id,
          whatsapp_message_id: whatsappResult.messages?.[0]?.id,
          content: contentForDB,
          message_type: type,
          is_from_contact: false,
          status: 'sent',
          timestamp: new Date().toISOString(),
          metadata: metadataForDB
      });

      await supabase.from('whatsapp_conversations').update({ last_message_at: new Date().toISOString() }).eq('id', conversationData!.id);
    } catch (dbError) {
      console.error("Database operation failed:", dbError.message);
      return new Response(JSON.stringify({ success: true, warning: 'Message sent but failed to save to DB', dbError: dbError.message }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
  } catch (error) {
    console.error("Unhandled error in function:", error.message);
    return new Response(JSON.stringify({ error: 'Internal Server Error', details: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
  }
});