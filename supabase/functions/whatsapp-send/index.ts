// supabase/functions/whatsapp-send/index.ts

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// --- Interfaces ---
interface PaymentDetails { amount: number; description: string; }
interface CustomerDetails { name: string; cpfCnpj: string; mobilePhone: string; }
interface SendMessageRequest { to: string; message?: string; orderId?: string; type?: 'text' | 'catalog' | 'payment'; paymentDetails?: PaymentDetails; customerDetails?: CustomerDetails; }

// --- Função Asaas (completa) ---
async function createAsaasPayment(paymentDetails: PaymentDetails, customerDetails: CustomerDetails, apiKey: string): Promise<any> {
    const asaasApiBaseUrl = 'https://sandbox.asaas.com/api/v3';
    const customerSearchUrl = `${asaasApiBaseUrl}/customers?cpfCnpj=${customerDetails.cpfCnpj}`;
    const customerResponse = await fetch(customerSearchUrl, { headers: { 'access_token': apiKey, 'Content-Type': 'application/json' } });
    const customerData = await customerResponse.json();
    if (!customerResponse.ok) { throw new Error(customerData.errors?.[0]?.description || 'Falha ao buscar cliente no Asaas.'); }
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

// --- Função para buscar o ID da organização do utilizador ---
async function getOrganizationId(supabase: SupabaseClient): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Utilizador não autenticado.");
  const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
  if (!profile?.organization_id) throw new Error("Perfil ou organização não encontrados.");
  return profile.organization_id;
}


Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    
    const organizationId = await getOrganizationId(supabase);
    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    
    const { data: secrets, error: secretsError } = await supabaseAdmin.rpc('get_organization_secrets', { org_id: organizationId });
    if (secretsError || !secrets || secrets.length === 0) {
        throw new Error(`Não foi possível buscar as chaves da organização: ${secretsError?.message}`);
    }

    const { whatsapp_api_token, whatsapp_phone_number_id, asaas_api_key } = secrets[0];
    if (!whatsapp_api_token || !whatsapp_phone_number_id) {
        throw new Error("As credenciais do WhatsApp para esta organização não estão configuradas.");
    }
    
    const { to, message, orderId, type = 'text', paymentDetails, customerDetails }: SendMessageRequest = await req.json();

    let requestBody;
    let contentForDB = message;
    let metadataForDB = null;

    if (type === 'payment' && paymentDetails && customerDetails) {
        if (!asaas_api_key) { throw new Error("A chave de API do Asaas para esta organização não está configurada."); }
        const asaasPayment = await createAsaasPayment(paymentDetails, customerDetails, asaas_api_key);
        const paymentLink = asaasPayment.invoiceUrl;
        if (orderId) { await supabaseAdmin.from('whatsapp_orders').update({ asaas_payment_id: asaasPayment.id }).eq('id', orderId); }
        const formattedAmount = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(paymentDetails.amount);
        contentForDB = `Olá, ${customerDetails.name}! 👋\n\nSegue o seu link de pagamento referente a "${paymentDetails.description}":\n\nValor: *${formattedAmount}*\nLink: ${paymentLink}\n\nQualquer dúvida, estamos à disposição!`;
        requestBody = { messaging_product: "whatsapp", to, type: "text", text: { "preview_url": false, "body": contentForDB }};
        metadataForDB = { paymentDetails: { ...paymentDetails, link: paymentLink } };
    
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
     
    const whatsappResponse = await fetch(`https://graph.facebook.com/v18.0/${whatsapp_phone_number_id}/messages`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${whatsapp_api_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
    });
    
    const whatsappResult = await whatsappResponse.json();
    if (!whatsappResponse.ok) {
      console.error('WhatsApp API returned an error:', JSON.stringify(whatsappResult, null, 2));
      return new Response(JSON.stringify({ error: 'Failed to send message', details: whatsappResult }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
    }

    try {
      console.log("Iniciando operação com a DB...");
      const contactName = customerDetails?.name || to;
      
      // --- CORREÇÃO FINAL AQUI ---
      const { data: contactData, error: contactError } = await supabaseAdmin.from('whatsapp_contacts').upsert(
        { phone_number: to, name: contactName, organization_id: organizationId },
        { onConflict: 'phone_number, organization_id' } // Especifica a restrição correta
      ).select('id').single();

      if (contactError) { throw new Error(`Passo 1 Falhou (contato): ${contactError.message}`); }
      if (!contactData) { throw new Error("Passo 1 Falhou: ID de contato nulo."); }
      console.log("Passo 1: Contato OK.");

      let { data: conversationData, error: convError } = await supabaseAdmin.from('whatsapp_conversations').select('id').eq('contact_id', contactData.id).single();
      if (convError && convError.code !== 'PGRST116') { throw new Error(`Passo 2 Falhou (buscar conv): ${convError.message}`); }
      
      if (!conversationData) {
        const { data: newConversation } = await supabaseAdmin.from('whatsapp_conversations').insert({ contact_id: contactData.id, organization_id: organizationId }).select('id').single();
        conversationData = newConversation;
      }
      if (!conversationData) { throw new Error("Não foi possível obter uma conversa."); }
      
      await supabaseAdmin.from('whatsapp_messages').insert({
          conversation_id: conversationData.id, whatsapp_message_id: whatsappResult.messages?.[0]?.id, content: contentForDB, message_type: type, is_from_contact: false, status: 'sent', timestamp: new Date().toISOString(), metadata: metadataForDB
      });

      await supabaseAdmin.from('whatsapp_conversations').update({ last_message_at: new Date().toISOString() }).eq('id', conversationData.id);
      console.log("Operação com a DB concluída com sucesso.");
    
    } catch (dbError) {
      console.error("Database operation failed:", dbError.message);
      return new Response(JSON.stringify({ success: true, warning: 'Message sent but failed to save to DB', dbError: dbError.message }), { status: 200, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
  
  } catch (error) {
    console.error("Unhandled error in function:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
  }
});