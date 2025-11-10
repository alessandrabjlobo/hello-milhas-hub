import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Clock } from "lucide-react";
import { format, parseISO, isBefore, isAfter, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CPFRenewal {
  id: string;
  full_name: string;
  cpf_encrypted: string;
  blocked_until: string;
  usage_count: number;
  renewal_near: boolean;
}

interface CPFRenewalCalendarProps {
  airlineCompanyId: string;
}

export function CPFRenewalCalendar({ airlineCompanyId }: CPFRenewalCalendarProps) {
  const [renewals, setRenewals] = useState<CPFRenewal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRenewals();
  }, [airlineCompanyId]);

  const fetchRenewals = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("cpf_registry_with_status")
        .select("id, full_name, cpf_encrypted, blocked_until, usage_count, renewal_near")
        .eq("airline_company_id", airlineCompanyId)
        .not("blocked_until", "is", null)
        .order("blocked_until", { ascending: true });

      if (error) throw error;
      setRenewals(data || []);
    } catch (error) {
      console.error("Failed to fetch renewals:", error);
    } finally {
      setLoading(false);
    }
  };

  const maskCPF = (cpf: string) => {
    return `***.***.***-${cpf.slice(-2)}`;
  };

  const groupByMonth = (renewals: CPFRenewal[]) => {
    const groups: Record<string, CPFRenewal[]> = {};
    const now = new Date();
    const threeMonthsFromNow = addMonths(now, 3);

    renewals.forEach((renewal) => {
      const renewalDate = parseISO(renewal.blocked_until);
      
      // Só mostrar renovações futuras ou dos próximos 3 meses
      if (isAfter(renewalDate, now) || isBefore(renewalDate, threeMonthsFromNow)) {
        const monthKey = format(renewalDate, "yyyy-MM", { locale: ptBR });
        if (!groups[monthKey]) {
          groups[monthKey] = [];
        }
        groups[monthKey].push(renewal);
      }
    });

    return groups;
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  if (renewals.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>Nenhuma renovação de CPF programada</p>
        </CardContent>
      </Card>
    );
  }

  const groupedRenewals = groupByMonth(renewals);
  const sortedMonths = Object.keys(groupedRenewals).sort();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="h-4 w-4" />
        <span>Calendário de Renovações - CPFs que voltarão a estar disponíveis</span>
      </div>

      {sortedMonths.map((monthKey) => {
        const monthRenewals = groupedRenewals[monthKey];
        const monthDate = parseISO(`${monthKey}-01`);
        const isNear = monthRenewals.some((r) => r.renewal_near);

        return (
          <Card key={monthKey} className={isNear ? "border-primary" : ""}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-lg">
                <span className="capitalize">
                  {format(monthDate, "MMMM 'de' yyyy", { locale: ptBR })}
                </span>
                <Badge variant={isNear ? "default" : "secondary"}>
                  {monthRenewals.length} CPF{monthRenewals.length !== 1 ? "s" : ""}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {monthRenewals.map((renewal) => (
                  <div
                    key={renewal.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{renewal.full_name}</p>
                      <p className="text-sm text-muted-foreground font-mono">
                        {maskCPF(renewal.cpf_encrypted)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {format(parseISO(renewal.blocked_until), "dd/MM/yyyy")}
                      </p>
                      {renewal.renewal_near && (
                        <Badge variant="secondary" className="text-xs mt-1">
                          Próximo
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
