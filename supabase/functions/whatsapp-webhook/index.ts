import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WhatsAppWebhookEntry {
  id: string;
  changes: Array<{
    value: {
      messaging_product: string;
      metadata: {
        display_phone_number: string;
        phone_number_id: string;
      };
      contacts?: Array<{
        profile: {
          name: string;
        };
        wa_id: string;
      }>;
      messages?: Array<{
        from: string;
        id: string;
        timestamp: string;
        text?: {
          body: string;
        };
        type: string;
      }>;
      statuses?: Array<{
        id: string;
        status: string;
        timestamp: string;
        recipient_id: string;
      }>;
    };
    field: string;
  }>;
}

interface WhatsAppWebhookPayload {
  object: string;
  entry: WhatsAppWebhookEntry[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    if (req.method === 'GET') {
      // Webhook verification
      const url = new URL(req.url);
      const mode = url.searchParams.get('hub.mode');
      const token = url.searchParams.get('hub.verify_token');
      const challenge = url.searchParams.get('hub.challenge');

      if (mode === 'subscribe' && token === 'whatsapp_verify_token') {
        console.log('Webhook verified successfully');
        return new Response(challenge, { status: 200 });
      } else {
        console.log('Webhook verification failed');
        return new Response('Forbidden', { status: 403 });
      }
    }

    if (req.method === 'POST') {
      const body: WhatsAppWebhookPayload = await req.json();
      console.log('Received webhook:', JSON.stringify(body, null, 2));

      for (const entry of body.entry) {
        for (const change of entry.changes) {
          const { value } = change;

          // Process incoming messages
          if (value.messages) {
            for (const message of value.messages) {
              const phoneNumber = message.from;
              let contactName = phoneNumber;

              // Get contact name if available
              if (value.contacts) {
                const contact = value.contacts.find(c => c.wa_id === phoneNumber);
                if (contact) {
                  contactName = contact.profile.name;
                }
              }

              // Upsert contact
              const { data: contactData, error: contactError } = await supabase
                .from('whatsapp_contacts')
                .upsert({
                  phone_number: phoneNumber,
                  name: contactName,
                }, {
                  onConflict: 'phone_number',
                  ignoreDuplicates: false
                })
                .select()
                .single();

              if (contactError) {
                console.error('Error upserting contact:', contactError);
                continue;
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
                    last_message_at: new Date(parseInt(message.timestamp) * 1000).toISOString(),
                  })
                  .select()
                  .single();

                if (newConversationError) {
                  console.error('Error creating conversation:', newConversationError);
                  continue;
                }
                conversationData = newConversation;
              }

              // Insert message
              const messageContent = message.text?.body || `[${message.type}]`;
              const { error: messageError } = await supabase
                .from('whatsapp_messages')
                .insert({
                  conversation_id: conversationData.id,
                  whatsapp_message_id: message.id,
                  content: messageContent,
                  message_type: message.type,
                  is_from_contact: true,
                  timestamp: new Date(parseInt(message.timestamp) * 1000).toISOString(),
                });

              if (messageError) {
                console.error('Error inserting message:', messageError);
              }

              // Update conversation last message time
              await supabase
                .from('whatsapp_conversations')
                .update({
                  last_message_at: new Date(parseInt(message.timestamp) * 1000).toISOString(),
                })
                .eq('id', conversationData.id);
            }
          }

          // Process message status updates
          if (value.statuses) {
            for (const status of value.statuses) {
              await supabase
                .from('whatsapp_messages')
                .update({
                  status: status.status,
                })
                .eq('whatsapp_message_id', status.id);
            }
          }
        }
      }

      return new Response('OK', { 
        status: 200,
        headers: corsHeaders 
      });
    }

    return new Response('Method not allowed', { 
      status: 405,
      headers: corsHeaders 
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response('Internal server error', { 
      status: 500,
      headers: corsHeaders 
    });
  }
});