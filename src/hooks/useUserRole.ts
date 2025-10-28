import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type AppRole = "admin" | "supplier_owner" | "seller";

interface UserRoleData {
  roles: AppRole[];
  isAdmin: boolean;
  isSupplierOwner: boolean;
  isSeller: boolean;
  supplierId: string | null;
  loading: boolean;
}

export const useUserRole = (): UserRoleData => {
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) {
          setLoading(false);
          return;
        }

        // Fetch user roles
        const { data: rolesData, error: rolesError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userData.user.id);

        if (rolesError) throw rolesError;

        const userRoles = (rolesData || []).map(r => r.role as AppRole);
        setRoles(userRoles);

        // Fetch user profile for supplier_id
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("supplier_id")
          .eq("id", userData.user.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') throw profileError;
        
        setSupplierId(profileData?.supplier_id || null);
      } catch (error: any) {
        console.error("Error fetching user role:", error);
        toast({
          title: "Erro ao carregar permissões",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();
  }, [toast]);

  return {
    roles,
    isAdmin: roles.includes("admin"),
    isSupplierOwner: roles.includes("supplier_owner"),
    isSeller: roles.includes("seller"),
    supplierId,
    loading,
  };
};
