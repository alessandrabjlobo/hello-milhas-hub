import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

export interface AgencySettings {
  id: string;
  supplier_id: string;
  agency_name: string;
  phone?: string;
  instagram?: string;
  email?: string;
  logo_url?: string;
  address?: string;
  website?: string;
}

export function useAgencySettings() {
  const [settings, setSettings] = useState<AgencySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const { data: supplier } = await supabase
        .from('suppliers')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!supplier) throw new Error("Fornecedor não encontrado");

      const { data, error } = await supabase
        .from('agency_settings')
        .select('*')
        .eq('supplier_id', supplier.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      
      setSettings(data);
    } catch (error: any) {
      console.error('Error fetching agency settings:', error);
      toast({
        title: "Erro ao carregar configurações",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (updates: Partial<AgencySettings>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const { data: supplier } = await supabase
        .from('suppliers')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!supplier) throw new Error("Fornecedor não encontrado");

      const { data, error } = await supabase
        .from('agency_settings')
        .upsert({
          ...updates,
          supplier_id: supplier.id,
          updated_at: new Date().toISOString(),
        } as any)
        .select()
        .single();

      if (error) throw error;

      setSettings(data);
      toast({
        title: "Configurações atualizadas",
        description: "As configurações da agência foram salvas com sucesso.",
      });

      return data;
    } catch (error: any) {
      console.error('Error updating agency settings:', error);
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return {
    settings,
    loading,
    fetchSettings,
    updateSettings,
  };
}
