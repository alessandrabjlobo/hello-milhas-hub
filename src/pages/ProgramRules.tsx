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
import { getSupplierId } from "@/lib/getSupplierId";
import { saveProgramRule } from "@/actions/saveProgramRule";

type RenewalType = "annual" | "rolling";

interface Airline {
  id: string;
  name: string;
  code: string;
}

interface ProgramRule {
  airline_id: string;
  cpf_limit: number;
  renewal_type: RenewalType;
}

export default function ProgramRules() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [airlines, setAirlines] = useState<Airline[]>([]);
  const [rules, setRules] = useState<Record<string, ProgramRule>>({});
  const [originalRules, setOriginalRules] = useState<Record<string, ProgramRule>>({});

  // Quick-add form state
  const [airlineId, setAirlineId] = useState("");
  const [cpfLimitInput, setCpfLimitInput] = useState("25");
  const [period, setPeriod] = useState<RenewalType>("annual");

  useEffect(() => {
    void fetchData();
  }, []);

  const normalizeLimit = (v: number | null | undefined) => {
    const n = Number(v ?? 25);
    if (!Number.isFinite(n)) return 25;
    return Math.min(Math.max(Math.round(n), 1), 1000);
  };

  const normalizeRenewal = (v: RenewalType | null | undefined): RenewalType =>
    v === "rolling" ? "rolling" : "annual";

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch airlines
      const { data: airlinesData, error: airlinesError } = await supabase
        .from("airline_companies")
        .select("id, name, code")
        .order("name");

      if (airlinesError) throw airlinesError;

      const airlineList = (airlinesData ?? []) as Airline[];
      setAirlines(airlineList);

      // Fetch program rules for user's supplier
      const { supplierId } = await getSupplierId();
      const { data: rulesData, error: rulesError } = await supabase
        .from("program_rules")
        .select("airline_id, cpf_limit, renewal_type")
        .eq("supplier_id", supplierId);

      if (rulesError) throw rulesError;

      // Build rules map with defaults for airlines without rules
      const rulesMap: Record<string, ProgramRule> = {};
      airlineList.forEach((airline) => {
        const existingRule = rulesData?.find((r: any) => r.airline_id === airline.id);
        rulesMap[airline.id] = existingRule
          ? {
              airline_id: airline.id,
              cpf_limit: normalizeLimit(existingRule.cpf_limit),
              renewal_type: normalizeRenewal(existingRule.renewal_type as RenewalType),
            }
          : {
              airline_id: airline.id,
              cpf_limit: 25,
              renewal_type: "annual",
            };
      });

      setRules(rulesMap);
      setOriginalRules(JSON.parse(JSON.stringify(rulesMap)));
    } catch (err: any) {
      toast({
        title: "Error loading data",
        description: err?.message ?? "Check your connection and try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const options = useMemo(
    () => airlines.map((a) => ({ id: a.id, label: `${a.name} (${a.code})` })),
    [airlines]
  );

  // Create airline
  const createAirline = async (name: string, code: string) => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error("Not authenticated");

    const { data, error } = await supabase
      .from("airline_companies")
      .insert({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        user_id: userData.user.id,
      })
      .select("id, name, code")
      .single();

    if (error) throw error;

    const created = data as Airline;
    setAirlines((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
    setRules((prev) => ({
      ...prev,
      [created.id]: {
        airline_id: created.id,
        cpf_limit: 25,
        renewal_type: "annual",
      },
    }));
    toast({
      title: "Airline added",
      description: `${created.name} (${created.code}) created successfully.`,
    });
    return created;
  };

  // Combobox create handler
  const handleComboboxCreate = async (typed: string) => {
    const match = typed.match(/^(.+?)\s*\((\w{1,4})\)\s*$/i);
    let name = typed.trim();
    let code = "";

    if (match) {
      name = match[1].trim();
      code = match[2].toUpperCase();
    } else {
      const promptCode = window.prompt(
        `Enter code (e.g., LA for LATAM) for "${typed}":`
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
        title: "Error creating airline",
        description: err?.message ?? "Try again.",
        variant: "destructive",
      });
      return null;
    }
  };

  // Button to create airline via prompt
  const handleCreateAirlineViaPrompt = async () => {
    const name = window.prompt("Airline name (e.g., LATAM):");
    if (!name) return;
    const code = window.prompt("Code (e.g., LA):");
    if (!code) return;
    try {
      const created = await createAirline(name, code);
      setAirlineId(created.id);
    } catch (err: any) {
      toast({
        title: "Error creating airline",
        description: err?.message ?? "Try again.",
        variant: "destructive",
      });
    }
  };

  // Quick-add: save rule for selected airline
  const addOrUpdateRule = async () => {
    if (!airlineId) {
      toast({ title: "Select an airline", variant: "destructive" });
      return;
    }
    const cpfLimit = normalizeLimit(Number(cpfLimitInput));

    try {
      await saveProgramRule({
        airline_id: airlineId,
        cpf_limit: cpfLimit,
        renewal_type: period,
      });

      setRules((prev) => ({
        ...prev,
        [airlineId]: {
          airline_id: airlineId,
          cpf_limit: cpfLimit,
          renewal_type: period,
        },
      }));

      setOriginalRules((prev) => ({
        ...prev,
        [airlineId]: {
          airline_id: airlineId,
          cpf_limit: cpfLimit,
          renewal_type: period,
        },
      }));

      toast({
        title: "Rule saved",
        description: "Configuration applied successfully.",
      });
      setAirlineId("");
      setCpfLimitInput("25");
      setPeriod("annual");
    } catch (err: any) {
      toast({
        title: "Error saving rule",
        description: err?.message ?? "Check connection/RLS and try again.",
        variant: "destructive",
      });
    }
  };

  // Bulk edit: update rule in state
  const updateRule = (id: string, field: keyof ProgramRule, value: any) => {
    setRules((prev) => {
      const curr = prev[id] ?? {
        airline_id: id,
        cpf_limit: 25,
        renewal_type: "annual" as RenewalType,
      };
      const next: ProgramRule = {
        ...curr,
        [field]:
          field === "cpf_limit"
            ? normalizeLimit(Number(value))
            : (value as RenewalType),
      };
      return { ...prev, [id]: next };
    });
  };

  // Detect changes
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

  // Save all changes
  const handleSaveAll = async () => {
    if (diffToSave.length === 0) {
      toast({ title: "Nothing to save", description: "No changes detected." });
      return;
    }
    try {
      setSaving(true);

      for (const row of diffToSave) {
        await saveProgramRule({
          airline_id: row.id,
          cpf_limit: row.cpf_limit,
          renewal_type: row.renewal_type,
        });
      }

      setOriginalRules(JSON.parse(JSON.stringify(rules)));
      toast({
        title: "Rules saved",
        description: "All changes saved successfully.",
      });
    } catch (err: any) {
      toast({
        title: "Error saving rules",
        description: err?.message ?? "Check connection/RLS and try again.",
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
          <h1 className="text-3xl font-bold">Program Rules</h1>
          <p className="text-muted-foreground">
            Configure which programs your agency works with and set default rules for each.
          </p>
        </div>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          These settings will be applied when creating <b>new</b> accounts.
        </AlertDescription>
      </Alert>

      {/* Quick-add form */}
      <Card>
        <CardHeader>
          <CardTitle>Add Program</CardTitle>
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
                    placeholder="Program/Airline"
                  />
                </div>
                <Button variant="secondary" onClick={handleCreateAirlineViaPrompt} title="New airline">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Tip: type "Name (CODE)" and click Add.
              </p>
            </div>

            <Input
              placeholder="CPF Limit"
              value={cpfLimitInput}
              onChange={(e) => setCpfLimitInput(e.target.value)}
              inputMode="numeric"
            />

            <Select value={period} onValueChange={(v: RenewalType) => setPeriod(v)}>
              <SelectTrigger><SelectValue placeholder="Period" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="annual">Annual (resets Jan 1)</SelectItem>
                <SelectItem value="rolling">Rolling (1 year from use)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={addOrUpdateRule} disabled={!airlineId}>
            Save Rule
          </Button>
        </CardContent>
      </Card>

      {/* Bulk edit list */}
      <Card>
        <CardHeader>
          <CardTitle>Active Programs</CardTitle>
          <CardDescription>These programs will be available when creating accounts and sales.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {airlines.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No airlines registered. Use "New airline" to create one.
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
                      CPF Limit: <b>{rule?.cpf_limit ?? 25}</b> — Period:{" "}
                      <b>{(rule?.renewal_type ?? "annual") === "rolling" ? "Rolling (1 year)" : "Annual (Jan 1)"}</b>
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
                        <SelectItem value="annual">Annual (Jan 1)</SelectItem>
                        <SelectItem value="rolling">Rolling (1 year)</SelectItem>
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
          Cancel
        </Button>
        <Button onClick={handleSaveAll} disabled={saving || diffToSave.length === 0}>
          <Save className="h-4 w-4 mr-2" />
          {saving
            ? "Saving..."
            : diffToSave.length === 0
              ? "No changes"
              : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
