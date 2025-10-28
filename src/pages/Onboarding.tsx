import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { useSuppliers } from "@/hooks/useSuppliers";
import { useMileageAccounts } from "@/hooks/useMileageAccounts";
import { useSupplierAirlines } from "@/hooks/useSupplierAirlines";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronRight, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Onboarding() {
  const navigate = useNavigate();
  const { supplierId, loading: roleLoading } = useUserRole();
  const { suppliers, loading: suppliersLoading } = useSuppliers();
  const { accounts, loading: accountsLoading } = useMileageAccounts();
  const { linkedAirlines, loading: airlinesLoading } = useSupplierAirlines(supplierId);

  const loading = roleLoading || suppliersLoading || accountsLoading || airlinesLoading;

  const steps = [
    {
      title: "1. Criar Fornecedor",
      description: "Configure o fornecedor principal da sua operação",
      completed: suppliers.length > 0,
      action: () => navigate("/dashboard"),
      buttonText: suppliers.length > 0 ? "Ver Fornecedores" : "Criar Fornecedor",
    },
    {
      title: "2. Vincular Companhias Aéreas",
      description: "Selecione as companhias aéreas que você trabalha",
      completed: linkedAirlines.length > 0,
      action: () => navigate("/my-airlines"),
      buttonText: linkedAirlines.length > 0 ? "Gerenciar Companhias" : "Vincular Companhias",
      disabled: !supplierId,
    },
    {
      title: "3. Criar Contas de Milhagem",
      description: "Cadastre as contas de milhagem disponíveis",
      completed: accounts.length > 0,
      action: () => navigate("/dashboard"),
      buttonText: accounts.length > 0 ? "Ver Contas" : "Criar Conta",
      disabled: linkedAirlines.length === 0,
    },
    {
      title: "4. Convidar Usuários",
      description: "Adicione vendedores à sua equipe",
      completed: false,
      action: () => navigate("/admin/users"),
      buttonText: "Gerenciar Usuários",
      disabled: accounts.length === 0,
    },
  ];

  const completedSteps = steps.filter(s => s.completed).length;
  const progress = (completedSteps / steps.length) * 100;

  if (loading) {
    return (
      <div className="container max-w-4xl mx-auto p-6 space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">Bem-vindo! 🎉</CardTitle>
          <CardDescription>
            Complete os passos abaixo para começar a usar o sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progresso</span>
              <span className="font-medium">{completedSteps} de {steps.length}</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div
                className="bg-primary rounded-full h-2 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {steps.map((step, index) => (
          <Card key={index} className={step.disabled ? "opacity-50" : ""}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1">
                  <CardTitle className="text-xl flex items-center gap-2">
                    {step.completed && (
                      <Badge variant="default" className="gap-1">
                        <Check className="h-3 w-3" />
                        Completo
                      </Badge>
                    )}
                    {step.title}
                  </CardTitle>
                  <CardDescription>{step.description}</CardDescription>
                </div>
                <Button
                  onClick={step.action}
                  disabled={step.disabled}
                  variant={step.completed ? "outline" : "default"}
                >
                  {step.buttonText}
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      {completedSteps === steps.length && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="text-2xl">🎊 Configuração Completa!</CardTitle>
            <CardDescription>
              Você concluiu todos os passos. Agora pode começar a usar o sistema completo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/dashboard")} size="lg" className="w-full">
              Ir para o Dashboard
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
