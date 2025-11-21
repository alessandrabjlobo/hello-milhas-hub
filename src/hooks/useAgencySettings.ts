import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';
import { getSupplierId } from '@/lib/getSupplierId';

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
  cnpj_cpf?: string;
  responsible_name?: string;
  billing_email?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zip_code?: string;
}

export function useAgencySettings() {
  const [settings, setSettings] = useState<AgencySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { supplierId } = await getSupplierId();

      const { data, error } = await supabase
        .from('agency_settings')
        .select('*')
        .eq('supplier_id', supplierId)
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
      const { supplierId } = await getSupplierId();

      const { data, error } = await supabase
        .from('agency_settings')
        .upsert({
          ...updates,
          supplier_id: supplierId,
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
