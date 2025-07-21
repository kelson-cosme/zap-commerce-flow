// src/components/ProductForm.tsx
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea"; // Um campo de texto maior para a descrição
import { Product } from "@/hooks/useProducts";
import { useState, useEffect } from "react";

// Propriedades que nosso formulário irá receber
interface ProductFormProps {
  product?: Product | null; // Produto existente para edição (opcional)
  onSubmit: (productData: Omit<Product, 'id'>) => void; // Função para salvar
  onCancel: () => void; // Função para cancelar
  loading: boolean; // Para mostrar o estado de carregamento
}

export function ProductForm({ product, onSubmit, onCancel, loading }: ProductFormProps) {
  // Estados para cada campo do formulário
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState(0);
  const [stock, setStock] = useState(0);
  const [imageUrl, setImageUrl] = useState('');

  // Se um produto for passado (para edição), preenchemos o formulário com seus dados
  useEffect(() => {
    if (product) {
      setName(product.name);
      setDescription(product.description || '');
      setPrice(product.price);
      setStock(product.stock);
      setImageUrl(product.image_url || '');
    }
  }, [product]);

  // Função chamada ao enviar o formulário
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ name, description, price, stock, image_url: imageUrl, active: true });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Nome do Produto</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div>
        <Label htmlFor="description">Descrição</Label>
        <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="price">Preço</Label>
        <Input id="price" type="number" step="0.01" value={price} onChange={(e) => setPrice(parseFloat(e.target.value))} required />
      </div>
      <div>
        <Label htmlFor="stock">Estoque</Label>
        <Input id="stock" type="number" value={stock} onChange={(e) => setStock(parseInt(e.target.value, 10))} required />
      </div>
       <div>
        <Label htmlFor="imageUrl">URL da Imagem</Label>
        <Input id="imageUrl" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://exemplo.com/imagem.png"/>
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={loading}>{loading ? 'Salvando...' : 'Salvar Produto'}</Button>
      </div>
    </form>
  );
}