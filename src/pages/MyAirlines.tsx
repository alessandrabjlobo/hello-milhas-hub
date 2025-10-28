import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useSupplierAirlines } from "@/hooks/useSupplierAirlines";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Link as LinkIcon, Unlink, Search, Plane } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function MyAirlines() {
  const navigate = useNavigate();
  const { loading: authLoading } = useAuth();
  const { supplierId, loading: roleLoading } = useUserRole();
  const { linkedAirlines, allAirlines, loading, linkAirline, unlinkAirline } = 
    useSupplierAirlines(supplierId);

  const [searchTerm, setSearchTerm] = useState("");
  const [unlinkingAirline, setUnlinkingAirline] = useState<string | null>(null);

  const loadingState = authLoading || roleLoading || loading;

  const availableAirlines = allAirlines.filter(
    airline => !linkedAirlines.some(linked => linked.id === airline.id)
  );

  const filteredAvailable = availableAirlines.filter(airline =>
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

  if (!supplierId) {
    return (
      <div className="container max-w-6xl mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Sem Fornecedor Vinculado</CardTitle>
            <CardDescription>
              Você precisa estar vinculado a um fornecedor para gerenciar companhias aéreas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/dashboard")}>Voltar ao Dashboard</Button>
          </CardContent>
        </Card>
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
            <CardDescription>
              Companhias aéreas que você pode usar nas contas de milhagem
            </CardDescription>
          </CardHeader>
          <CardContent>
            {linkedAirlines.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Plane className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>Nenhuma companhia vinculada ainda</p>
              </div>
            ) : (
              <div className="space-y-2">
                {linkedAirlines.map(airline => (
                  <div
                    key={airline.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div>
                      <p className="font-medium">{airline.name}</p>
                      <p className="text-sm text-muted-foreground">{airline.code}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setUnlinkingAirline(airline.id)}
                    >
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
            <CardDescription>Vincule novas companhias aéreas</CardDescription>
            <div className="pt-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
                {filteredAvailable.map(airline => (
                  <div
                    key={airline.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div>
                      <p className="font-medium">{airline.name}</p>
                      <p className="text-sm text-muted-foreground">{airline.code}</p>
                    </div>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleLink(airline.id)}
                    >
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
              As contas de milhagem desta companhia não serão removidas, mas você não poderá criar novas contas até vincular novamente.
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
