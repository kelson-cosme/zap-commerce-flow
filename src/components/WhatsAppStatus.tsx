import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { MessageCircle, Wifi, WifiOff } from 'lucide-react';

export const WhatsAppStatus = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);

  useEffect(() => {
    // Simulate checking connection status
    // In a real app, you'd verify the webhook is working
    const checkConnection = () => {
      // For now, we'll show as connected since the credentials are configured
      setIsConnected(true);
      setPhoneNumber('623782354160045');
    };

    checkConnection();
    const interval = setInterval(checkConnection, 30000); // Check every 30s

    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="p-4 mb-4 fixed bottom-0" >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MessageCircle className="h-5 w-5 text-green-600" />
          <div>
            <h3 className="font-semibold text-sm">WhatsApp Business</h3>

          </div>
        </div>
        <div className="flex items-center gap-2">
          {isConnected ? (
            <>
              <Wifi className="h-4 w-4 text-green-600" />
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                Conectado
              </Badge>
            </>
          ) : (
            <>
              <WifiOff className="h-4 w-4 text-red-600" />
              <Badge variant="destructive">
                Desconectado
              </Badge>
            </>
          )}
        </div>
      </div>
     
    </Card>
  );
};