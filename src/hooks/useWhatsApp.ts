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

  const sendMessage = useCallback(async (to: string, message: string) => {
    setLoading(true); setError(null);
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-send', { body: { to, message, type: 'text' } });
      if (error) throw new Error(error.message);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      setError(errorMessage); throw new Error(errorMessage);
    } finally { setLoading(false); }
  }, []);

  const sendCatalog = useCallback(async (to: string) => {
    setLoading(true); setError(null);
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-send', { body: { to, type: 'catalog' } });
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

  const sendPaymentLink = useCallback(async (to: string, paymentDetails: PaymentDetails, customerDetails: CustomerDetails, orderId: string) => {
    setLoading(true); setError(null);
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-send', { body: { to, type: 'payment', paymentDetails, customerDetails, orderId } });
      if (error) throw new Error(error.message);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send payment link';
      setError(errorMessage); throw new Error(errorMessage);
    } finally { setLoading(false); }
  }, []);

  const getConversations = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const { data, error } = await supabase.from('conversations_with_last_message').select('*').order('last_message_at', { ascending: false });
      if (error) throw new Error(error.message);
      const formattedData = data.map(item => ({
        id: item.conversation_id, contact_id: item.contact_id, last_message_at: item.last_message_at, is_active: item.is_active, created_at: item.created_at, updated_at: item.updated_at, unread_count: item.unread_count,
        contact: { id: item.contact_id, phone_number: item.phone_number, name: item.name, profile_pic_url: item.profile_pic_url, created_at: item.contact_created_at, updated_at: item.contact_updated_at, cpf_cnpj: item.cpf_cnpj, },
        last_message: { content: item.last_message_content, }
      }));
      return formattedData as (WhatsAppConversation & { contact: WhatsAppContact, last_message: { content: string } })[];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch conversations';
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