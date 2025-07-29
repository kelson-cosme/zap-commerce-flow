// supabase/functions/whatsapp-webhook/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// --- Interfaces para os tipos de mensagem ---
interface WhatsAppTextMessage {
    from: string; id: string; timestamp: string; type: 'text';
    text?: { body: string; };
}
interface WhatsAppOrderMessage {
  from: string; id: string; timestamp: string; type: 'order';
  order: { product_items: Array<{ product_retailer_id: string; quantity: string; item_price: string; currency: string; }>; };
}
interface WhatsAppImageMessage {
  from: string; id: string; timestamp: string; type: 'image';
  image: { mime_type: string; sha256: string; id: string; caption?: string; };
}
interface WhatsAppStickerMessage {
  from: string; id: string; timestamp: string; type: 'sticker';
  sticker: { mime_type: string; sha256: string; id: string; animated: boolean; };
}
type WhatsAppMessage = WhatsAppTextMessage | WhatsAppOrderMessage | WhatsAppImageMessage | WhatsAppStickerMessage;


Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )
  const whatsappToken = Deno.env.get('WHATSAPP_API_TOKEN');

  try {
    // Verificação do Webhook (para a configuração inicial no painel da Meta)
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

    // Processamento das notificações do Webhook
    if (req.method === 'POST') {
      const body = await req.json();
      console.log('Received webhook:', JSON.stringify(body, null, 2));

      for (const entry of body.entry) {
        for (const change of entry.changes) {
          const { value } = change;

          // Processa as mensagens recebidas
          if (value.messages) {
            for (const message of value.messages as WhatsAppMessage[]) {
              const phoneNumber = message.from;
              const contactName = value.contacts?.find(c => c.wa_id === phoneNumber)?.profile.name || phoneNumber;

              // 1. Garante que o contato existe
              const { data: contactData } = await supabase.from('whatsapp_contacts').upsert({ phone_number: phoneNumber, name: contactName }, { onConflict: 'phone_number' }).select('id').single();
              if (!contactData) { console.error("Could not upsert contact"); continue; }

              // 2. Garante que uma conversa exista (ativa, reaberta ou nova)
              let conversationId: string | null = null;
              
              let { data: activeConversation } = await supabase.from('whatsapp_conversations').select('id').eq('contact_id', contactData.id).eq('is_active', true).single();

              if (activeConversation) {
                conversationId = activeConversation.id;
              } else {
                let { data: inactiveConversation } = await supabase.from('whatsapp_conversations').select('id').eq('contact_id', contactData.id).eq('is_active', false).order('last_message_at', { ascending: false }).limit(1).single();

                if (inactiveConversation) {
                  console.log(`Reabrindo conversa inativa: ${inactiveConversation.id}`);
                  const { data: reopenedConversation } = await supabase
                    .from('whatsapp_conversations')
                    .update({ is_active: true, unread_count: 0, assigned_to: null }) // Reabre e devolve para a fila
                    .eq('id', inactiveConversation.id)
                    .select('id')
                    .single();
                  conversationId = reopenedConversation?.id;
                } else {
                  console.log("Nenhuma conversa encontrada, criando uma nova...");
                  const { data: newConversation } = await supabase.from('whatsapp_conversations').insert({ contact_id: contactData.id }).select('id').single();
                  conversationId = newConversation?.id;
                }
              }

              if (!conversationId) { console.error("Could not find or create conversation ID"); continue; }
              const conversation = { id: conversationId }; // Objeto para compatibilidade

              // 3. Processa a mensagem com base no seu tipo
              if (message.type === 'image' || message.type === 'sticker') {
                const mediaId = message.type === 'image' ? message.image.id : message.sticker.id;
                const mimeType = message.type === 'image' ? message.image.mime_type : message.sticker.mime_type;
                if (!mediaId || !whatsappToken) continue;

                const mediaDetailsResponse = await fetch(`https://graph.facebook.com/v18.0/${mediaId}`, { headers: { 'Authorization': `Bearer ${whatsappToken}` }});
                const mediaDetails = await mediaDetailsResponse.json();
                if (!mediaDetails.url) continue;

                const fileResponse = await fetch(mediaDetails.url, { headers: { 'Authorization': `Bearer ${whatsappToken}` } });
                const fileBuffer = await fileResponse.arrayBuffer();
                const fileExtension = mimeType.split('/')[1] || 'webp';
                const fileName = `${mediaId}.${fileExtension}`;

                await supabase.storage.from('whatsapp_media').upload(fileName, fileBuffer, { contentType: mimeType, upsert: true });
                const { data: publicUrlData } = supabase.storage.from('whatsapp_media').getPublicUrl(fileName);

                await supabase.from('whatsapp_messages').insert({
                    conversation_id: conversation.id, whatsapp_message_id: message.id, content: publicUrlData.publicUrl, message_type: message.type, is_from_contact: true, timestamp: new Date(parseInt(message.timestamp) * 1000).toISOString(),
                });

              } else if (message.type === 'order') {
                const { data: newOrder } = await supabase.from('whatsapp_orders').insert({ conversation_id: conversation.id, whatsapp_order_id: message.id, products: message.order.product_items, status: 'recebido' }).select('id').single();
                if (newOrder) {
                  await supabase.from('whatsapp_messages').insert({
                    conversation_id: conversation.id, whatsapp_message_id: message.id, content: `Pedido recebido com ${message.order.product_items.length} item(ns).`, message_type: 'order', is_from_contact: true, timestamp: new Date(parseInt(message.timestamp) * 1000).toISOString(), metadata: { products: message.order.product_items, orderId: newOrder.id }
                  });
                }

              } else { // Mensagens de texto
                const content = message.text?.body || `[${message.type}]`;
                await supabase.from('whatsapp_messages').insert({
                    conversation_id: conversation.id, whatsapp_message_id: message.id, content: content, message_type: 'text', is_from_contact: true, timestamp: new Date(parseInt(message.timestamp) * 1000).toISOString(),
                });
              }

              // 4. Incrementa a contagem de não lidos e atualiza o timestamp
              await Promise.all([
                  supabase.from('whatsapp_conversations').update({ last_message_at: new Date().toISOString() }).eq('id', conversation.id),
                  supabase.rpc('increment_unread_count', { conv_id: conversation.id })
              ]);
            }
          }

          // Processa as atualizações de status das mensagens
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
    return new Response('Internal server error', { status: 500, headers: corsHeaders });
  }
});