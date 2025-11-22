// src/pages/tickets/NewTicketPage.tsx
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

type Sale = Database["public"]["Tables"]["sales"]["Row"];
type TicketInsert = Database["public"]["Tables"]["tickets"]["Insert"];

export default function NewTicketPage() {
  const [searchParams] = useSearchParams();
  const saleId = searchParams.get("saleId");
  const navigate = useNavigate();
  const { toast } = useToast();

  const [sale, setSale] = useState<Sale | null>(null);
  const [loadingSale, setLoadingSale] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Campos do formulário
  const [passengerName, setPassengerName] = useState("");
  const [route, setRoute] = useState("");
  const [flightDate, setFlightDate] = useState("");
  const [airline, setAirline] = useState("");
  const [locator, setLocator] = useState("");
  const [ticketNumber, setTicketNumber] = useState("");
  const [status, setStatus] = useState<"confirmed" | "pending" | "processing">(
    "confirmed"
  );

  useEffect(() => {
    if (!saleId) {
      setLoadingSale(false);
      return;
    }

    const loadSale = async () => {
      try {
        setLoadingSale(true);
        const { data, error } = await supabase
          .from("sales")
          .select(
            `
            *,
            mileage_accounts (
              airline_companies (
                name,
                code
              )
            )
          `
          )
          .eq("id", saleId)
          .single();

        if (error) throw error;
        const s = data as Sale & {
          mileage_accounts?: { airline_companies?: { name?: string; code?: string } | null } | null;
        };

        setSale(s);

        // Pré-preenche o que der
        setPassengerName((s as any).customer_name || (s as any).client_name || "");
        setRoute((s as any).route_text || "");
        if ((s as any).travel_dates) {
          const d = new Date(String((s as any).travel_dates));
          if (!isNaN(d.getTime())) {
            setFlightDate(d.toISOString().substring(0, 10));
          }
        }
        const airlineName =
          (s as any).counter_airline_program ||
          s.mileage_accounts?.airline_companies?.name ||
          s.mileage_accounts?.airline_companies?.code ||
          "";
        setAirline(airlineName);
      } catch (e: any) {
        toast({
          title: "Erro ao carregar venda",
          description: e.message,
          variant: "destructive",
        });
      } finally {
        setLoadingSale(false);
      }
    };

    loadSale();
  }, [saleId, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saleId) {
      toast({
        title: "Venda não encontrada",
        description: "Volte para a lista de vendas e tente novamente.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);

      const payload: TicketInsert = {
        // @ts-ignore – garantimos no back que esses campos existem
        sale_id: saleId,
        passenger_name: passengerName || null,
        status,
        // os campos abaixo podem não existir no tipo gerado, por isso usamos any
        // e o Supabase vai ignorar o que não existir
        ...(route && { route } as any),
        ...(flightDate && { flight_date: flightDate } as any),
        ...(airline && { airline } as any),
        ...(locator && { locator } as any),
        ...(ticketNumber && { ticket_number: ticketNumber } as any),
      };

      const { error } = await supabase.from("tickets").insert(payload);

      if (error) throw error;

      toast({
        title: "Passagem registrada!",
        description: "A emissão foi registrada com sucesso.",
      });

      // Volta para a lista de passagens
      navigate("/tickets");
    } catch (e: any) {
      toast({
        title: "Erro ao registrar passagem",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingSale) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-sm text-muted-foreground">Carregando dados da venda...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Registrar emissão</h1>
        {sale && (
          <p className="text-sm text-muted-foreground mt-1">
            Venda: <strong>{sale.customer_name || (sale as any).client_name || "Cliente não informado"}</strong>{" "}
            • Rota: <strong>{(sale as any).route_text || "Rota não informada"}</strong>
          </p>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados da passagem</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* Passageiro */}
            <div className="space-y-1">
              <Label>Passageiro</Label>
              <Input
                value={passengerName}
                onChange={(e) => setPassengerName(e.target.value)}
                placeholder="Nome completo do passageiro"
              />
              {!passengerName && (
                <p className="text-xs text-amber-600">
                  ⚠ Ponto de atenção: informe o <strong>nome do passageiro</strong>.
                </p>
              )}
            </div>

            {/* Rota */}
            <div className="space-y-1">
              <Label>Rota</Label>
              <Input
                value={route}
                onChange={(e) => setRoute(e.target.value)}
                placeholder="Ex.: FOR → GRU"
              />
              {!route && (
                <p className="text-xs text-amber-600">
                  ⚠ Ponto de atenção: informe a <strong>rota da viagem</strong>.
                </p>
              )}
            </div>

            {/* Data do voo */}
            <div className="space-y-1">
              <Label>Data do voo</Label>
              <Input
                type="date"
                value={flightDate}
                onChange={(e) => setFlightDate(e.target.value)}
              />
              {!flightDate && (
                <p className="text-xs text-amber-600">
                  ⚠ Ponto de atenção: informe a <strong>data do voo</strong>.
                </p>
              )}
            </div>

            {/* Companhia */}
            <div className="space-y-1">
              <Label>Companhia / Programa</Label>
              <Input
                value={airline}
                onChange={(e) => setAirline(e.target.value)}
                placeholder="Ex.: LATAM, GOL, Smiles..."
              />
              {!airline && (
                <p className="text-xs text-amber-600">
                  ⚠ Ponto de atenção: informe a <strong>companhia ou programa</strong>.
                </p>
              )}
            </div>

            <Separator />

            {/* Localizador e bilhete */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Localizador (PNR)</Label>
                <Input
                  value={locator}
                  onChange={(e) => setLocator(e.target.value)}
                  placeholder="Ex.: ABC123"
                />
                {!locator && (
                  <p className="text-xs text-amber-600">
                    ⚠ Ponto de atenção: informe o <strong>localizador</strong>.
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <Label>Número do bilhete</Label>
                <Input
                  value={ticketNumber}
                  onChange={(e) => setTicketNumber(e.target.value)}
                  placeholder="Ex.: 9571234567890"
                />
                {!ticketNumber && (
                  <p className="text-xs text-amber-600">
                    ⚠ Ponto de atenção: informe o <strong>número do bilhete</strong>.
                  </p>
                )}
              </div>
            </div>

            {/* Status */}
            <div className="space-y-1">
              <Label>Status</Label>
              <Select
                value={status}
                onValueChange={(v) =>
                  setStatus(v as "confirmed" | "pending" | "processing")
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="confirmed">Confirmado</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="processing">Processando</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Salvando..." : "Salvar passagem"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
