// import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
// import { Badge } from "@/components/ui/badge";
// import { cn } from "@/lib/utils";

// export interface Customer {
//   id: string;
//   name: string;
//   avatar?: string;
//   lastMessage: string;
//   timestamp: string;
//   isOnline: boolean;
//   unreadCount: number;
//   status: 'active' | 'pending' | 'completed';
// }

// interface CustomerListProps {
//   customers: Customer[];
//   selectedCustomerId?: string;
//   onSelectCustomer: (customerId: string) => void;
// }

// export function CustomerList({ customers, selectedCustomerId, onSelectCustomer }: CustomerListProps) {
//   const formatTime = (timestamp: string) => {
//     const date = new Date(timestamp);
//     const now = new Date();
//     const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
//     if (diffInDays === 0) {
//       return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
//     } else if (diffInDays === 1) {
//       return 'Ontem';
//     } else if (diffInDays < 7) {
//       return date.toLocaleDateString('pt-BR', { weekday: 'short' });
//     } else {
//       return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
//     }
//   };

//   const getStatusColor = (status: Customer['status']) => {
//     switch (status) {
//       case 'active':
//         return 'bg-whatsapp-green';
//       case 'pending':
//         return 'bg-warning';
//       case 'completed':
//         return 'bg-muted';
//       default:
//         return 'bg-muted';
//     }
//   };

//   const getStatusText = (status: Customer['status']) => {
//     switch (status) {
//       case 'active':
//         return 'Ativo';
//       case 'pending':
//         return 'Pendente';
//       case 'completed':
//         return 'Finalizado';
//       default:
//         return '';
//     }
//   };

//   return (
//     <div className="w-80 bg-background border-r overflow-hidden flex flex-col">
//       <div className="p-4 border-b bg-whatsapp-green">
//         <h2 className="text-lg font-semibold text-white">Conversas</h2>
//         <p className="text-sm text-white/80">{customers.length} clientes</p>
//       </div>
      
//       <div className="flex-1 overflow-y-auto">
//         {customers.map((customer) => (
//           <div
//             key={customer.id}
//             onClick={() => onSelectCustomer(customer.id)}
//             className={cn(
//               "flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/50 transition-colors border-b",
//               selectedCustomerId === customer.id && "bg-accent"
//             )}
//           >
//             <div className="relative">
//               <Avatar className="h-12 w-12">
//                 <AvatarImage src={customer.avatar} alt={customer.name} />
//                 <AvatarFallback className="bg-whatsapp-green-light text-whatsapp-green font-medium">
//                   {customer.name.charAt(0).toUpperCase()}
//                 </AvatarFallback>
//               </Avatar>
//               {customer.isOnline && (
//                 <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-whatsapp-green border-2 border-background rounded-full"></div>
//               )}
//             </div>
            
//             <div className="flex-1 min-w-0">
//               <div className="flex items-center justify-between mb-1">
//                 <h3 className="font-medium truncate">{customer.name}</h3>
//                 <div className="flex items-center gap-2">
//                   <span className="text-xs text-muted-foreground">
//                     {formatTime(customer.timestamp)}
//                   </span>
//                   <Badge 
//                     variant="secondary" 
//                     className={cn("text-xs px-2 py-0", getStatusColor(customer.status))}
//                   >
//                     {getStatusText(customer.status)}
//                   </Badge>
//                 </div>
//               </div>
              
//               <div className="flex items-center justify-between">
//                 <p className="text-sm text-muted-foreground truncate">
//                   {customer.lastMessage}
//                 </p>
//                 {customer.unreadCount > 0 && (
//                   <Badge className="bg-whatsapp-green hover:bg-whatsapp-green-dark text-white ml-2">
//                     {customer.unreadCount}
//                   </Badge>
//                 )}
//               </div>
//             </div>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// }









// src/components/CustomerList.tsx

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge"; // Importe o Badge
import { Search, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface Customer {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  timestamp: string;
  isOnline: boolean;
  unreadCount: number; // Propriedade para contar mensagens não lidas
  status: 'active' | 'archived' | 'blocked';
}

interface CustomerListProps {
  customers: Customer[];
  selectedCustomerId: string | null;
  onSelectCustomer: (id: string) => void;
}

export function CustomerList({ customers, selectedCustomerId, onSelectCustomer }: CustomerListProps) {
  const formatTimestamp = (isoDate: string) => {
    if (!isoDate) return '';
    const date = new Date(isoDate);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="bg-background w-80 border-r flex flex-col h-full">
      <div className="p-4 border-b">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Conversas</h2>
          <Button variant="ghost" size="icon">
            <UserPlus className="h-5 w-5" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Pesquisar conversas..." className="pl-10" />
        </div>
      </div>
      <ScrollArea className="flex-1">
        {customers.map((customer) => (
          <div
            key={customer.id}
            className={cn(
              "flex items-center p-4 cursor-pointer hover:bg-muted/50 transition-colors",
              selectedCustomerId === customer.id && "bg-muted"
            )}
            onClick={() => onSelectCustomer(customer.id)}
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
        ))}
      </ScrollArea>
    </div>
  );
}