// src/components/CustomerList.tsx

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export interface Customer {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  conversationId: string;
}

interface CustomerListProps {
  queue: Customer[];
  myChats: Customer[];
  selectedCustomerId: string | null;
  onSelectCustomer: (id: string) => void;
}

const ConversationItem = ({ customer, isSelected, onSelect }: { customer: Customer, isSelected: boolean, onSelect: (id: string) => void }) => {
  const formatTimestamp = (isoDate: string) => {
    if (!isoDate) return '';
    const date = new Date(isoDate);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div
      key={customer.id}
      className={cn(
        "flex items-center p-4 cursor-pointer hover:bg-muted/50 transition-colors border-b",
        isSelected && "bg-muted"
      )}
      onClick={() => onSelect(customer.id)}
    >
      <Avatar className="h-12 w-12 mr-4">
        <AvatarImage src={customer.avatar} />
        <AvatarFallback>{customer.name ? customer.name.charAt(0).toUpperCase() : '?'}</AvatarFallback>
      </Avatar>
      <div className="flex-1 overflow-hidden">
        <p className="font-semibold truncate">{customer.name}</p>
        <p className="text-sm text-muted-foreground truncate">{customer.lastMessage}</p>
      </div>
      <div className="flex flex-col items-end text-xs text-muted-foreground ml-2 space-y-1">
        <span>{formatTimestamp(customer.timestamp)}</span>
        {customer.unreadCount > 0 && (
          <Badge className="bg-whatsapp-green text-white h-5 w-5 flex items-center justify-center p-0 font-bold">
            {customer.unreadCount}
          </Badge>
        )}
      </div>
    </div>
  );
};

export function CustomerList({ queue, myChats, selectedCustomerId, onSelectCustomer }: CustomerListProps) {
  return (
    <div className="bg-background w-80 border-r flex flex-col h-full">
      <div className="p-4 border-b">
        <h2 className="text-xl font-bold">Conversas</h2>
      </div>
      <Tabs defaultValue="queue" className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="queue">Fila ({queue.length})</TabsTrigger>
          <TabsTrigger value="myChats">Meus Atendimentos ({myChats.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="flex-1">
          <ScrollArea className="h-full">
            {queue.map((customer) => (
              <ConversationItem
                key={customer.id}
                customer={customer}
                isSelected={selectedCustomerId === customer.id}
                onSelect={onSelectCustomer}
              />
            ))}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="myChats" className="flex-1">
          <ScrollArea className="h-full">
            {myChats.map((customer) => (
              <ConversationItem
                key={customer.id}
                customer={customer}
                isSelected={selectedCustomerId === customer.id}
                onSelect={onSelectCustomer}
              />
            ))}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}