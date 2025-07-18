import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SendMessageRequest {
  to: string;
  message: string;
  type?: 'text' | 'image' | 'audio' | 'video' | 'document';
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405,
      headers: corsHeaders 
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    const { to, message, type = 'text' }: SendMessageRequest = await req.json();

    if (!to || !message) {
      return new Response('Missing required fields: to, message', { 
        status: 400,
        headers: corsHeaders 
      });
    }

    const whatsappToken = Deno.env.get('WHATSAPP_API_TOKEN');
    const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');

    if (!whatsappToken || !phoneNumberId) {
      return new Response('WhatsApp credentials not configured', { 
        status: 500,
        headers: corsHeaders 
      });
    }

    // Send message to WhatsApp API
    const whatsappResponse = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${whatsappToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: to,
          type: 'text',
          text: {
            body: message,
          },
        }),
      }
    );

    const whatsappResult = await whatsappResponse.json();

    if (!whatsappResponse.ok) {
      console.error('WhatsApp API error:', whatsappResult);
      return new Response(JSON.stringify({ 
        error: 'Failed to send message',
        details: whatsappResult 
      }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Find or create contact
    const { data: contactData, error: contactError } = await supabase
      .from('whatsapp_contacts')
      .upsert({
        phone_number: to,
        name: to, // Will be updated when we receive a message from them
      }, {
        onConflict: 'phone_number',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (contactError) {
      console.error('Error upserting contact:', contactError);
      return new Response(JSON.stringify({ 
        error: 'Failed to save contact',
        whatsapp_message_id: whatsappResult.messages?.[0]?.id 
      }), { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get or create conversation
    let { data: conversationData, error: conversationError } = await supabase
      .from('whatsapp_conversations')
      .select('*')
      .eq('contact_id', contactData.id)
      .eq('is_active', true)
      .single();

    if (conversationError || !conversationData) {
      const { data: newConversation, error: newConversationError } = await supabase
        .from('whatsapp_conversations')
        .insert({
          contact_id: contactData.id,
          last_message_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (newConversationError) {
        console.error('Error creating conversation:', newConversationError);
        return new Response(JSON.stringify({ 
          error: 'Failed to create conversation',
          whatsapp_message_id: whatsappResult.messages?.[0]?.id 
        }), { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      conversationData = newConversation;
    }

    // Save message to database
    const { error: messageError } = await supabase
      .from('whatsapp_messages')
      .insert({
        conversation_id: conversationData.id,
        whatsapp_message_id: whatsappResult.messages?.[0]?.id,
        content: message,
        message_type: type,
        is_from_contact: false,
        status: 'sent',
        timestamp: new Date().toISOString(),
      });

    if (messageError) {
      console.error('Error saving message:', messageError);
    }

    // Update conversation last message time
    await supabase
      .from('whatsapp_conversations')
      .update({
        last_message_at: new Date().toISOString(),
      })
      .eq('id', conversationData.id);

    return new Response(JSON.stringify({
      success: true,
      whatsapp_message_id: whatsappResult.messages?.[0]?.id,
      message_id: whatsappResult.messages?.[0]?.id,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Send message error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});