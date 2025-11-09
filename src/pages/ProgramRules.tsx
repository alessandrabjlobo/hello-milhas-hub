import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Save, Info, Plus } from "lucide-react";
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

/* ------------------ OFFLINE (localStorage) ------------------ */
const AIRLINES_KEY = "hm_offline_airlines_v1";

const offline = {
  readAll(): Airline[] {
    try {
      const raw = localStorage.getItem(AIRLINES_KEY);
      const list = raw ? (JSON.parse(raw) as Airline[]) : [];
      return list.sort((a, b) => a.name.localeCompare(b.name));
    } catch {
      return [];
    }
  },
  writeAll(list: Airline[]) {
    localStorage.setItem(AIRLINES_KEY, JSON.stringify(list));
  },
  upsertMany(list: Airline[]) {
    // sobrescreve por completo (usado após sincronizar do servidor)
    this.writeAll(list);
  },
  create(name: string, code: string): Airline {
    const id = (crypto as any).randomUUID?.() || `${Date.now()}_${Math.random()}`;
    const next: Airline = {
      id,
      name: name.trim(),
      code: code.trim().toUpperCase(),
      cpf_limit: 25,
      renewal_type: "annual",
    };
    const all = this.readAll();
    all.push(next);
    this.writeAll(all);
    return next;
  },
  updateRule(id: string, cpf_limit: number, renewal_type: RenewalType) {
    const all = this.readAll();
    const ix = all.findIndex((a) => a.id === id);
    if (ix >= 0) {
      all[ix] = { ...all[ix], cpf_limit, renewal_type };
      this.writeAll(all);
    }
  },
};
/* ------------------------------------------------------------ */

