import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface Customer {
  id: string;
  name: string;
  avatar?: string;
  lastMessage: string;
  timestamp: string;
  isOnline: boolean;
  unreadCount: number;
  status: 'active' | 'pending' | 'completed';
}

interface CustomerListProps {
  customers: Customer[];
  selectedCustomerId?: string;
  onSelectCustomer: (customerId: string) => void;
}

export function CustomerList({ customers, selectedCustomerId, onSelectCustomer }: CustomerListProps) {
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) {
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } else if (diffInDays === 1) {
      return 'Ontem';
    } else if (diffInDays < 7) {
      return date.toLocaleDateString('pt-BR', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    }
  };

  const getStatusColor = (status: Customer['status']) => {
    switch (status) {
      case 'active':
        return 'bg-whatsapp-green';
      case 'pending':
        return 'bg-warning';
      case 'completed':
        return 'bg-muted';
      default:
        return 'bg-muted';
    }
  };

  const getStatusText = (status: Customer['status']) => {
    switch (status) {
      case 'active':
        return 'Ativo';
      case 'pending':
        return 'Pendente';
      case 'completed':
        return 'Finalizado';
      default:
        return '';
    }
  };

  return (
    <div className="w-80 bg-background border-r overflow-hidden flex flex-col">
      <div className="p-4 border-b bg-whatsapp-green">
        <h2 className="text-lg font-semibold text-white">Conversas</h2>
        <p className="text-sm text-white/80">{customers.length} clientes</p>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {customers.map((customer) => (
          <div
            key={customer.id}
            onClick={() => onSelectCustomer(customer.id)}
            className={cn(
              "flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/50 transition-colors border-b",
              selectedCustomerId === customer.id && "bg-accent"
            )}
          >
            <div className="relative">
              <Avatar className="h-12 w-12">
                <AvatarImage src={customer.avatar} alt={customer.name} />
                <AvatarFallback className="bg-whatsapp-green-light text-whatsapp-green font-medium">
                  {customer.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {customer.isOnline && (
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-whatsapp-green border-2 border-background rounded-full"></div>
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-medium truncate">{customer.name}</h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {formatTime(customer.timestamp)}
                  </span>
                  <Badge 
                    variant="secondary" 
                    className={cn("text-xs px-2 py-0", getStatusColor(customer.status))}
                  >
                    {getStatusText(customer.status)}
                  </Badge>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground truncate">
                  {customer.lastMessage}
                </p>
                {customer.unreadCount > 0 && (
                  <Badge className="bg-whatsapp-green hover:bg-whatsapp-green-dark text-white ml-2">
                    {customer.unreadCount}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}