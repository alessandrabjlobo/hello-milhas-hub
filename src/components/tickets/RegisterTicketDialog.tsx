import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useSales } from "@/hooks/useSales";
import { useTickets } from "@/hooks/useTickets";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TicketPDFUpload } from "./TicketPDFUpload";

const formSchema = z.object({
  sale_id: z.string().min(1, "Selecione uma venda"),
  pnr: z.string().optional(),
  ticket_number: z.string().optional(),
  issued_at: z.date().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface RegisterTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saleId?: string;
}

export function RegisterTicketDialog({ open, onOpenChange, saleId }: RegisterTicketDialogProps) {
  const { sales } = useSales();
  const { createTicket } = useTickets();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [cpfWarning, setCpfWarning] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<any[]>([]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      sale_id: saleId ?? "",
    },
  });

  const selectedSaleId = form.watch("sale_id");

  // Auto-fill when saleId is provided
  useEffect(() => {
    if (saleId && open) {
      form.setValue("sale_id", saleId);
    }
  }, [saleId, open, form]);

  // Check CPF usage when sale is selected
  useEffect(() => {
    const checkCPF = async () => {
      if (!selectedSaleId) {
        setCpfWarning(null);
        return;
      }

      const sale = sales.find(s => s.id === selectedSaleId);
      if (!sale || !sale.customer_cpf || !sale.mileage_account_id) {
        setCpfWarning(null);
        return;
      }

      try {
        // Buscar airline_company_id da conta
        const { data: accountData } = await supabase
          .from("mileage_accounts")
          .select("airline_company_id, cpf_count, cpf_limit")
          .eq("id", sale.mileage_account_id)
          .single();

        if (!accountData) return;

        // Check if CPF already exists using RPC
        const { data, error } = await supabase
          .rpc("check_cpf_exists", {
            p_airline_company_id: accountData.airline_company_id,
            p_cpf_encrypted: sale.customer_cpf
          });

        if (error) throw error;

        const existingCPF = data && data.length > 0 ? data[0] : null;

        if (!existingCPF) {
          // CPF is new - will consume a CPF slot
          const remaining = (accountData.cpf_limit || 25) - (accountData.cpf_count || 0);
          setCpfWarning(
            `⚠️ Este CPF é novo nesta conta. Será consumido 1 CPF. Restantes: ${remaining - 1}/${accountData.cpf_limit || 25}`
          );
        } else {
          setCpfWarning("✓ CPF já cadastrado. Não será consumido.");
        }
      } catch (error) {
        console.error("Error checking CPF:", error);
      }
    };

    checkCPF();
  }, [selectedSaleId, sales]);

  const onSubmit = async (data: FormData) => {
    try {
      setSubmitting(true);

      const sale = sales.find(s => s.id === data.sale_id);
      if (!sale) throw new Error("Venda não encontrada");

      const travelDates = typeof sale.travel_dates === 'object' && sale.travel_dates !== null ? sale.travel_dates as any : {};
      const success = await createTicket({
        sale_id: data.sale_id,
        ticket_code: data.pnr || `TKT-${Date.now()}`,
        pnr: data.pnr || null,
        ticket_number: data.ticket_number || null,
        issued_at: data.issued_at?.toISOString() || null,
        verification_status: "pending",
        route: sale.route_text || "",
        airline: sale.mileage_accounts?.airline_companies?.code || "N/A",
        passenger_name: sale.customer_name || "",
        passenger_cpf_encrypted: sale.customer_cpf || "",
        departure_date: travelDates.departure || new Date().toISOString().split('T')[0],
        status: "pending",
        attachments: attachments,
      });

      if (!success) return;

      // CPF consumption logic
      if (sale.customer_cpf && sale.mileage_account_id) {
        // Buscar airline_company_id da conta
        const { data: accountData } = await supabase
          .from("mileage_accounts")
          .select("airline_company_id")
          .eq("id", sale.mileage_account_id)
          .single();

        if (!accountData) {
          console.error("Account not found for CPF registration");
          return;
        }

        // Check if CPF already exists using RPC
        const { data: cpfData } = await supabase
          .rpc("check_cpf_exists", {
            p_airline_company_id: accountData.airline_company_id,
            p_cpf_encrypted: sale.customer_cpf
          });

        const existingCPF = cpfData && cpfData.length > 0 ? cpfData[0] : null;

        if (!existingCPF) {
          // CPF is new - insert and call RPC to update count
          const { data: userData } = await supabase.auth.getUser();
          const { error: cpfError } = await supabase
            .from("cpf_registry")
            .insert({
              airline_company_id: accountData.airline_company_id,
              cpf_encrypted: sale.customer_cpf,
              full_name: sale.customer_name || "",
              user_id: userData.user?.id || "",
            });

          if (cpfError) {
            console.error("Failed to insert CPF:", cpfError);
            throw cpfError;
          }

          // Atualizar contador usando RPC
          await supabase.rpc("update_account_cpf_count", {
            p_account_id: sale.mileage_account_id,
          });

          toast({
            title: "CPF consumido",
            description: "Um novo CPF foi registrado nesta conta.",
          });
        } else {
          // CPF already exists - just update last_used_at
          await supabase
            .from("cpf_registry")
            .update({ last_used_at: new Date().toISOString() })
            .eq("id", existingCPF.id);
        }
      }

      form.reset();
      setCpfWarning(null);
      setAttachments([]);
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Erro ao registrar passagem",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const openSales = sales.filter(s => s.status === "pending" || !s.status);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Emissão de Passagem</DialogTitle>
          <DialogDescription>
            Informe os dados da passagem emitida. O sistema irá verificar e registrar o uso de CPF automaticamente.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="sale_id"
              render={({ field }) => (
            <FormItem>
              <FormLabel>Venda *</FormLabel>
              <Select
                value={field.value}
                onValueChange={field.onChange}
                disabled={!!saleId}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma venda" />
                  </SelectTrigger>
                </FormControl>
                    <SelectContent>
                      {openSales.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground">
                          Nenhuma venda em aberto
                        </div>
                      ) : (
                        openSales.map((sale) => (
                          <SelectItem key={sale.id} value={sale.id}>
                            {sale.customer_name} - {sale.route_text} ({new Date(sale.created_at).toLocaleDateString("pt-BR")})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {saleId && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  ✓ Venda selecionada automaticamente. Preencha os dados da passagem emitida.
                </AlertDescription>
              </Alert>
            )}

            {cpfWarning && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{cpfWarning}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="pnr"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>PNR / Localizador</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="ABC123" className="uppercase" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ticket_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número do Bilhete</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="123-4567890123" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="issued_at"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Emissão</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "dd/MM/yyyy")
                            ) : (
                              <span>Selecione a data</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="border-t pt-4">
              <FormLabel>Anexar PDFs</FormLabel>
              <TicketPDFUpload
                attachments={attachments}
                onAttachmentsChange={setAttachments}
                disabled={submitting}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Registrando..." : "Registrar Passagem"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
