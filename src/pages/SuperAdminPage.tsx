// src/pages/SuperAdminPage.tsx

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Plus, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Organization {
  id: string;
  name: string;
  whatsapp_phone_number_id: string | null;
}

export function SuperAdminPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [newOrgName, setNewOrgName] = useState('');
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [secrets, setSecrets] = useState({
    whatsapp_phone_number_id: '',
    encrypted_whatsapp_api_token: '',
    encrypted_asaas_api_key: '',
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchOrgs = async () => {
      setLoading(true);
      const { data, error } = await supabase.from('organizations').select('*');
      if (error) {
        toast({ title: "Erro", description: "Não foi possível carregar as organizações.", variant: "destructive" });
      } else {
        setOrganizations(data);
      }
      setLoading(false);
    };
    fetchOrgs();
  }, [toast]);

  const handleCreateOrg = async () => {
    if (!newOrgName) return;
    setLoading(true);
    const { data, error } = await supabase.from('organizations').insert({ name: newOrgName }).select().single();
    if (error) {
      toast({ title: "Erro", description: "Não foi possível criar a organização.", variant: "destructive" });
    } else {
      toast({ title: "Sucesso!", description: "Organização criada." });
      setOrganizations(current => [...current, data]);
      setNewOrgName('');
    }
    setLoading(false);
  };

  const handleSaveSecrets = async () => {
    if (!selectedOrg) return;
    setLoading(true);
    const { error } = await supabase
        .from('organizations')
        .update({
            whatsapp_phone_number_id: secrets.whatsapp_phone_number_id,
            encrypted_whatsapp_api_token: secrets.encrypted_whatsapp_api_token,
            encrypted_asaas_api_key: secrets.encrypted_asaas_api_key,
        })
        .eq('id', selectedOrg.id);

    if (error) {
        toast({ title: "Erro", description: "Não foi possível guardar as chaves de API.", variant: "destructive" });
    } else {
        toast({ title: "Sucesso!", description: "Chaves de API guardadas com segurança." });
        setSelectedOrg(null);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
        <Button onClick={() => navigate('/')} className="mb-8">Voltar para o Chat</Button>
        <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">Painel Super Admin</h1>

            <Card className="mb-8">
                <CardHeader><CardTitle>Criar Nova Organização</CardTitle></CardHeader>
                <CardContent className="flex gap-4">
                    <Input placeholder="Nome da nova empresa cliente" value={newOrgName} onChange={(e) => setNewOrgName(e.target.value)} />
                    <Button onClick={handleCreateOrg} disabled={loading}>
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                        <span className="ml-2">Criar</span>
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Gerir Organizações</CardTitle></CardHeader>
                <CardContent>
                    {loading && !organizations.length && <p>A carregar...</p>}
                    <div className="space-y-4">
                        {organizations.map(org => (
                            <Card key={org.id}>
                                <CardContent className="p-4 flex justify-between items-center">
                                    <p className="font-semibold">{org.name}</p>
                                    <Button onClick={() => { setSelectedOrg(org); setSecrets({ whatsapp_phone_number_id: org.whatsapp_phone_number_id || '', encrypted_whatsapp_api_token: '', encrypted_asaas_api_key: '' }); }}>
                                        Gerir Chaves
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Modal para gerir chaves */}
            {selectedOrg && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center">
                    <Card className="w-full max-w-lg">
                        <CardHeader><CardTitle>Gerir Chaves para {selectedOrg.name}</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>WhatsApp Phone Number ID</Label>
                                <Input value={secrets.whatsapp_phone_number_id} onChange={e => setSecrets(s => ({...s, whatsapp_phone_number_id: e.target.value}))} />
                            </div>
                            <div className="space-y-2">
                                <Label>WhatsApp API Token</Label>
                                <Input type="password" placeholder="Insira o novo token aqui para atualizar" onChange={e => setSecrets(s => ({...s, encrypted_whatsapp_api_token: e.target.value}))} />
                            </div>
                            <div className="space-y-2">
                                <Label>Asaas API Key</Label>
                                <Input type="password" placeholder="Insira a nova chave aqui para atualizar" onChange={e => setSecrets(s => ({...s, encrypted_asaas_api_key: e.target.value}))} />
                            </div>
                            <div className="flex justify-end gap-4 pt-4">
                                <Button variant="outline" onClick={() => setSelectedOrg(null)}>Cancelar</Button>
                                <Button onClick={handleSaveSecrets} disabled={loading}>
                                    <Save className="h-4 w-4 mr-2" />
                                    Guardar Chaves
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    </div>
  );
}