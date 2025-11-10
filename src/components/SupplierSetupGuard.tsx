import { ReactNode } from "react";
import { useSupplierSetup } from "@/hooks/useSupplierSetup";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { AlertCircle, Building2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

interface SupplierSetupGuardProps {
  children: ReactNode;
}

export function SupplierSetupGuard({ children }: SupplierSetupGuardProps) {
  const { needsSetup, loading, recheckSetup } = useSupplierSetup();
  const { toast } = useToast();
  const [suppliers, setSuppliers] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);

  useEffect(() => {
    if (needsSetup) {
      loadSuppliers();
    }
  }, [needsSetup]);

  async function loadSuppliers() {
    try {
      setLoadingSuppliers(true);
      const { data, error } = await supabase
        .from("suppliers")
        .select("id, name")
        .order("name");

      if (error) throw error;
      setSuppliers(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading suppliers",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoadingSuppliers(false);
    }
  }

  async function handleSetSupplier() {
    if (!selectedSupplierId) {
      toast({
        title: "Select a supplier",
        description: "Please select a supplier to continue.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("profiles")
        .update({ supplier_id: selectedSupplierId })
        .eq("id", user.id);

      if (error) throw error;

      toast({
        title: "Supplier set",
        description: "You can now use all features.",
      });

      await recheckSetup();
    } catch (error: any) {
      toast({
        title: "Error setting supplier",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="container max-w-2xl mx-auto p-6 space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (needsSetup) {
    return (
      <div className="container max-w-2xl mx-auto p-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Building2 className="h-8 w-8 text-primary" />
              <div>
                <CardTitle>Setup Required</CardTitle>
                <CardDescription>
                  Please select your supplier to continue using the system.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Your profile needs to be associated with a supplier to access program rules and other features.
              </AlertDescription>
            </Alert>

            {loadingSuppliers ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Supplier</label>
                  <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a supplier..." />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.length === 0 ? (
                        <div className="p-4 text-sm text-muted-foreground">
                          No suppliers available. Please contact an administrator.
                        </div>
                      ) : (
                        suppliers.map((supplier) => (
                          <SelectItem key={supplier.id} value={supplier.id}>
                            {supplier.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  onClick={handleSetSupplier} 
                  disabled={saving || !selectedSupplierId || suppliers.length === 0}
                  className="w-full"
                >
                  {saving ? "Setting up..." : "Continue"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
