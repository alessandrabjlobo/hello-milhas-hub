// src/pages/settings/MyAirlines.tsx    (ajuste o caminho/nome conforme seu projeto)
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { useSupplierAirlines } from "@/hooks/useSupplierAirlines";
import { supabase } from "@/integrations/supabase/client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ArrowLeft, Link as LinkIcon, Unlink, Search, Plane } from "lucide-react";

type Supplier = { id: string; name: string };

export default function MyAirlines() {
  const navigate = useNavigate();
  const { supplierId, setSupplierIdLocal, loading: roleLoading } = useUserRole();

  // carrega listas só quando já sabemos o supplierId (pode vir do localStorage)
  const { linkedAirlines, allAirlines, loading, linkAirline, unlinkAirline } =
    useSupplierAirlines(supplierId ?? "");

  const [searchTerm, setSearchTerm] = useState("");
  const [unlinkingAirline, setUnlinkingAirline] = useState<string | null>(null);

  const loadingState = roleLoading || loading;

  const availableAirlines = (allAirlines ?? []).filter(
    (airline) => !(linkedAirlines ?? []).some((linked) => linked.id === airline.id)
  );

  const filteredAvailable = availableAirlines.filter(
    (airline) =>
      airline.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      airline.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleLink = async (airlineId: string) => {
    await linkAirline(airlineId);
  };

  const handleUnlink = async () => {
    if (unlinkingAirline) {
      await unlinkAirline(unlinkingAirline);
      setUnlinkingAirline(null);
    }
  };

  // ——— BLOCO: fluxo de “vincular fornecedor” SEM acesso ao Supabase (localStorage) ———
  const [allSuppliers, setAllSuppliers] = useState<Supplier[]>([]);
  const [pickedSupplier, setPickedSupplier] = useState("");
  const [savingSupplier, setSavingSupplier] = useState(false);

  useEffect(() => {
    if (!supplierId) {
      (async () => {
        const { data } = await supabase.from("suppliers").select("id, name").order("name");
        setAllSuppliers(data ?? []);
      })();
    }
  }, [supplierId]);

  const attachSupplierLocal = async () => {
    if (!pickedSupplier) return;
    setSavingSupplier(true);
    // salva só no localStorage via hook
    setSupplierIdLocal(pickedSupplier);
    setSavingSupplier(false);
    // não precisa recarregar rota; estado já reflete
  };

  // Se não tiver fornecedor definido (perfil + localStorage), mostra o seletor
  if (!supplierId) {
    return (
      <div className="container max-w-6xl mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Vincular Fornecedor</CardTitle>
            <CardDescription>
              Selecione um fornecedor para gerenciar as companhias aéreas. (Não precisa acesso ao banco.)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="max-w-md">
              <label className="text-sm font-medium">Fornecedor</label>
              <select
                className="w-full border rounded-md px-3 py-2 mt-1"
                value={pickedSupplier}
                onChange={(e) => setPickedSupplier(e.target.value)}
              >
                <option value="">Selecione…</option>
                {allSuppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate("/dashboard")}>
                Voltar ao Dashboard
              </Button>
              <Button onClick={attachSupplierLocal} disabled={!pickedSupplier || savingSupplier}>
                {savingSupplier ? "Vinculando..." : "Vincular fornecedor"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ——— Tela normal quando já temos supplierId (perfil ou localStorage) ———
  if (loadingState) {
    return (
      <div className="container max-w-6xl mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-full" />
        <div className="grid md:grid-cols-2 gap-6">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Minhas Companhias Aéreas</h1>
          <p className="text-muted-foreground">
            Gerencie as companhias aéreas vinculadas ao seu fornecedor
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LinkIcon className="h-5 w-5" />
              Companhias Vinculadas ({linkedAirlines.length})
            </CardTitle>
            <CardDescription>Companhias que você pode usar nas contas</CardDescription>
          </CardHeader>
          <CardContent>
            {linkedAirlines.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Plane className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>Nenhuma companhia vinculada ainda</p>
              </div>
            ) : (
              <div className="space-y-2">
                {linkedAirlines.map((airline) => (
                  <div
                    key={airline.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div>
                      <p className="font-medium">{airline.name}</p>
                      <p className="text-sm text-muted-foreground">{airline.code}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setUnlinkingAirline(airline.id)}>
                      <Unlink className="h-4 w-4 mr-2" />
                      Desvincular
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Companhias Disponíveis ({filteredAvailable.length})</CardTitle>
            <CardDescription>Vincule novas companhias</CardDescription>
            <div className="pt-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar companhia..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredAvailable.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>
                  {availableAirlines.length === 0
                    ? "Todas as companhias já estão vinculadas"
                    : "Nenhuma companhia encontrada"}
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {filteredAvailable.map((airline) => (
                  <div
                    key={airline.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div>
                      <p className="font-medium">{airline.name}</p>
                      <p className="text-sm text-muted-foreground">{airline.code}</p>
                    </div>
                    <Button variant="default" size="sm" onClick={() => handleLink(airline.id)}>
                      <LinkIcon className="h-4 w-4 mr-2" />
                      Vincular
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!unlinkingAirline} onOpenChange={() => setUnlinkingAirline(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desvincular Companhia Aérea?</AlertDialogTitle>
            <AlertDialogDescription>
              As contas existentes não serão removidas, mas você não poderá criar novas para esta companhia.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnlink}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
