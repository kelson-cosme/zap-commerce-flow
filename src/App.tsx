// src/App.tsx
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Home, User, Settings } from "lucide-react";
import { Route, Routes} from "react-router-dom";
import Index from "./pages/Index";
import { AuthPage } from "./pages/AuthPage"; // Importe a nova página
import { useSession } from "./hooks/useSession"; // Importe o nosso hook

const queryClient = new QueryClient();

const App = () => {
  const { session, loading } = useSession();

  // Mostra um ecrã de carregamento enquanto a sessão está a ser verificada
  if (loading) {
    return <div>A carregar...</div>;
  }
  
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Routes>
          <Route path="/" element={session ? <Index /> : <AuthPage />} />
          <Route path="/login" element={<AuthPage />} />
        </Routes>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;