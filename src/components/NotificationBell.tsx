// src/components/NotificationBell.tsx
import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface Notification {
  id: string;
  message: string;
  is_read: boolean;
  created_at: string;
  link_to: string | null;
}

export function NotificationBell({ onViewOrder }: { onViewOrder: (orderId: string) => void }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const unreadCount = notifications.filter(n => !n.is_read).length;

  useEffect(() => {
    const fetchNotifications = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      setNotifications(data || []);
    };
    fetchNotifications();

    const channel = supabase
      .channel('notifications_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications(current => [newNotification, ...current]);
          toast({
            title: "🔔 Nova Notificação",
            description: newNotification.message,
          });
        }
      ).subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast]);

  const handleOpenChange = async (open: boolean) => {
    setIsOpen(open);
    if (!open && unreadCount > 0) {
      // Marcar todas como lidas ao fechar
      const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
      await supabase.from('notifications').update({ is_read: true }).in('id', unreadIds);
      setNotifications(current => current.map(n => ({ ...n, is_read: true })));
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (notification.link_to) {
      onViewOrder(notification.link_to);
      setIsOpen(false);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-full">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0">
        <div className="p-4 font-medium border-b">Notificações</div>
        <div className="max-h-96 overflow-y-auto">
          {notifications.length > 0 ? (
            notifications.map(n => (
              <div
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className={cn(
                  "p-4 border-b text-sm hover:bg-muted/50",
                  n.link_to && "cursor-pointer",
                  !n.is_read && "bg-primary/10"
                )}
              >
                <p>{n.message}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(n.created_at).toLocaleString('pt-BR')}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center p-8">Nenhuma notificação ainda.</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}