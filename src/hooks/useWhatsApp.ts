// src/hooks/useWhatsApp.ts

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface WhatsAppContact {
  id: string;
  phone_number: string;
  name: string | null;
  profile_pic_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppConversation {
  id: string;
  contact_id: string;
  last_message_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  contact?: WhatsAppContact;
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

// A interface da mensagem para o frontend, usada no Index.tsx
export interface Message {
    id: string;
    text: string;
    timestamp: string;
    isSent: boolean;
    isDelivered?: boolean;
    isRead?: boolean;
    type?: 'text' | 'catalog' | 'payment' | 'order' | 'system';
    metadata?: any;
}


export const useWhatsApp = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (to: string, message: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-send', {
        body: { to, message, type: 'text' }
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

  const sendCatalog = useCallback(async (to: string) => {
    setLoading(true);
    setError(null);
    try {
      // Esta chamada é crucial. Ela deve enviar o tipo 'catalog'.
      const { data, error } = await supabase.functions.invoke('whatsapp-send', {
        body: { to, type: 'catalog' }
      });
      if (error) throw new Error(error.message);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send catalog';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);
  
  const addProductToCatalog = useCallback(async (product: { name: string; description: string; price: number; image_url: string; retailer_id: string; }) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-add-product', {
        body: product
      });
      if (error) throw new Error(error.message);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add product to catalog';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const getConversations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('whatsapp_conversations')
        .select(`*, contact:whatsapp_contacts(*)`)
        .eq('is_active', true)
        .order('last_message_at', { ascending: false });
      if (error) throw new Error(error.message);
      return data as (WhatsAppConversation & { contact: WhatsAppContact })[];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch conversations';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const getMessages = useCallback(async (conversationId: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('timestamp', { ascending: true });
      if (error) throw new Error(error.message);
      return data as WhatsAppMessage[];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch messages';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    sendMessage,
    sendCatalog,
    addProductToCatalog,
    getConversations,
    getMessages,
    loading,
    error,
  };
};