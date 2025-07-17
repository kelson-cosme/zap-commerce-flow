import { cn } from "@/lib/utils";
import { Check, CheckCheck } from "lucide-react";

export interface Message {
  id: string;
  text: string;
  timestamp: string;
  isSent: boolean;
  isDelivered?: boolean;
  isRead?: boolean;
  type?: 'text' | 'catalog' | 'payment';
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

  if (message.type === 'catalog' && message.catalogData) {
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
          <div className="font-medium mb-2">📋 Catálogo de Produtos</div>
          <div className="space-y-3">
            {message.catalogData.products.slice(0, 3).map((product) => (
              <div key={product.id} className="flex items-center gap-3 p-2 bg-white/10 rounded">
                <div className="w-12 h-12 bg-muted rounded overflow-hidden">
                  <img 
                    src={product.image} 
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm">{product.name}</div>
                  <div className="text-sm opacity-80">
                    R$ {product.price.toFixed(2)}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 text-xs opacity-80">
            {message.catalogData.products.length > 3 && 
              `+${message.catalogData.products.length - 3} produtos...`
            }
          </div>
          <div className="flex items-center justify-between mt-2">
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

  if (message.type === 'payment' && message.paymentData) {
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
          <div className="font-medium mb-2">💳 Link de Pagamento</div>
          <div className="bg-white/10 rounded p-3 mb-2">
            <div className="font-medium">{message.paymentData.description}</div>
            <div className="text-lg font-bold">
              R$ {message.paymentData.amount.toFixed(2)}
            </div>
          </div>
          <a 
            href={message.paymentData.link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block w-full text-center py-2 px-4 bg-white/20 hover:bg-white/30 rounded transition-colors font-medium"
          >
            🔗 Pagar Agora
          </a>
          <div className="flex items-center justify-between mt-2">
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
        <div className="flex items-center justify-between mt-2">
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