export default function ProgramRules() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  const [airlines, setAirlines] = useState<Airline[]>([]);
  const [rules, setRules] = useState<Record<string, AirlineRule>>({});
  const [originalRules, setOriginalRules] = useState<Record<string, AirlineRule>>({});

  // formulário “Adicionar Programa”
  const [airlineId, setAirlineId] = useState("");
  const [cpfLimitInput, setCpfLimitInput] = useState("25");
  const [period, setPeriod] = useState<RenewalType>("annual");

  useEffect(() => {
    void fetchData();
  }, []);

  const normalizeLimit = (v: number | null | undefined) => {
    const n = Number(v ?? 25);
    if (!Number.isFinite(n)) return 25;
    return Math.min(Math.max(Math.round(n), 1), 1000); // 1..1000
  };

  const normalizeRenewal = (v: RenewalType | null | undefined): RenewalType =>
    v === "rolling" ? "rolling" : "annual";

  const buildRulesMap = (list: Airline[]) => {
    const initial: Record<string, AirlineRule> = {};
    list.forEach((airline) => {
      initial[airline.id] = {
        airline_company_id: airline.id,
        cpf_limit: normalizeLimit(airline.cpf_limit),
        renewal_type: normalizeRenewal(airline.renewal_type),
      };
    });
    return initial;
  };

  const fetchData = async () => {
    try {
      setLoading(true);

      // 1) tenta ONLINE
      const { data, error } = await supabase
        .from("airline_companies")
        .select("id, name, code, cpf_limit, renewal_type")
        .order("name");

      if (error) throw error;

      const serverList = (data ?? []) as Airline[];
      setIsOffline(false);

      // 2) antes de setar UI, sincroniza o que existir offline → online
      await syncOfflineToServer(serverList);

      // 3) refetch “oficial” pós-sync (garante que UI reflita servidor)
      const { data: data2, error: err2 } = await supabase
        .from("airline_companies")
        .select("id, name, code, cpf_limit, renewal_type")
        .order("name");
      if (err2) throw err2;

      const finalList = (data2 ?? []) as Airline[];
      setAirlines(finalList);
      setRules(buildRulesMap(finalList));
      setOriginalRules(buildRulesMap(finalList));

      // 4) mantém offline como espelho do servidor (para funcionar sem rede)
      offline.upsertMany(finalList);
    } catch {
      // OFFLINE: carrega do cache local
      const list = offline.readAll();
      setAirlines(list);
      setRules(buildRulesMap(list));
      setOriginalRules(buildRulesMap(list));
      setIsOffline(true);

      toast({
        title: "Sem acesso ao Supabase",
        description: "Usando modo offline (dados salvos no navegador).",
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Sincroniza:
   *  - Companhias existentes apenas offline (não presentes no servidor) → cria no Supabase
   *  - Regras offline que diferem do servidor → atualiza no Supabase
   */
  const syncOfflineToServer = async (serverList: Airline[]) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return; // sem auth, não tenta sync

      const local = offline.readAll();
      if (local.length === 0) return;

      // índice por "name|code" para dedup simples
      const serverIndex = new Map<string, Airline>();
      serverList.forEach((a) =>
        serverIndex.set(`${a.name.toLowerCase()}|${a.code.toUpperCase()}`, a)
      );

      // 1) cria no servidor as companhias que só existem offline
      const toCreate = local.filter(
        (loc) => !serverIndex.has(`${loc.name.toLowerCase()}|${loc.code.toUpperCase()}`)
      );

      for (const item of toCreate) {
        // tenta inserir; se falhar por RLS/duplicidade, ignora e continua
        const { error, data } = await supabase
          .from("airline_companies")
          .insert({
            name: item.name.trim(),
            code: item.code.trim().toUpperCase(),
            user_id: userData.user.id,
            cpf_limit: item.cpf_limit ?? 25,
            renewal_type: item.renewal_type ?? "annual",
          })
          .select("id, name, code, cpf_limit, renewal_type")
          .single();

        if (!error && data) {
          serverIndex.set(`${data.name.toLowerCase()}|${data.code.toUpperCase()}`, data as Airline);
        }
      }

      // 2) aplica regras offline no servidor quando divergirem
      //    (usamos name+code para mapear a companhia criada/exists)
      for (const loc of local) {
        const key = `${loc.name.toLowerCase()}|${loc.code.toUpperCase()}`;
        const server = serverIndex.get(key);
        if (!server) continue;

        const targetLimit = normalizeLimit(loc.cpf_limit);
        const targetRenew = normalizeRenewal(loc.renewal_type);

        const serverLimit = normalizeLimit(server.cpf_limit);
        const serverRenew = normalizeRenewal(server.renewal_type);

        if (serverLimit !== targetLimit || serverRenew !== targetRenew) {
          await supabase
            .from("airline_companies")
            .update({ cpf_limit: targetLimit, renewal_type: targetRenew })
            .eq("id", server.id);
        }
      }
    } catch {
      // qualquer falha: não bloqueia a página
    }
  };

  const options = useMemo(
    () => airlines.map((a) => ({ id: a.id, label: `${a.name} (${a.code})` })),
    [airlines]
  );

  // ——— criar companhia (combobox/botão) ———
  const createAirline = async (name: string, code: string) => {
    if (isOffline) {
      const created = offline.create(name, code);
      setAirlines((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setRules((prev) => ({
        ...prev,
        [created.id]: {
          airline_company_id: created.id,
          cpf_limit: 25,
          renewal_type: "annual",
        },
      }));
      toast({
        title: "Companhia (offline)",
        description: `${created.name} (${created.code}) criada localmente.`,
      });
      return created;
    }

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error("Usuário não autenticado");

    const { data, error } = await supabase
      .from("airline_companies")
      .insert({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        user_id: userData.user.id,
      })
      .select("id, name, code, cpf_limit, renewal_type")
      .single();

    if (error) {
      // Se falhar, alterna para offline e cria local
      setIsOffline(true);
      const created = offline.create(name, code);
      setAirlines((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setRules((prev) => ({
        ...prev,
        [created.id]: { airline_company_id: created.id, cpf_limit: 25, renewal_type: "annual" },
      }));
      toast({
        title: "Sem acesso ao Supabase",
        description: "Companhia criada localmente (offline).",
      });
      return created;
    }

    const created = data as Airline;
    setAirlines((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
    setRules((prev) => ({
      ...prev,
      [created.id]: {
        airline_company_id: created.id,
        cpf_limit: normalizeLimit(created.cpf_limit),
        renewal_type: normalizeRenewal(created.renewal_type),
      },
    }));
    toast({
      title: "Companhia adicionada",
      description: `${created.name} (${created.code}) criada com sucesso.`,
    });
    return created;
  };

  // usado pelo combobox quando não encontra resultados
  const handleComboboxCreate = async (typed: string) => {
    const match = typed.match(/^(.+?)\s*\((\w{1,4})\)\s*$/i);
    let name = typed.trim();
    let code = "";

    if (match) {
      name = match[1].trim();
      code = match[2].toUpperCase();
    } else {
      const promptCode = window.prompt(
        `Informe o código (ex.: LA para LATAM) para "${typed}":`
      );
      if (!promptCode) return null;
      code = promptCode.toUpperCase().trim();
    }

    try {
      const created = await createAirline(name, code);
      setAirlineId(created.id);
      return { id: created.id, label: `${created.name} (${created.code})` };
    } catch (err: any) {
      toast({
        title: "Erro ao criar companhia",
        description: err?.message ?? "Tente novamente.",
        variant: "destructive",
      });
      return null;
    }
  };

  // botão auxiliar “Nova companhia”
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
        description: err?.message ?? "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  // ——— salvar regra para UMA companhia (topo) ———
  const addOrUpdateRule = async () => {
    if (!airlineId) {
      toast({ title: "Selecione uma companhia", variant: "destructive" });
      return;
    }
    const cpfLimit = normalizeLimit(Number(cpfLimitInput));

    try {
      if (isOffline) {
        offline.updateRule(airlineId, cpfLimit, period);
      } else {
        const { error } = await supabase
          .from("airline_companies")
          .update({ cpf_limit: cpfLimit, renewal_type: period })
          .eq("id", airlineId);

        if (error) {
          // Falhou → salva local e marca offline
          setIsOffline(true);
          offline.updateRule(airlineId, cpfLimit, period);
        }
      }

      setRules((prev) => ({
        ...prev,
        [airlineId]: {
          airline_company_id: airlineId,
          cpf_limit: cpfLimit,
          renewal_type: period,
        },
      }));

      toast({
        title: "Regra salva",
        description: isOffline ? "Aplicada localmente (offline)." : "Configuração aplicada.",
      });
      setAirlineId("");
      setCpfLimitInput("25");
      setPeriod("annual");
    } catch (err: any) {
      toast({
        title: "Erro ao salvar regra",
        description: err?.message ?? "Verifique conexão/RLS e tente novamente.",
        variant: "destructive",
      });
    }
  };

  // ——— edição em massa (lista) ———
  const updateRule = (id: string, field: keyof AirlineRule, value: any) => {
    setRules((prev) => {
      const curr = prev[id] ?? {
        airline_company_id: id,
        cpf_limit: 25,
        renewal_type: "annual" as RenewalType,
      };
      const next: AirlineRule = {
        ...curr,
        [field]:
          field === "cpf_limit"
            ? normalizeLimit(Number(value))
            : (value as RenewalType),
      };
      return { ...prev, [id]: next };
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

      if (isOffline) {
        for (const row of diffToSave) {
          offline.updateRule(row.id, row.cpf_limit, row.renewal_type);
        }
      } else {
        for (const row of diffToSave) {
          const { error } = await supabase
            .from("airline_companies")
            .update({ cpf_limit: row.cpf_limit, renewal_type: row.renewal_type })
            .eq("id", row.id);
          if (error) {
            // Se falhar, migra pro offline e salva local
            setIsOffline(true);
            offline.updateRule(row.id, row.cpf_limit, row.renewal_type);
          }
        }
      }

      setOriginalRules(rules);
      toast({
        title: "Regras salvas",
        description: isOffline ? "Salvas localmente (offline)." : "Atualizadas no servidor.",
      });
    } catch (err: any) {
      toast({
        title: "Erro ao salvar regras",
        description: err?.message ?? "Verifique conexão/RLS e tente novamente.",
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

  const options = useMemo(
    () => airlines.map((a) => ({ id: a.id, label: `${a.name} (${a.code})` })),
    [airlines]
  );

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">
            Programas Configurados {isOffline && <span className="text-xs text-yellow-600 ml-2">(offline)</span>}
          </h1>
          <p className="text-muted-foreground">
            Selecione quais programas sua agência trabalha e defina as regras padrão para cada um.
          </p>
        </div>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Estas configurações serão aplicadas ao criar <b>novas</b> contas.
          {isOffline && " Em modo offline, os dados ficam salvos apenas neste navegador. Ao voltar a conexão, sincronizamos automaticamente."}
        </AlertDescription>
      </Alert>

      {/* Topo: adicionar/atualizar regra de UMA companhia */}
      <Card>
        <CardHeader>
          <CardTitle>Adicionar Programa</CardTitle>
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
                    onCreate={handleComboboxCreate}
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

      {/* Lista e edição em massa */}
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
          {saving
            ? "Salvando..."
            : diffToSave.length === 0
              ? "Nada a salvar"
              : isOffline
                ? "Salvar (offline)"
                : "Salvar Alterações"}
        </Button>
      </div>
    </div>
  );
}
