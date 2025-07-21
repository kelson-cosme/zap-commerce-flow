// supabase/functions/whatsapp-add-product/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Product {
  name: string;
  description: string;
  price: number;
  image_url: string;
  retailer_id: string; // Adicionamos o retailer_id aqui
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const product: Product = await req.json();
    console.log("Payload recebido:", JSON.stringify(product, null, 2));

    const whatsappToken = Deno.env.get('WHATSAPP_API_TOKEN');
    const catalogId = Deno.env.get('WHATSAPP_CATALOG_ID');

    if (!whatsappToken || !catalogId) {
      console.error("Erro: Variáveis de ambiente do WhatsApp não configuradas.");
      return new Response('WhatsApp credentials not configured', { status: 500, headers: corsHeaders });
    }

    const productDataForMeta = {
      name: product.name,
      description: product.description,
      price: Math.round(product.price * 100),
      currency: 'BRL',
      image_url: product.image_url,
      retailer_id: product.retailer_id, // Usamos o retailer_id recebido
    };

    console.log("Enviando para a API da Meta:", JSON.stringify(productDataForMeta, null, 2));

    const response = await fetch(`https://graph.facebook.com/v20.0/${catalogId}/products`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${whatsappToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(productDataForMeta),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error("Erro da API da Meta:", JSON.stringify(responseData, null, 2));
      throw new Error(responseData.error.message || 'Falha ao comunicar com a API da Meta.');
    }
    
    console.log("Produto adicionado com sucesso:", JSON.stringify(responseData, null, 2));

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error("Erro na função:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});