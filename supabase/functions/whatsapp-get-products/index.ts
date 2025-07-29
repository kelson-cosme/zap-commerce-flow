// supabase/functions/whatsapp-get-products/index.ts

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const whatsappToken = Deno.env.get('WHATSAPP_API_TOKEN');
    const catalogId = Deno.env.get('WHATSAPP_CATALOG_ID');
    if (!whatsappToken || !catalogId) {
      throw new Error("Credenciais do WhatsApp não configuradas.");
    }

    // --- CORREÇÃO AQUI ---
    // Adicionamos o parâmetro 'fields' para pedir todos os dados de que precisamos.
    const fieldsToRequest = 'id,retailer_id,name,description,image_url,price,formatted_price';
    const apiUrl = `https://graph.facebook.com/v20.0/${catalogId}/products?fields=${fieldsToRequest}`;
    // --- FIM DA CORREÇÃO ---

    const response = await fetch(
      apiUrl,
      { headers: { 'Authorization': `Bearer ${whatsappToken}` } }
    );
    
    const data = await response.json();
    if (!response.ok) {
      console.error("Erro da API da Meta:", data);
      throw new Error(data.error.message);
    }

    return new Response(JSON.stringify(data.data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});