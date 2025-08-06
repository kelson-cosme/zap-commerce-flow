// src/hooks/useWhatsApp.ts

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

// --- Interfaces ---
export interface WhatsAppContact {
  id: string;
  phone_number: string;
  name: string | null;
  profile_pic_url: string | null;
  created_at: string;
  updated_at: string;
  cpf_cnpj?: string;
}

export interface WhatsAppConversation {
  id: string;
  contact_id: string;
  last_message_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  contact?: WhatsAppContact;
  last_message?: { content: string };
  unread_count?: number;
  assigned_to?: string;
}

export interface WhatsAppMessage {
  id: string;
  conversation_id: string;
  whatsapp_message_id: string | null;
  content: string;
  message_type: string;
  is_from_contact: boolean;
  status: string;
  timestamp: string | null;
  created_at: string;
  updated_at: string;
  metadata?: any;
}

export interface Message {
    id: string;
    text: string;
    timestamp: string;
    isSent: boolean;
    isDelivered?: boolean;
    isRead?: boolean;
    type?: 'text' | 'catalog' | 'payment' | 'order' | 'system' | 'image' | 'sticker';
    metadata?: any;
}

interface PaymentDetails {
    amount: number;
    description: string;
}

interface CustomerDetails {
    name: string;
    cpfCnpj: string;
    mobilePhone: string;
}

// --- Hook ---
export const useWhatsApp = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // const getAuthHeaders = async () => {
  //   const { data: { session } } = await supabase.auth.getSession();
  //   if (!session) {
  //     throw new Error('Utilizador não autenticado.');
  //   }
  //   return {
  //     'Authorization': `Bearer ${session.accessToken}`,
  //   };
  // };

  // --- FUNÇÃO getConversations CORRIGIDA ---
  const getConversations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: conversations, error } = await supabase
        .from('whatsapp_conversations')
        .select(`
          *,
          contact:whatsapp_contacts(*)
        `)
        .eq('is_active', true) // Apenas conversas ativas
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (error) throw new Error(error.message);
      if (!conversations) return [];

      for (const conv of conversations) {
        const { data: lastMessageArray, error: msgError } = await supabase
            .from('whatsapp_messages')
            .select('content')
            .eq('conversation_id', conv.id)
            .order('timestamp', { ascending: false })
            .limit(1);

        if (msgError) {
          console.warn(`Could not fetch last message for conv ${conv.id}:`, msgError.message);
          (conv as any).last_message = { content: '...' };
        } else {
          // Pega o primeiro item do array, que pode ser nulo se não houver mensagens
          const lastMessage = lastMessageArray?.[0];
          (conv as any).last_message = lastMessage || { content: 'Nenhuma mensagem ainda' };
        }
      }

      return conversations as (WhatsAppConversation & { contact: WhatsAppContact, last_message: { content: string } })[];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch conversations';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // --- O RESTANTE DO HOOK (sem alterações) ---
// src/hooks/useWhatsApp.ts

const sendMessage = useCallback(async (to: string, message: string) => {
  setLoading(true);
  setError(null);
  try {
    // Obter a sessão atual para garantir que temos o token mais recente
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error("Utilizador não autenticado.");
    }

    const headers = {
      Authorization: `Bearer ${session.access_token}`,
    };

    const { data, error } = await supabase.functions.invoke('whatsapp-send', {
      body: { to, message, type: 'text' },
      headers, // Adicionar os cabeçalhos aqui
    });

    if (error) throw new Error(error.message);
    return data;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
    setError(errorMessage);
    throw new Error(errorMessage);
  } finally {
    setLoading(false);
  }
}, []);

// Faça o mesmo para as outras funções que chamam 'whatsapp-send' (sendCatalog, sendPaymentLink, etc.)

  const sendCatalog = useCallback(async (to: string) => {
    setLoading(true); setError(null);
    try {

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error("Utilizador não autenticado.");
    }

    const headers = {
      Authorization: `Bearer ${session.access_token}`,
    };
    
    const { data, error } = await supabase.functions.invoke('whatsapp-send', { 
        headers, // Envia o cabeçalho de autenticação
        body: { to, type: 'catalog' } 
      });
      if (error) throw new Error(error.message);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send catalog';
      setError(errorMessage); throw new Error(errorMessage);
    } finally { setLoading(false); }
  }, []);

  const addProductToCatalog = useCallback(async (product: { name: string; description: string; price: number; image_url: string; retailer_id: string; }) => {
    setLoading(true); setError(null);
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-add-product', { body: product });
      if (error) throw new Error(error.message);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add product to catalog';
      setError(errorMessage); throw new Error(errorMessage);
    } finally { setLoading(false); }
  }, []);

  const sendPaymentLink = useCallback(async (to: string, paymentDetails: any, customerDetails: any, orderId: string) => {
    setLoading(true); setError(null);
    
    
    try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error("Utilizador não autenticado.");
    }
    
    const headers = {
      Authorization: `Bearer ${session.access_token}`,
    };
    
      const { data, error } = await supabase.functions.invoke('whatsapp-send', { 
        headers, // Envia o cabeçalho de autenticação
        body: { to, type: 'payment', paymentDetails, customerDetails, orderId } 
      });
      if (error) throw new Error(error.message);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send payment link';
      setError(errorMessage); throw new Error(errorMessage);
    } finally { setLoading(false); }
  }, []);

  const getMessages = useCallback(async (conversationId: string) => {
    setLoading(true); setError(null);
    try {
      const { data, error } = await supabase.from('whatsapp_messages').select('*').eq('conversation_id', conversationId).order('timestamp', { ascending: true });
      if (error) throw new Error(error.message);
      return data as WhatsAppMessage[];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch messages';
      setError(errorMessage); throw new Error(errorMessage);
    } finally { setLoading(false); }
  }, []);

  const getProducts = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-get-products');
      if (error) throw new Error(error.message);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch products';
      setError(errorMessage); throw new Error(errorMessage);
    } finally { setLoading(false); }
  }, []);

  const updateProduct = useCallback(async (productId: string, fieldsToUpdate: any) => {
    setLoading(true); setError(null);
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-update-product', { body: { productId, fieldsToUpdate } });
      if (error) throw new Error(error.message);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update product';
      setError(errorMessage); throw new Error(errorMessage);
    } finally { setLoading(false); }
  }, []);

  const deleteProduct = useCallback(async (productId: string) => {
    setLoading(true); setError(null);
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-delete-product', { body: { productId } });
      if (error) throw new Error(error.message);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete product';
      setError(errorMessage); throw new Error(errorMessage);
    } finally { setLoading(false); }
  }, []);

  return {
    sendMessage,
    sendCatalog,
    addProductToCatalog,
    sendPaymentLink,
    getConversations,
    getMessages,
    getProducts,
    updateProduct,
    deleteProduct,
    loading,
    error,
  };
};

