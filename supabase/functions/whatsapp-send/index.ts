// import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0'

// const corsHeaders = {
//   'Access-Control-Allow-Origin': '*',
//   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
// }

// interface SendMessageRequest {
//   to: string;
//   message?: string;
//   type?: 'text' | 'catalog';
// }

// Deno.serve(async (req) => {
//   // Handle CORS preflight requests
//   if (req.method === 'OPTIONS') {
//     return new Response(null, { headers: corsHeaders });
//   }

//   const supabase = createClient(
//     Deno.env.get('SUPABASE_URL') ?? '',
//     Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
//   );

//   try {
//     const { to, message, type = 'text' }: SendMessageRequest = await req.json();
//     console.log(`Request received for type: ${type}, to: ${to}`);

//     if (!to || !message) {
//       return new Response('Missing required fields: to, message', { 
//         status: 400,
//         headers: corsHeaders 
//       });
//     }

//     const whatsappToken = Deno.env.get('WHATSAPP_API_TOKEN');
//     const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');

//     if (!whatsappToken || !phoneNumberId) {
//       return new Response('WhatsApp credentials not configured', { 
//         status: 500,
//         headers: corsHeaders 
//       });
//     }

//     // Send message to WhatsApp API
//     const whatsappResponse = await fetch(
//       `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
//       {
//         method: 'POST',
//         headers: { 'Authorization': `Bearer ${whatsappToken}`, 'Content-Type': 'application/json' },
//         body: JSON.stringify(requestBody),
//       }
//     );

//     const whatsappResult = await whatsappResponse.json();

//     if (!whatsappResponse.ok) {
//       console.error('WhatsApp API returned an error:', JSON.stringify(whatsappResult, null, 2));
//       return new Response(JSON.stringify({ error: 'Failed to send message', details: whatsappResult }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
//     }

//     // Find or create contact
//     const { data: contactData, error: contactError } = await supabase
//       .from('whatsapp_contacts')
//       .upsert({
//         phone_number: to,
//         name: to, // Will be updated when we receive a message from them
//       }, {
//         onConflict: 'phone_number',
//         ignoreDuplicates: false
//       })
//       .select()
//       .single();

//     if (contactError) {
//       console.error('Error upserting contact:', contactError);
//       return new Response(JSON.stringify({ 
//         error: 'Failed to save contact',
//         whatsapp_message_id: whatsappResult.messages?.[0]?.id 
//       }), { 
//         status: 200,
//         headers: { ...corsHeaders, 'Content-Type': 'application/json' }
//       });
//     }

//     // Get or create conversation
//     let { data: conversationData, error: conversationError } = await supabase
//       .from('whatsapp_conversations')
//       .select('*')
//       .eq('contact_id', contactData.id)
//       .eq('is_active', true)
//       .single();

//     if (conversationError || !conversationData) {
//       const { data: newConversation, error: newConversationError } = await supabase
//         .from('whatsapp_conversations')
//         .insert({
//           contact_id: contactData.id,
//           last_message_at: new Date().toISOString(),
//         })
//         .select()
//         .single();

//       if (newConversationError) {
//         console.error('Error creating conversation:', newConversationError);
//         return new Response(JSON.stringify({ 
//           error: 'Failed to create conversation',
//           whatsapp_message_id: whatsappResult.messages?.[0]?.id 
//         }), { 
//           status: 200,
//           headers: { ...corsHeaders, 'Content-Type': 'application/json' }
//         });
//       }
//       conversationData = newConversation;
//     }

//       console.log("Inserting message into database...");
//       await supabase.from('whatsapp_messages').insert({
//           conversation_id: conversationData.id,
//           whatsapp_message_id: whatsappResult.messages?.[0]?.id,
//           content: type === 'catalog' ? 'Catálogo de produtos enviado.' : message,
//           message_type: type,
//           is_from_contact: false,
//           status: 'sent',
//           timestamp: new Date().toISOString(),
//       });
//       console.log("Message inserted successfully.");

//     // Update conversation last message time
//     await supabase
//       .from('whatsapp_conversations')
//       .update({
//         last_message_at: new Date().toISOString(),
//       })
//       .eq('id', conversationData.id);

//     return new Response(JSON.stringify({
//       success: true,
//       whatsapp_message_id: whatsappResult.messages?.[0]?.id,
//       message_id: whatsappResult.messages?.[0]?.id,
//     }), {
//       status: 200,
//       headers: { ...corsHeaders, 'Content-Type': 'application/json' }
//     });

//   } catch (error) {
//     console.error("Unhandled error in function:", error.message);
//     return new Response(JSON.stringify({ error: 'Internal Server Error', details: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
//   }
// });

// supabase/functions/whatsapp-send/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SendMessageRequest {
  to: string;
  message?: string;
  type?: 'text' | 'catalog';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const { to, message, type = 'text' }: SendMessageRequest = await req.json();

    if (!to) {
      return new Response("'to' field is missing", { status: 400, headers: corsHeaders });
    }

    const whatsappToken = Deno.env.get('WHATSAPP_API_TOKEN');
    const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');

    if (!whatsappToken || !phoneNumberId) {
      console.error("WhatsApp credentials are not configured in environment variables.");
      return new Response('WhatsApp credentials not configured', { status: 500, headers: corsHeaders });
    }

    let requestBody;

    // Lógica para construir a requisição correta baseada no tipo
    if (type === 'catalog') {
      requestBody = {
        messaging_product: "whatsapp",
        to: to,
        type: "interactive",
        interactive: {
          type: "catalog_message",
          body: {
            text: "Olá! Confira nosso catálogo de produtos. Se tiver alguma dúvida, é só perguntar!"
          },
          action: {
            name: "catalog_message"
          },
          footer: {
            text: "Toque no botão abaixo para ver os itens."
          }
        }
      };
    } else { // O padrão é 'text'
      if (!message) {
        return new Response("'message' field is missing for text message", { status: 400, headers: corsHeaders });
      }
      requestBody = {
        messaging_product: "whatsapp",
        to: to,
        type: "text",
        text: {
          "preview_url": false,
          "body": message
        }
      };
    }
     
    const whatsappResponse = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${whatsappToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      }
    );

    const whatsappResult = await whatsappResponse.json();

    if (!whatsappResponse.ok) {
      console.error('WhatsApp API returned an error:', JSON.stringify(whatsappResult, null, 2));
      return new Response(JSON.stringify({ error: 'Failed to send message', details: whatsappResult }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
    }

    // A partir daqui, o código salva a mensagem enviada no seu banco de dados
    try {
      const { data: contactData } = await supabase
        .from('whatsapp_contacts')
        .upsert({ phone_number: to, name: to }, { onConflict: 'phone_number' })
        .select().single();

      let { data: conversationData } = await supabase
        .from('whatsapp_conversations')
        .select('*')
        .eq('contact_id', contactData!.id)
        .eq('is_active', true)
        .single();
      
      if (!conversationData) {
        const { data: newConversation } = await supabase
          .from('whatsapp_conversations')
          .insert({ contact_id: contactData!.id, last_message_at: new Date().toISOString() })
          .select().single();
        conversationData = newConversation;
      }

      await supabase.from('whatsapp_messages').insert({
          conversation_id: conversationData!.id,
          whatsapp_message_id: whatsappResult.messages?.[0]?.id,
          content: type === 'catalog' ? 'Catálogo de produtos enviado.' : message,
          message_type: type,
          is_from_contact: false,
          status: 'sent',
          timestamp: new Date().toISOString(),
      });

      await supabase.from('whatsapp_conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationData!.id);

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