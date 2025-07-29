// src/pages/AuthPage.tsx
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { Navigate } from 'react-router-dom';
import { useSession } from '@/hooks/useSession'; // Criaremos este hook a seguir

export function AuthPage() {
  const { session } = useSession();

  // Se o utilizador já estiver logado, redireciona-o para a página principal
  if (session) {
    return <Navigate to="/" />;
  }

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center mb-6">Bem-vindo</h2>
        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          providers={[]} // Deixe vazio para usar apenas login com email/senha
          localization={{
            variables: {
              sign_in: { email_label: 'Seu e-mail', password_label: 'Sua senha', button_label: 'Entrar', link_text: 'Já tem uma conta? Entre' },
              sign_up: { email_label: 'Seu e-mail', password_label: 'Crie uma senha', button_label: 'Registar', link_text: 'Ainda não tem uma conta? Registe-se' },
              forgotten_password: { email_label: 'Seu e-mail', button_label: 'Enviar instruções', link_text: 'Esqueceu a sua senha?' },
            },
          }}
        />
      </div>
    </div>
  );
}