// src/components/ChatHeader.tsx

import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Phone, Video, Search, CornerUpLeft, CheckCheck } from "lucide-react";
import { cn } from '@/lib/utils';

interface ChatHeaderProps {
  customerName: string;
  customerAvatar: string;
  isOnline: boolean;
  onUnassignChat: () => void;
  onCloseChat: () => void;
  children?: React.ReactNode; // Para o sino de notificação
}

export function ChatHeader({ 
  customerName, 
  customerAvatar, 
  isOnline, 
  onUnassignChat, 
  onCloseChat, 
  children 
}: ChatHeaderProps) {
  return (
    <div className="flex items-center p-4">
      <div className="flex items-center gap-4">
        <Avatar className="h-10 w-10">
          <AvatarImage src={customerAvatar} alt={customerName} />
          <AvatarFallback>{customerName ? customerName.charAt(0).toUpperCase() : '?'}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-semibold">{customerName}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className={cn("h-2 w-2 rounded-full", isOnline ? "bg-green-500" : "bg-gray-400")} />
            {isOnline ? "Online" : "Offline"}
          </div>
        </div>
      </div>
      <div className="ml-auto flex items-center space-x-2">
        {children} {/* Renderiza o sino de notificação */}
        
        <Button variant="ghost" size="icon" className="rounded-full" onClick={onUnassignChat} title="Devolver à Fila">
          <CornerUpLeft className="h-5 w-5" />
        </Button>

        <Button variant="ghost" size="icon" className="rounded-full" onClick={onCloseChat} title="Fechar Atendimento">
          <CheckCheck className="h-5 w-5 text-green-500" />
        </Button>

        <Button variant="ghost" size="icon" className="rounded-full">
          <Search className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}