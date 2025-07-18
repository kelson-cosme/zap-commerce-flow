// File: supabase/functions/whatsapp-send/index.ts

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
  console.log("Function invoked. Method:", req.method);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const { to, message, type = 'text' }: SendMessageRequest = await req.json();
    console.log(`Request received for type: ${type}, to: ${to}`);

    if (!to) {
      console.error("'to' field is missing.");
      return new Response("'to' field is missing", { status: 400, headers: corsHeaders });
    }

    const whatsappToken = Deno.env.get('WHATSAPP_API_TOKEN');
    const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');

    if (!whatsappToken || !phoneNumberId) {
      console.error("WhatsApp credentials are not configured in environment variables.");
      return new Response('WhatsApp credentials not configured', { status: 500, headers: corsHeaders });
    }
    console.log("Credentials loaded.");

    let requestBody;
    if (type === 'catalog') {
      requestBody = { /* ... seu requestBody para catalogo ... */ };
    } else {
      requestBody = { /* ... seu requestBody para texto ... */ };
    }
     
    console.log("Sending request to WhatsApp API...");
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

    console.log("Message sent via WhatsApp successfully. WA Message ID:", whatsappResult.messages?.[0]?.id);

    try {
      console.log("Upserting contact...");
      const { data: contactData, error: contactError } = await supabase
        .from('whatsapp_contacts')
        .upsert({ phone_number: to, name: to }, { onConflict: 'phone_number' })
        .select().single();

      if (contactError) throw new Error(`Contact upsert failed: ${contactError.message}`);
      console.log("Contact upserted successfully. Contact ID:", contactData.id);

      console.log("Finding or creating conversation...");
      let { data: conversationData, error: conversationError } = await supabase
        .from('whatsapp_conversations')
        .select('*')
        .eq('contact_id', contactData.id)
        .eq('is_active', true)
        .single();
      
      if (conversationError && conversationError.code !== 'PGRST116') { // PGRST116 is "No rows found"
         throw new Error(`Error fetching conversation: ${conversationError.message}`);
      }

      if (!conversationData) {
        console.log("No active conversation found, creating new one...");
        const { data: newConversation, error: newConvError } = await supabase
          .from('whatsapp_conversations')
          .insert({ contact_id: contactData.id, last_message_at: new Date().toISOString() })
          .select().single();
        if (newConvError) throw new Error(`Conversation creation failed: ${newConvError.message}`);
        conversationData = newConversation;
        console.log("New conversation created. Conversation ID:", conversationData.id);
      } else {
        console.log("Active conversation found. Conversation ID:", conversationData.id);
      }

      console.log("Inserting message into database...");
      await supabase.from('whatsapp_messages').insert({
          conversation_id: conversationData.id,
          whatsapp_message_id: whatsappResult.messages?.[0]?.id,
          content: type === 'catalog' ? 'Catálogo de produtos enviado.' : message,
          message_type: type,
          is_from_contact: false,
          status: 'sent',
          timestamp: new Date().toISOString(),
      });
      console.log("Message inserted successfully.");

      console.log("Updating conversation timestamp...");
      await supabase.from('whatsapp_conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationData.id);
      console.log("Timestamp updated.");

    } catch (dbError) {
      console.error("Database operation failed:", dbError.message);
      // Retornamos sucesso para o front-end, pois a mensagem do WhatsApp foi enviada, mas logamos o erro de DB.
      return new Response(JSON.stringify({ success: true, warning: 'Message sent but failed to save to DB', dbError: dbError.message }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});

  } catch (error) {
    console.error("Unhandled error in function:", error.message);
    return new Response(JSON.stringify({ error: 'Internal Server Error', details: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
  }
});