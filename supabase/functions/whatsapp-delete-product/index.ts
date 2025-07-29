// supabase/functions/whatsapp-delete-product/index.ts
const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') { return new Response('ok', { headers: corsHeaders }); }

  try {
    const { productId } = await req.json();
    const whatsappToken = Deno.env.get('WHATSAPP_API_TOKEN');
    if (!whatsappToken) { throw new Error("Token do WhatsApp não configurado."); }

    const response = await fetch(
      `https://graph.facebook.com/v20.0/${productId}`,
      {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${whatsappToken}` },
      }
    );

    const data = await response.json();
    if (!response.ok) { throw new Error(data.error.message); }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});