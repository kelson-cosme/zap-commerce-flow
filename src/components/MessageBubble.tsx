import { cn } from "@/lib/utils";
import { Check, CheckCheck, ShoppingCart, BookOpen } from "lucide-react"; // Adicionado ShoppingCart e BookOpen
import { Button } from "@/components/ui/button"; // Importado o Button

export interface Message {
  id: string;
  text: string;
  timestamp: string;
  isSent: boolean;
  isDelivered?: boolean;
  isRead?: boolean;
  type?: 'text' | 'catalog' | 'payment' | 'order' | 'system'; // Adicionado 'order' e 'system'
  catalogData?: {
    products: Array<{
      id: string;
      name: string;
      price: number;
      image: string;
    }>;
  };
  paymentData?: {
    amount: number;
    description: string;
    link: string;
  };
  metadata?: { // Adicionada a propriedade metadata
    products?: Array<{
      product_retailer_id: string;
      quantity: string;
      item_price: string;
      currency: string;
    }>;
  };
}

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Renderizador para mensagens de CATÁLOGO ENVIADO
  if (message.type === 'catalog' && message.isSent) {
    return (
        <div className={cn("flex mb-4 animate-message-slide-in justify-end")}>
            <div className={cn("max-w-xs lg:max-w-md px-4 py-3 rounded-lg shadow-message bg-message-sent text-message-sent-foreground")}>
                <div className="flex items-center gap-3 font-medium mb-2 border-b pb-2 border-white/20">
                    <BookOpen className="h-5 w-5"/>
                    <h4 className="font-semibold">Catálogo Enviado</h4>
                </div>
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
  
  // Renderizador para mensagens de PEDIDO RECEBIDO
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
                        <div>
                            <span className="font-medium">{item.quantity}x</span> {item.product_retailer_id}
                        </div>
                        <div className="font-semibold">
                            R$ {(parseFloat(item.item_price) * parseInt(item.quantity, 10)).toFixed(2)}
                        </div>
                    </div>
                ))}
            </div>
            <div className="flex justify-between items-center mt-3 pt-2 border-t border-gray-500/20">
                <span className="text-sm font-bold">Total: R$ {total.toFixed(2)}</span>
                <span className="text-xs opacity-70">{formatTime(message.timestamp)}</span>
            </div>
             <Button size="sm" className="w-full mt-3">Ver Pedido no Painel</Button>
        </div>
      </div>
    )
  }

  // Renderizador para mensagens de texto (padrão)
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
        <p className="text-sm leading-relaxed">{message.text}</p>
        <div className="flex items-center justify-end mt-2 gap-2">
          <span className="text-xs opacity-70">{formatTime(message.timestamp)}</span>
          {message.isSent && (
            <div className="text-xs">
              {message.isRead ? (
                <CheckCheck className="h-4 w-4 text-blue-400" />
              ) : message.isDelivered ? (
                <CheckCheck className="h-4 w-4" />
              ) : (
                <Check className="h-4 w-4" />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}