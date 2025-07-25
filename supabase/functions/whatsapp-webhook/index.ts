// // supabase/functions/whatsapp-webhook/index.ts

// import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0'

// const corsHeaders = {
//   'Access-Control-Allow-Origin': '*',
//   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
// }

// // Interfaces para a estrutura de dados do webhook do WhatsApp
// interface WhatsAppWebhookEntry {
//   id: string;
//   changes: Array<{
//     value: {
//       messaging_product: string;
//       metadata: {
//         display_phone_number: string;
//         phone_number_id: string;
//       };
//       contacts?: Array<{
//         profile: {
//           name: string;
//         };
//         wa_id: string;
//       }>;
//       messages?: Array<WhatsAppTextMessage | WhatsAppOrderMessage>; // Aceita ambos os tipos de mensagem
//       statuses?: Array<{
//         id: string;
//         status: string;
//         timestamp: string;
//         recipient_id: string;
//       }>;
//     };
//     field: string;
//   }>;
// }

// interface WhatsAppWebhookPayload {
//   object: string;
//   entry: WhatsAppWebhookEntry[];
// }

// interface WhatsAppTextMessage {
//     from: string;
//     id: string;
//     timestamp: string;
//     text?: {
//       body: string;
//     };
//     type: 'text' | 'image' | 'audio' | 'video' | 'document' | 'unknown';
// }

// interface WhatsAppOrderMessage {
//   from: string;
//   id: string;
//   timestamp: string;
//   type: 'order';
//   order: {
//     catalog_id: string;
//     product_items: Array<{
//       product_retailer_id: string;
//       quantity: string;
//       item_price: string;
//       currency: string;
//     }>;
//   };
// }


// Deno.serve(async (req) => {
//   if (req.method === 'OPTIONS') {
//     return new Response(null, { headers: corsHeaders });
//   }

//   const supabase = createClient(
//     Deno.env.get('SUPABASE_URL') ?? '',
//     Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
//   )

//   try {
//     if (req.method === 'GET') {
//       // Verificação do Webhook (sem alterações)
//       const url = new URL(req.url);
//       const mode = url.searchParams.get('hub.mode');
//       const token = url.searchParams.get('hub.verify_token');
//       const challenge = url.searchParams.get('hub.challenge');

//       if (mode === 'subscribe' && token === 'whatsapp_verify_token') {
//         return new Response(challenge, { status: 200 });
//       } else {
//         return new Response('Forbidden', { status: 403 });
//       }
//     }

//     if (req.method === 'POST') {
//       const body: WhatsAppWebhookPayload = await req.json();
//       console.log('Received webhook:', JSON.stringify(body, null, 2));

//       for (const entry of body.entry) {
//         for (const change of entry.changes) {
//           const { value } = change;

//           // Processar mensagens recebidas (de texto ou de pedido)
//           if (value.messages) {
//             for (const message of value.messages) {
//               const phoneNumber = message.from;
//               let contactName = phoneNumber;

//               if (value.contacts) {
//                 const contact = value.contacts.find(c => c.wa_id === phoneNumber);
//                 if (contact) {
//                   contactName = contact.profile.name;
//                 }
//               }

//               // 1. Garante que o contato existe
//               const { data: contactData, error: contactError } = await supabase
//                 .from('whatsapp_contacts')
//                 .upsert({ phone_number: phoneNumber, name: contactName }, { onConflict: 'phone_number' })
//                 .select().single();

//               if (contactError) {
//                 console.error('Error upserting contact:', contactError);
//                 continue;
//               }

//               // 2. Garante que a conversa existe
//               let { data: conversationData, error: conversationError } = await supabase
//                 .from('whatsapp_conversations')
//                 .select('*').eq('contact_id', contactData.id).eq('is_active', true).single();

//               if (conversationError || !conversationData) {
//                 const { data: newConversation, error: newConversationError } = await supabase
//                   .from('whatsapp_conversations')
//                   .insert({ contact_id: contactData.id, last_message_at: new Date(parseInt(message.timestamp) * 1000).toISOString() })
//                   .select().single();
//                 if (newConversationError) {
//                   console.error('Error creating conversation:', newConversationError);
//                   continue;
//                 }
//                 conversationData = newConversation;
//               }

//               // --- LÓGICA PARA PROCESSAR PEDIDOS E MENSAGENS ---
//               // 3. Verifica o tipo de mensagem
//               if (message.type === 'order') {
//                 const orderMessage = message as WhatsAppOrderMessage;
//             // 1. Insere o pedido E OBTÉM o seu ID de volta
//             const { data: newOrder, error: orderError } = await supabase
//               .from('whatsapp_orders')
//               .insert({
//                 conversation_id: conversationData.id,
//                 whatsapp_order_id: orderMessage.id,
//                 products: orderMessage.order.product_items,
//                 status: 'received',
//               })
//               .select('id') // Pede para retornar o ID do novo pedido
//               .single();
            
