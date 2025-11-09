import { useState, useEffect, useMemo } from "react";
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
import { ArrowLeft, FileText, Save, Info, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AirlineCombobox } from "@/components/airlines/AirlineCombobox";

type RenewalType = "annual" | "rolling";

interface Airline {
  id: string;
  name: string;
  code: string;
  cpf_limit?: number | null;
  renewal_type?: RenewalType | null;
}

interface AirlineRule {
  airline_company_id: string;
  cpf_limit: number;
  renewal_type: RenewalType;
}

export default function ProgramRules() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [airlines, setAirlines] = useState<Airline[]>([]);
  const [rules, setRules] = useState<Record<string, AirlineRule>>({});
  const [originalRules, setOriginalRules] = useState<Record<string, AirlineRule>>({});

  // estado do formulário de inclusão de regra
  const [airlineId, setAirlineId] = useState("");
  const [cpfLimitInput, setCpfLimitInput] = useState("25");
  const [period, setPeriod] = useState<RenewalType>("annual");

  useEffect(() => {
    void fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("airline_companies")
        .select("id, name, code, cpf_limit, renewal_type")
        .order("name");

      if (error) throw error;

      const list = (data ?? []) as Airline[];
      setAirlines(list);

      // carrega regras atuais (estes defaults ficam na própria tabela da cia)
      const initial: Record<string, AirlineRule> = {};
      list.forEach((airline) => {
        initial[airline.id] = {
          airline_company_id: airline.id,
          cpf_limit: normalizeLimit(airline.cpf_limit),
          renewal_type: normalizeRenewal(airline.renewal_type),
        };
      });
      setRules(initial);
      setOriginalRules(initial);
    } catch (err: any) {
      toast({
        title: "Erro ao carregar dados",
        description: err?.message ?? "Não foi possível obter as companhias.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const normalizeLimit = (v: number | null | undefined) => {
    const n = Number(v ?? 25);
    if (!Number.isFinite(n)) return 25;
    return Math.min(Math.max(Math.round(n), 1), 1000); // 1..1000
  };

  const normalizeRenewal = (v: RenewalType | null | undefined): RenewalType =>
    v === "rolling" ? "rolling" : "annual";

  const options = useMemo(
    () => airlines.map((a) => ({ id: a.id, label: `${a.name} (${a.code})` })),
    [airlines]
  );

  // —————————————————————————————————————
  // CRIAR COMPANHIA (usado pelo combobox e pelo botão "Nova companhia")
  // —————————————————————————————————————
  const createAirline = async (name: string, code: string) => {
    const { data, error } = await supabase
      .from("airline_companies")
      .insert({ name: name.trim(), code: code.trim().toUpperCase() })
      .select("id, name, code")
      .single();
    if (error) throw error;
    const created = data as Airline;

    // atualiza lista local
    setAirlines((prev) => {
      const next = [...prev, created].sort((a, b) => a.name.localeCompare(b.name));
      return next;
    });

    // cria regra default para edição imediata
    setRules((prev) => ({
      ...prev,
      [created.id]: {
        airline_company_id: created.id,
        cpf_limit: 25,
        renewal_type: "annual",
      },
    }));

    toast({
      title: "Companhia adicionada",
      description: `${created.name} (${created.code}) criada com sucesso.`,
    });

    return created;
  };

  // usado pelo combobox quando o termo digitado não existe
  const handleComboboxCreate = async (typed: string) => {
    // permite "Nome (COD)" ou pergunta o código
    const match = typed.match(/^(.+?)\s*\((\w{1,4})\)\s*$/i);
    let name = typed.trim();
    let code = "";

    if (match) {
      name = match[1].trim();
      code = match[2].toUpperCase();
    } else {
      const promptCode = window.prompt(`Informe o código (ex.: LA para LATAM) para "${typed}":`);
      if (!promptCode) return null;
      code = promptCode.toUpperCase().trim();
    }

    try {
      const created = await createAirline(name, code);
      // seleciona no formulário de regra
      setAirlineId(created.id);
      return { id: created.id, label: `${created.name} (${created.code})` };
    } catch (err: any) {
      toast({
        title: "Erro ao criar companhia",
        description:
          err?.message?.includes("permission") || err?.code === "42501"
            ? "Sem permissão para inserir em airline_companies (RLS)."
            : err?.message ?? "Tente novamente.",
        variant: "destructive",
      });
      return null;
    }
  };

  // botão lateral “Nova companhia” (caso o botão do combobox não apareça)
  const handleCreateAirlineViaPrompt = async () => {
    const name = window.prompt("Nome da companhia (ex.: LATAM):");
    if (!name) return;
    const code = window.prompt("Código (ex.: LA):");
    if (!code) return;
    try {
      const created = await createAirline(name, code);
      setAirlineId(created.id);
    } catch (err: any) {
      toast({
        title: "Erro ao criar companhia",
        description:
          err?.message?.includes("permission") || err?.code === "42501"
            ? "Sem permissão para inserir em airline_companies (RLS)."
            : err?.message ?? "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  // —————————————————————————————————————
  // SALVAR REGRA (atualiza na tabela airline_companies)
  // —————————————————————————————————————
  const addOrUpdateRule = async () => {
    if (!airlineId) {
      toast({ title: "Selecione uma companhia", variant: "destructive" });
      return;
    }
    const cpfLimit = normalizeLimit(Number(cpfLimitInput));

    try {
      const { error } = await supabase
        .from("airline_companies")
        .update({ cpf_limit: cpfLimit, renewal_type: period })
        .eq("id", airlineId);

      if (error) throw error;

      // reflete no estado
      setRules((prev) => ({
        ...prev,
        [airlineId]: {
          airline_company_id: airlineId,
          cpf_limit: cpfLimit,
          renewal_type: period,
        },
      }));

      toast({ title: "Regra salva", description: "Configuração aplicada à companhia." });
      // limpa seleção
      setAirlineId("");
      setCpfLimitInput("25");
      setPeriod("annual");
    } catch (err: any) {
      toast({
        title: "Erro ao salvar regra",
        description: err?.message ?? "Verifique sua conexão/RLS e tente novamente.",
        variant: "destructive",
      });
    }
  };

  // —————————————————————————————————————
  // EDITAR REGRAS EM MASSA (parte inferior)
  // —————————————————————————————————————
  const updateRule = (airlineId: string, field: keyof AirlineRule, value: any) => {
    setRules((prev) => {
      const curr = prev[airlineId];
      if (!curr) return prev;
      const next: AirlineRule = {
        ...curr,
        [field]:
          field === "cpf_limit"
            ? normalizeLimit(Number(value))
            : (value as RenewalType),
      };
      return { ...prev, [airlineId]: next };
    });
  };

  const diffToSave = useMemo(() => {
    const changes: { id: string; cpf_limit: number; renewal_type: RenewalType }[] = [];
    for (const [id, r] of Object.entries(rules)) {
      const orig = originalRules[id];
      if (!orig) continue;
      if (orig.cpf_limit !== r.cpf_limit || orig.renewal_type !== r.renewal_type) {
        changes.push({ id, cpf_limit: r.cpf_limit, renewal_type: r.renewal_type });
      }
    }
    return changes;
  }, [rules, originalRules]);

  const handleSaveAll = async () => {
    if (diffToSave.length === 0) {
      toast({ title: "Nada para salvar", description: "Nenhuma alteração detectada." });
      return;
    }
    try {
      setSaving(true);
      for (const row of diffToSave) {
        const { error } = await supabase
          .from("airline_companies")
          .update({ cpf_limit: row.cpf_limit, renewal_type: row.renewal_type })
          .eq("id", row.id);
        if (error) throw error;
      }
      setOriginalRules(rules);
      toast({ title: "Regras salvas", description: "As configurações foram atualizadas." });
    } catch (err: any) {
      toast({
        title: "Erro ao salvar regras",
        description: err?.message ?? "Verifique sua conexão/RLS e tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container max-w-4xl mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-full" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
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
          <h1 className="text-3xl font-bold">Programas Configurados</h1>
          <p className="text-muted-foreground">
            Selecione quais programas de milhas sua agência trabalha e defina as regras padrão para cada um.
          </p>
        </div>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Estas configurações serão aplicadas ao criar <b>novas</b> contas. Contas existentes não mudam automaticamente.
        </AlertDescription>
      </Alert>

      {/* ——— Adicionar/Atualizar regra para UMA companhia ——— */}
      <Card>
        <CardHeader>
          <CardTitle>Adicionar Programa</CardTitle>
          <CardDescription>Selecione um programa e defina as regras padrão</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-3 items-start">
            <div className="space-y-2">
              <div className="flex gap-2">
                <div className="flex-1">
                  <AirlineCombobox
                    options={options}
                    value={airlineId}
                    onChange={setAirlineId}
                    onCreate={handleComboboxCreate}   // << criação pelo combobox
                    placeholder="Programa/Cia"
                  />
                </div>
                <Button variant="secondary" onClick={handleCreateAirlineViaPrompt} title="Nova companhia">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Dica: você pode digitar “Nome (COD)” e clicar em Adicionar.
              </p>
            </div>

            <Input
              placeholder="Limite por CPF"
              value={cpfLimitInput}
              onChange={(e) => setCpfLimitInput(e.target.value)}
              inputMode="numeric"
            />

            <Select value={period} onValueChange={(v: RenewalType) => setPeriod(v)}>
              <SelectTrigger><SelectValue placeholder="Período" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="annual">por ano (vira em 01/jan)</SelectItem>
                <SelectItem value="rolling">em 1 ano após uso</SelectItem>
              </SelectContent>
            </Select>

          </div>

          <Button onClick={addOrUpdateRule} disabled={!airlineId}>
            Salvar Regra
          </Button>
        </CardContent>
      </Card>

      {/* ——— Lista para edição em massa ——— */}
      <Card>
        <CardHeader>
          <CardTitle>Programas Ativos</CardTitle>
          <CardDescription>Esses programas estarão disponíveis ao cadastrar contas e realizar vendas.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {airlines.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma companhia cadastrada. Use “Nova companhia” para criar.
            </p>
          ) : (
            airlines.map((airline) => {
              const rule = rules[airline.id];
              return (
                <div key={airline.id} className="flex items-center justify-between border rounded-md px-3 py-2">
                  <div className="space-y-0.5">
                    <div className="font-medium">
                      {airline.name} ({airline.code})
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Limite por CPF: <b>{rule?.cpf_limit ?? 25}</b> — Período:{" "}
                      <b>{(rule?.renewal_type ?? "annual") === "rolling" ? "em 1 ano após uso" : "por ano (01/jan)"}</b>
                    </div>
                  </div>
                  <div className="flex gap-3 items-center">
                    <Input
                      className="w-24"
                      type="number"
                      min={1}
                      max={1000}
                      value={rule?.cpf_limit ?? 25}
                      onChange={(e) => updateRule(airline.id, "cpf_limit", e.target.value)}
                    />
                    <Select
                      value={rule?.renewal_type ?? "annual"}
                      onValueChange={(v: RenewalType) => updateRule(airline.id, "renewal_type", v)}
                    >
                      <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="annual">por ano (01/jan)</SelectItem>
                        <SelectItem value="rolling">em 1 ano após uso</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => navigate("/dashboard")}>
          Cancelar
        </Button>
        <Button onClick={handleSaveAll} disabled={saving || diffToSave.length === 0}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Salvando..." : diffToSave.length === 0 ? "Nada a salvar" : "Salvar Alterações"}
        </Button>
      </div>
    </div>
  );
}
