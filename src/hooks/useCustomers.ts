import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

export interface Customer {
  id: string;
  supplier_id: string;
  name: string;
  cpf_encrypted: string;
  rg?: string;
  birth_date?: string;
  phone?: string;
  email?: string;
  total_purchases: number;
  total_spent: number;
  last_purchase_at?: string;
  created_at: string;
  updated_at: string;
}

export function useCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchCustomers = async () => {
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
        .from('customers')
        .select('*')
        .eq('supplier_id', supplier.id)
        .order('name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error: any) {
      console.error('Error fetching customers:', error);
      toast({
        title: "Erro ao carregar clientes",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const searchCustomers = async (searchTerm: string): Promise<Customer[]> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: supplier } = await supabase
        .from('suppliers')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!supplier) return [];

      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('supplier_id', supplier.id)
        .or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
        .limit(10);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching customers:', error);
      return [];
    }
  };

  const createOrUpdateCustomer = async (customerData: {
    name: string;
    cpf: string;
    rg?: string;
    birth_date?: string;
    phone?: string;
    email?: string;
  }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const { data: supplier } = await supabase
        .from('suppliers')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!supplier) throw new Error("Fornecedor não encontrado");

      // Verificar se cliente já existe
      const { data: existing } = await supabase
        .from('customers')
        .select('*')
        .eq('supplier_id', supplier.id)
        .eq('cpf_encrypted', customerData.cpf)
        .maybeSingle();

      if (existing) {
        // Atualizar cliente existente
        const { data, error } = await supabase
          .from('customers')
          .update({
            name: customerData.name,
            rg: customerData.rg,
            birth_date: customerData.birth_date,
            phone: customerData.phone,
            email: customerData.email,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        await fetchCustomers();
        return data;
      } else {
        // Criar novo cliente
        const { data, error } = await supabase
          .from('customers')
          .insert({
            supplier_id: supplier.id,
            name: customerData.name,
            cpf_encrypted: customerData.cpf,
            rg: customerData.rg,
            birth_date: customerData.birth_date,
            phone: customerData.phone,
            email: customerData.email,
            total_purchases: 0,
            total_spent: 0,
          })
          .select()
          .single();

        if (error) throw error;
        await fetchCustomers();
        
        toast({
          title: "Cliente cadastrado",
          description: `${customerData.name} foi adicionado ao banco de dados`,
        });
        
        return data;
      }
    } catch (error: any) {
      console.error('Error creating/updating customer:', error);
      toast({
        title: "Erro ao salvar cliente",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  return {
    customers,
    loading,
    fetchCustomers,
    searchCustomers,
    createOrUpdateCustomer,
  };
}