//             if (orderError || !newOrder) {
//               console.error('Error inserting order:', orderError);
//             } else {
//               // 2. Cria a mensagem no chat, guardando o ID do pedido nos metadados
//               await supabase.from('whatsapp_messages').insert({
//                 conversation_id: conversationData.id,
//                 whatsapp_message_id: message.id,
//                 content: `Pedido recebido com ${orderMessage.order.product_items.length} item(ns).`,
//                 message_type: 'order',
//                 is_from_contact: true,
//                 timestamp: new Date(parseInt(message.timestamp) * 1000).toISOString(),
//                 metadata: { 
//                   products: orderMessage.order.product_items,
//                   orderId: newOrder.id // Guardamos o ID do pedido aqui!
//                 }
//               });
//             }
//           } else {
//                 // Lógica para mensagens de texto (sem alterações)
//                 const textMessage = message as WhatsAppTextMessage;
//                 const messageContent = textMessage.text?.body || `[${message.type}]`;
//                 await supabase.from('whatsapp_messages').insert({
//                     conversation_id: conversationData.id,
//                     whatsapp_message_id: message.id,
//                     content: messageContent,
//                     message_type: message.type,
//                     is_from_contact: true,
//                     timestamp: new Date(parseInt(message.timestamp) * 1000).toISOString(),
//                   });
//               }

//               // Atualiza a data da última mensagem na conversa
//               await supabase
//                 .from('whatsapp_conversations')
//                 .update({ last_message_at: new Date(parseInt(message.timestamp) * 1000).toISOString() })
//                 .eq('id', conversationData.id);
//             }
//           }

//           // Processar atualizações de status (sem alterações)
//           if (value.statuses) {
//             for (const status of value.statuses) {
//               await supabase
//                 .from('whatsapp_messages')
//                 .update({
//                   status: status.status,
//                 })
//                 .eq('whatsapp_message_id', status.id);
//             }
//           }
//         }
//       }

//       return new Response('OK', { status: 200, headers: corsHeaders });
//     }

//     return new Response('Method not allowed', { status: 405, headers: corsHeaders });

//   } catch (error) {
//     console.error('Webhook error:', error);
//     return new Response('Internal server error', { status: 500, headers: corsHeaders });
//   }
// });



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

      if (mode === 'subscribe' && token === Deno.env.get('WHATSAPP_VERIFY_TOKEN')) { // Use uma variável de ambiente para o token
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

              // 2. Garante que uma conversa ativa existe
              let { data: conversationData } = await supabase.from('whatsapp_conversations').select('id').eq('contact_id', contactData.id).single();
              if (!conversationData) {
                const { data: newConversation } = await supabase.from('whatsapp_conversations').insert({ contact_id: contactData.id }).select('id').single();
                conversationData = newConversation;
              }
              if (!conversationData) { console.error("Could not find or create conversation"); continue; }

              // 3. Processa a mensagem com base no seu tipo
              if (message.type === 'image' || message.type === 'sticker') {
                const mediaId = message.type === 'image' ? message.image.id : message.sticker.id;
                const mimeType = message.type === 'image' ? message.image.mime_type : message.sticker.mime_type;
                if (!mediaId || !whatsappToken) continue;

                const mediaDetailsResponse = await fetch(`https://graph.facebook.com/v18.0/${mediaId}`, { headers: { 'Authorization': `Bearer ${whatsappToken}` }});
                const mediaDetails = await mediaDetailsResponse.json();
                const mediaUrl = mediaDetails.url;
                if (!mediaUrl) continue;

                const fileResponse = await fetch(mediaUrl, { headers: { 'Authorization': `Bearer ${whatsappToken}` } });
                const fileBuffer = await fileResponse.arrayBuffer();
                const fileExtension = mimeType.split('/')[1] || 'webp';
                const fileName = `${mediaId}.${fileExtension}`;

                await supabase.storage.from('whatsappmedia').upload(fileName, fileBuffer, { contentType: mimeType, upsert: true });
                const { data: publicUrlData } = supabase.storage.from('whatsappmedia').getPublicUrl(fileName);

                await supabase.from('whatsapp_messages').insert({
                    conversation_id: conversationData.id,
                    whatsapp_message_id: message.id,
                    content: publicUrlData.publicUrl,
                    message_type: message.type,
                    is_from_contact: true,
                    timestamp: new Date(parseInt(message.timestamp) * 1000).toISOString(),
                });

              } else if (message.type === 'order') {
                await supabase.from('whatsapp_orders').insert({
                    conversation_id: conversationData.id,
                    whatsapp_order_id: message.id,
                    products: message.order.product_items,
                    status: 'received',
                });
                await supabase.from('whatsapp_messages').insert({
                    conversation_id: conversationData.id,
                    whatsapp_message_id: message.id,
                    content: `Pedido recebido com ${message.order.product_items.length} item(ns).`,
                    message_type: 'order',
                    is_from_contact: true,
                    timestamp: new Date(parseInt(message.timestamp) * 1000).toISOString(),
                    metadata: { products: message.order.product_items }
                });

              } else { // Mensagens de texto e outros tipos não tratados
                const content = message.text?.body || `[${message.type}]`;
                await supabase.from('whatsapp_messages').insert({
                    conversation_id: conversationData.id,
                    whatsapp_message_id: message.id,
                    content: content,
                    message_type: 'text', // Salva como texto por padrão
                    is_from_contact: true,
                    timestamp: new Date(parseInt(message.timestamp) * 1000).toISOString(),
                });
              }

              // 4. Atualiza o timestamp da última mensagem na conversa
              await supabase.from('whatsapp_conversations').update({ last_message_at: new Date().toISOString() }).eq('id', conversationData.id);
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