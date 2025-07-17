import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Phone, Video, MoreVertical } from "lucide-react";

interface ChatHeaderProps {
  customerName: string;
  customerAvatar?: string;
  isOnline: boolean;
  onBack?: () => void;
}

export function ChatHeader({ customerName, customerAvatar, isOnline, onBack }: ChatHeaderProps) {
  return (
    <div className="flex items-center gap-3 p-4 bg-whatsapp-green border-b">
      {onBack && (
        <Button variant="ghost" size="icon" onClick={onBack} className="text-white hover:bg-whatsapp-green-dark">
          <ArrowLeft className="h-5 w-5" />
        </Button>
      )}
      
      <Avatar className="h-10 w-10">
        <AvatarImage src={customerAvatar} alt={customerName} />
        <AvatarFallback className="bg-white text-whatsapp-green font-medium">
          {customerName.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1">
        <h3 className="font-medium text-white">{customerName}</h3>
        <p className="text-sm text-white/80">
          {isOnline ? "online" : "última vez hoje às 14:30"}
        </p>
      </div>
      
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="text-white hover:bg-whatsapp-green-dark">
          <Video className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" className="text-white hover:bg-whatsapp-green-dark">
          <Phone className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" className="text-white hover:bg-whatsapp-green-dark">
          <MoreVertical className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}