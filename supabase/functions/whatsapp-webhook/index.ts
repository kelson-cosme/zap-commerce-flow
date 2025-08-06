// supabase/functions/whatsapp-webhook/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// --- Interfaces para os tipos de mensagem ---
interface WhatsAppTextMessage { from: string; id: string; timestamp: string; type: 'text'; text?: { body: string; }; }
interface WhatsAppOrderMessage { from: string; id: string; timestamp: string; type: 'order'; order: { product_items: Array<{ product_retailer_id: string; quantity: string; item_price: string; currency: string; }>; }; }
interface WhatsAppImageMessage { from: string; id: string; timestamp: string; type: 'image'; image: { mime_type: string; sha256: string; id: string; caption?: string; }; }
interface WhatsAppStickerMessage { from: string; id: string; timestamp: string; type: 'sticker'; sticker: { mime_type: string; sha256: string; id: string; animated: boolean; }; }
type WhatsAppMessage = WhatsAppTextMessage | WhatsAppOrderMessage | WhatsAppImageMessage | WhatsAppStickerMessage;


Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )
  
  try {
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const mode = url.searchParams.get('hub.mode');
      const token = url.searchParams.get('hub.verify_token');
      const challenge = url.searchParams.get('hub.challenge');
      const verifyToken = Deno.env.get('WHATSAPP_VERIFY_TOKEN');

      if (mode === 'subscribe' && token === verifyToken) {
        return new Response(challenge, { status: 200 });
      } else {
        return new Response('Forbidden', { status: 403 });
      }
    }

    if (req.method === 'POST') {
      const body = await req.json();
      console.log('Webhook recebido:', JSON.stringify(body, null, 2));

      for (const entry of body.entry) {
        for (const change of entry.changes) {
          const { value } = change;

          const receivedPhoneNumberId = value.metadata?.phone_number_id;
          if (!receivedPhoneNumberId) {
            console.warn("Webhook recebido sem phone_number_id. A ignorar.");
            continue;
          }

          const { data: organizationData, error: orgError } = await supabase
            .from('organizations')
            .select('id, whatsapp_api_token:encrypted_whatsapp_api_token')
            .eq('whatsapp_phone_number_id', receivedPhoneNumberId)
            .single();

          if (orgError || !organizationData) {
            console.error(`Nenhuma organização encontrada para o phone_number_id: ${receivedPhoneNumberId}`, orgError);
            continue;
          }
          
          const { id: organizationId, whatsapp_api_token: whatsappToken } = organizationData;
          if (!whatsappToken) {
            console.error(`Token do WhatsApp não encontrado para a organização ${organizationId}`);
            continue;
          }
          
          if (value.messages) {
            for (const message of value.messages as WhatsAppMessage[]) {
              const phoneNumber = message.from;
              const contactName = value.contacts?.find(c => c.wa_id === phoneNumber)?.profile.name || phoneNumber;

              // --- CORREÇÃO AQUI: Captura de Erro Detalhada ---
              const { data: contactData, error: contactError } = await supabase.from('whatsapp_contacts').upsert(
                { phone_number: phoneNumber, name: contactName, organization_id: organizationId },
                { onConflict: 'phone_number, organization_id' }
              ).select('id').single();
              
              if (contactError || !contactData) { 
                console.error("ERRO DETALHADO AO SALVAR CONTATO:", contactError);
                continue; // Pula para a próxima mensagem se esta falhar
              }

              let { data: conversation } = await supabase.from('whatsapp_conversations').select('id, is_active').eq('contact_id', contactData.id).eq('organization_id', organizationId).single();
              
              if (conversation && !conversation.is_active) {
                const { data: reopened } = await supabase.from('whatsapp_conversations').update({ is_active: true, unread_count: 0, assigned_to: null }).eq('id', conversation.id).select('id').single();
                conversation = reopened;
              } else if (!conversation) {
                const { data: newConversation } = await supabase.from('whatsapp_conversations').insert({ contact_id: contactData.id, organization_id: organizationId }).select('id').single();
                conversation = newConversation;
              }

              if (!conversation) { console.error("Não foi possível obter um ID de conversa"); continue; }
              const conversationId = conversation.id;

              if (message.type === 'image' || message.type === 'sticker') {
                const mediaId = message.type === 'image' ? message.image.id : message.sticker.id;
                const mimeType = message.type === 'image' ? message.image.mime_type : message.sticker.mime_type;
                const mediaDetailsResponse = await fetch(`https://graph.facebook.com/v18.0/${mediaId}`, { headers: { 'Authorization': `Bearer ${whatsappToken}` }});
                const mediaDetails = await mediaDetailsResponse.json();
                if (!mediaDetails.url) continue;
                const fileResponse = await fetch(mediaDetails.url, { headers: { 'Authorization': `Bearer ${whatsappToken}` } });
                const fileBuffer = await fileResponse.arrayBuffer();
                const fileExtension = mimeType.split('/')[1] || 'webp';
                const fileName = `${organizationId}/${mediaId}.${fileExtension}`;
                await supabase.storage.from('whatsapp_media').upload(fileName, fileBuffer, { contentType: mimeType, upsert: true });
                const { data: publicUrlData } = supabase.storage.from('whatsapp_media').getPublicUrl(fileName);
                await supabase.from('whatsapp_messages').insert({ conversation_id: conversationId, whatsapp_message_id: message.id, content: publicUrlData.publicUrl, message_type: message.type, is_from_contact: true, timestamp: new Date(parseInt(message.timestamp) * 1000).toISOString(), });
              } else if (message.type === 'order') {
                const { data: newOrder } = await supabase.from('whatsapp_orders').insert({ conversation_id: conversationId, whatsapp_order_id: message.id, products: message.order.product_items, status: 'recebido', organization_id: organizationId }).select('id').single();
                if (newOrder) {
                  await supabase.from('whatsapp_messages').insert({ conversation_id: conversationId, whatsapp_message_id: message.id, content: `Pedido recebido com ${message.order.product_items.length} item(ns).`, message_type: 'order', is_from_contact: true, timestamp: new Date(parseInt(message.timestamp) * 1000).toISOString(), metadata: { products: message.order.product_items, orderId: newOrder.id } });
                }
              } else {
                const content = message.text?.body || `[${message.type}]`;
                await supabase.from('whatsapp_messages').insert({ conversation_id: conversationId, whatsapp_message_id: message.id, content: content, message_type: 'text', is_from_contact: true, timestamp: new Date(parseInt(message.timestamp) * 1000).toISOString(), });
              }

              await Promise.all([
                  supabase.from('whatsapp_conversations').update({ last_message_at: new Date().toISOString() }).eq('id', conversationId),
                  supabase.rpc('increment_unread_count', { conv_id: conversationId })
              ]);
            }
          }

          if (value.statuses) {
            for (const status of value.statuses) {
              await supabase.from('whatsapp_messages').update({ status: status.status }).eq('whatsapp_message_id', status.id);
            }
          }
        }
      }
      return new Response('OK', { status: 200, headers: corsHeaders });
    }
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response('Internal server error', { status: 500 });
  }
});