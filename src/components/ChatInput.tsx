// import { useState } from "react";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Send, Paperclip, Smile, Mic, Package, CreditCard } from "lucide-react";
// import { cn } from "@/lib/utils";

// interface ChatInputProps {
//   onSendMessage: (text: string) => void;
//   onSendCatalog: () => void;
//   onSendPayment: () => void;
//   disabled?: boolean;
// }

// export function ChatInput({ onSendMessage, onSendCatalog, onSendPayment, disabled }: ChatInputProps) {
//   const [message, setMessage] = useState("");
//   const [showQuickActions, setShowQuickActions] = useState(false);

//   const handleSendMessage = () => {
//     if (message.trim() && !disabled) {
//       onSendMessage(message.trim());
//       setMessage("");
//     }
//   };

//   const handleKeyPress = (e: React.KeyboardEvent) => {
//     if (e.key === 'Enter' && !e.shiftKey) {
//       e.preventDefault();
//       handleSendMessage();
//     }
//   };

//   return (
//     <div className="p-4 bg-background border-t">
//       {/* Quick Actions */}
//       {showQuickActions && (
//         <div className="flex gap-2 mb-3">
//           <Button
//             variant="outline"
//             size="sm"
//             onClick={onSendCatalog}
//             className="flex items-center gap-2 hover:bg-accent"
//           >
//             <Package className="h-4 w-4" />
//             Enviar Catálogo
//           </Button>
//           <Button
//             variant="outline"
//             size="sm"
//             onClick={onSendPayment}
//             className="flex items-center gap-2 hover:bg-accent"
//           >
//             <CreditCard className="h-4 w-4" />
//             Gerar Pagamento
//           </Button>
//         </div>
//       )}

//       {/* Message Input */}
//       <div className="flex items-center gap-2">
//         <div className="flex items-center gap-1">
//           <Button
//             variant="ghost"
//             size="icon"
//             onClick={() => setShowQuickActions(!showQuickActions)}
//             className={cn(
//               "h-10 w-10 hover:bg-muted",
//               showQuickActions && "bg-accent"
//             )}
//           >
//             <Paperclip className="h-5 w-5" />
//           </Button>
//         </div>

//         <div className="flex-1 relative">
//           <Input
//             value={message}
//             onChange={(e) => setMessage(e.target.value)}
//             onKeyPress={handleKeyPress}
//             placeholder="Digite uma mensagem..."
//             disabled={disabled}
//             className="pr-10 rounded-full border-0 bg-muted focus:bg-background transition-colors"
//           />
//           <Button
//             variant="ghost"
//             size="icon"
//             className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 hover:bg-muted-foreground/10"
//           >
//             <Smile className="h-4 w-4" />
//           </Button>
//         </div>

//         {message.trim() ? (
//           <Button
//             onClick={handleSendMessage}
//             disabled={disabled}
//             size="icon"
//             className="h-10 w-10 rounded-full bg-whatsapp-green hover:bg-whatsapp-green-dark"
//           >
//             <Send className="h-4 w-4" />
//           </Button>
//         ) : (
//           <Button
//             variant="ghost"
//             size="icon"
//             className="h-10 w-10 hover:bg-muted"
//           >
//             <Mic className="h-5 w-5" />
//           </Button>
//         )}
//       </div>
//     </div>
//   );
// }

// src/components/ChatInput.tsx

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Paperclip, BookOpen, CreditCard } from "lucide-react";

interface ChatInputProps {
  onSendMessage: (text: string) => void;
  onSendCatalog: () => void;
  onSendPayment: () => void;
  isLoading?: boolean; // Adicionada a propriedade isLoading
}

export function ChatInput({
  onSendMessage,
  onSendCatalog,
  onSendPayment,
  isLoading = false // Valor padrão é false
}: ChatInputProps) {
  const [text, setText] = useState('');

  const handleSendClick = () => {
    if (text.trim()) {
      onSendMessage(text);
      setText('');
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSendClick();
    }
  };

  return (
    <div className="bg-background border-t p-4 flex items-center gap-4">
      <div className="flex-1 flex items-center gap-4 bg-muted/50 rounded-full px-4">
        <Input
          placeholder="Digite uma mensagem..."
          className="bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 h-12"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={isLoading} // Desativa o input enquanto carrega
        />
        <Button variant="ghost" size="icon" className="rounded-full" disabled={isLoading}>
          <Paperclip className="h-5 w-5" />
        </Button>
      </div>

      {/* Botões agora usam a propriedade isLoading */}
      <Button variant="ghost" size="icon" className="rounded-full" onClick={onSendCatalog} disabled={isLoading}>
        <BookOpen className="h-5 w-5" />
      </Button>
      <Button variant="ghost" size="icon" className="rounded-full" onClick={onSendPayment} disabled={isLoading}>
        <CreditCard className="h-5 w-5" />
      </Button>
      <Button size="icon" className="rounded-full" onClick={handleSendClick} disabled={isLoading || !text.trim()}>
        <Send className="h-5 w-5" />
      </Button>
    </div>
  );
}