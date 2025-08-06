// src/App.tsx
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Route, Routes } from "react-router-dom";
import Index from "./pages/Index";
import { AuthPage } from "./pages/AuthPage";
import { SuperAdminPage } from "./pages/SuperAdminPage"; // Importe a nova página
import { useSession } from "./hooks/useSession";

const queryClient = new QueryClient();

const App = () => {
  const { session, loading } = useSession();

  if (loading) { return <div>A carregar...</div>; }
  
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Routes>
          <Route path="/" element={session ? <Index /> : <AuthPage />} />
          <Route path="/login" element={<AuthPage />} />
          <Route path="/super-admin" element={session ? <SuperAdminPage /> : <AuthPage />} />
        </Routes>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;