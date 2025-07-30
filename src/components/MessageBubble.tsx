// src/components/MessageBubble.tsx

import { cn } from "@/lib/utils";
import { Check, CheckCheck, ShoppingCart, BookOpen, CreditCard, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface Message {
  id: string;
  text: string;
  timestamp: string;
  isSent: boolean;
  isDelivered?: boolean;
  isRead?: boolean;
  type?: 'text' | 'catalog' | 'payment' | 'order' | 'system' | 'image' | 'sticker';
  metadata?: {
    products?: Array<{
      product_retailer_id: string;
      quantity: string;
      item_price: string;
      currency: string;
    }>;
    orderId?: string;
    paymentDetails?: {
        amount: number;
        description: string;
        link: string;
    };
  };
}

interface MessageBubbleProps {
  message: Message;
  agentName?: string;
  onViewOrder?: (orderId: string) => void;
}

export function MessageBubble({ message, agentName, onViewOrder }: MessageBubbleProps) {
  const formatTime = (timestamp: string) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // --- Renderizador para IMAGENS e FIGURINHAS recebidas ---
  if ((message.type === 'image' || message.type === 'sticker') && !message.isSent) {
    return (
      <div className={cn("flex mb-4 animate-message-slide-in justify-start")}>
        <div className={cn("max-w-xs p-2 rounded-lg shadow-message bg-message-received")}>
          <a href={message.text} target="_blank" rel="noopener noreferrer">
            <img 
              src={message.text}
              alt={message.type === 'image' ? "Imagem enviada pelo cliente" : "Figurinha enviada pelo cliente"}
              className="rounded-md max-w-full h-auto cursor-pointer"
              style={{ maxWidth: '250px', maxHeight: '250px' }}
            />
          </a>
          <div className="flex items-center justify-end mt-1">
            <span className="text-xs opacity-70 text-message-received-foreground">{formatTime(message.timestamp)}</span>
          </div>
        </div>
      </div>
    );
  }
  
  // --- Renderizador para CATÁLOGO ENVIADO por si ---
  if (message.type === 'catalog' && message.isSent) {
    return (
        <div className={cn("flex mb-4 animate-message-slide-in justify-end")}>
            <div className="max-w-xs lg:max-w-md px-4 py-3 rounded-lg shadow-message bg-message-sent text-message-sent-foreground">
                <div className="flex items-center gap-3 font-medium mb-2 border-b pb-2 border-white/20">
                    <BookOpen className="h-5 w-5"/>
                    <h4 className="font-semibold">Catálogo Enviado</h4>
                </div>
                {agentName && (
                    <p className="text-xs font-bold text-teal-300 mt-2 mb-1 italic">
                        Atendente: {agentName}
                    </p>
                )}
                <p className="text-sm opacity-90">
                    Você enviou o catálogo de produtos para este cliente.
                </p>
                <div className="flex items-center justify-end mt-2 gap-2">
                    <span className="text-xs opacity-70">{formatTime(message.timestamp)}</span>
                    {message.isSent && (
                        <div className="text-xs">
                            {message.isRead ? <CheckCheck className="h-4 w-4 text-blue-400" /> : message.isDelivered ? <CheckCheck className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
  }
  
  // --- Renderizador para PEDIDO RECEBIDO do cliente ---
  if (message.type === 'order' && message.metadata?.products) {
    const total = message.metadata.products.reduce((acc, item) => {
        return acc + (parseFloat(item.item_price) * parseInt(item.quantity, 10));
    }, 0);

    return (
      <div className={cn("flex mb-4 animate-message-slide-in justify-start")}>
        <div className="max-w-xs lg:max-w-md px-4 py-3 rounded-lg shadow-message bg-message-received text-message-received-foreground">
            <div className="flex items-center gap-3 font-medium mb-2 border-b pb-2 border-gray-500/20">
                <ShoppingCart className="h-5 w-5 text-primary"/>
                <h4 className="font-semibold">Pedido Recebido</h4>
            </div>
            <div className="space-y-2 my-2">
                {message.metadata.products.map(item => (
                    <div key={item.product_retailer_id} className="text-sm flex justify-between items-center">
                        <div><span className="font-medium">{item.quantity}x</span> {item.product_retailer_id}</div>
                        <div className="font-semibold">R$ {(parseFloat(item.item_price) * parseInt(item.quantity, 10)).toFixed(2)}</div>
                    </div>
                ))}
            </div>
            <div className="flex justify-between items-center mt-3 pt-2 border-t border-gray-500/20">
                <span className="text-sm font-bold">Total: R$ {total.toFixed(2)}</span>
                <span className="text-xs opacity-70">{formatTime(message.timestamp)}</span>
            </div>
             <Button 
                size="sm" 
                className="w-full mt-3"
                onClick={() => onViewOrder && message.metadata?.orderId && onViewOrder(message.metadata.orderId)}
                disabled={!onViewOrder || !message.metadata?.orderId}
            >
                Ver Pedido no Painel
            </Button>
        </div>
      </div>
    )
  }

  // --- Renderizador para PAGAMENTO ENVIADO por si ---
  if (message.type === 'payment' && message.metadata?.paymentDetails) {
    const details = message.metadata.paymentDetails;
    const formattedAmount = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(details.amount);
    return (
        <div className={cn("flex mb-4 animate-message-slide-in justify-end")}>
            <div className="max-w-xs lg:max-w-md px-4 py-3 rounded-lg shadow-message bg-message-sent text-message-sent-foreground">
                <div className="flex items-center gap-3 font-medium mb-2 border-b pb-2 border-white/20">
                    <CreditCard className="h-5 w-5"/>
                    <h4 className="font-semibold">Link de Pagamento Enviado</h4>
                </div>
                {agentName && (
                    <p className="text-xs font-bold text-teal-300 mt-2 mb-1 italic">
                        Atendente: {agentName}
                    </p>
                )}
                <div className="space-y-1 my-2 text-sm">
                    <p><strong>Descrição:</strong> {details.description}</p>
                    <p><strong>Valor:</strong> {formattedAmount}</p>
                </div>
                <Button size="sm" className="w-full mt-3 bg-white/20 hover:bg-white/30" asChild>
                    <a href={details.link} target="_blank" rel="noopener noreferrer">Ver Link</a>
                </Button>
            </div>
        </div>
    );
  }

  // --- Renderizador para mensagens de TEXTO (padrão) ---
  return (
    <div className={cn(
      "flex mb-4 animate-message-slide-in",
      message.isSent ? "justify-end" : "justify-start"
    )}>
      <div className={cn(
        "max-w-xs lg:max-w-md px-4 py-3 rounded-lg shadow-message",
        message.isSent 
          ? "bg-message-sent text-message-sent-foreground" 
          : "bg-message-received text-message-received-foreground"
      )}>
        {message.isSent && agentName && (
            <p className="text-xs font-bold text-teal-300 mb-1 italic">
                Atendente: {agentName}
            </p>
        )}
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.text}</p>
        <div className="flex items-center justify-end mt-2 gap-2">
          <span className="text-xs opacity-70">{formatTime(message.timestamp)}</span>
          {message.isSent && (
            <div className="text-xs">{message.isRead ? <CheckCheck className="h-4 w-4 text-blue-400" /> : message.isDelivered ? <CheckCheck className="h-4 w-4" /> : <Check className="h-4 w-4" />}</div>
          )}
        </div>
      </div>
    </div>
  );
}