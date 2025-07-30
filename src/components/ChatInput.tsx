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
    <div className="bg-background border-t p-4 flex items-center gap-4" >
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