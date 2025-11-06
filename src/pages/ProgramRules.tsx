import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, FileText, Save, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface AirlineRule {
  airline_company_id: string;
  cpf_limit: number;
  renewal_type: "annual" | "rolling";
}

export default function ProgramRules() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [airlines, setAirlines] = useState<any[]>([]);
  const [rules, setRules] = useState<Record<string, AirlineRule>>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch all airlines
      const { data: airlinesData, error: airlinesError } = await supabase
        .from("airline_companies")
        .select("*")
        .order("name");

      if (airlinesError) throw airlinesError;
      setAirlines(airlinesData || []);

      // Initialize rules with default values
      const initialRules: Record<string, AirlineRule> = {};
      airlinesData?.forEach(airline => {
        initialRules[airline.id] = {
          airline_company_id: airline.id,
          cpf_limit: airline.cpf_limit || 25,
          renewal_type: airline.renewal_type || "annual",
        };
      });
      setRules(initialRules);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar dados",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Update each airline's rules
      for (const [airlineId, rule] of Object.entries(rules)) {
        const { error } = await supabase
          .from("airline_companies")
          .update({
            cpf_limit: rule.cpf_limit,
            renewal_type: rule.renewal_type,
          })
          .eq("id", airlineId);

        if (error) throw error;
      }

      toast({
        title: "Regras salvas",
        description: "As configurações foram atualizadas com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao salvar regras",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const updateRule = (airlineId: string, field: keyof AirlineRule, value: any) => {
    setRules(prev => ({
      ...prev,
      [airlineId]: {
        ...prev[airlineId],
        [field]: value,
      },
    }));
  };

  if (loading) {
    return (
      <div className="container max-w-4xl mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-full" />
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Regras do Programa</h1>
          <p className="text-muted-foreground">
            Configure limites de CPF e tipos de renovação por companhia
          </p>
        </div>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Estas configurações serão aplicadas como padrão ao criar novas contas de milhagem.
          Contas existentes não serão alteradas automaticamente.
        </AlertDescription>
      </Alert>

      <div className="space-y-4">
        {airlines.map(airline => (
          <Card key={airline.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {airline.name}
              </CardTitle>
              <CardDescription>
                Código: {airline.code}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`cpf-limit-${airline.id}`}>
                    Limite de CPFs
                  </Label>
                  <Input
                    id={`cpf-limit-${airline.id}`}
                    type="number"
                    min="1"
                    max="100"
                    value={rules[airline.id]?.cpf_limit || 25}
                    onChange={(e) => 
                      updateRule(airline.id, "cpf_limit", parseInt(e.target.value) || 25)
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Quantidade máxima de CPFs diferentes por conta
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`renewal-type-${airline.id}`}>
                    Tipo de Renovação
                  </Label>
                  <Select
                    value={rules[airline.id]?.renewal_type || "annual"}
                    onValueChange={(value) => 
                      updateRule(airline.id, "renewal_type", value)
                    }
                  >
                    <SelectTrigger id={`renewal-type-${airline.id}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="annual">Anual (renovação em data fixa)</SelectItem>
                      <SelectItem value="rolling">Rotativo (12 meses após cada uso)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {rules[airline.id]?.renewal_type === "annual"
                      ? "Os CPFs renovam todos na mesma data (ex: 01/01)"
                      : "Cada CPF renova 12 meses após o primeiro uso"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => navigate("/dashboard")}>
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Salvando..." : "Salvar Alterações"}
        </Button>
      </div>
    </div>
  );
}
