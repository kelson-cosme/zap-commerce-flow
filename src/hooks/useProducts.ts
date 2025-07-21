// src/hooks/useProducts.ts
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Definindo a estrutura de um Produto
export interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string;
  description: string;
  stock: number;
  active: boolean;
}

export const useProducts = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Busca todos os produtos do banco de dados.
   */
  const getProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.from('products').select('*');
      if (error) throw error;
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Cria um novo produto no banco de dados.
   */
  const createProduct = useCallback(async (productData: Omit<Product, 'id'>) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.from('products').insert([productData]).select().single();
      if (error) throw error;
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);


  return { getProducts, createProduct, loading, error };
};