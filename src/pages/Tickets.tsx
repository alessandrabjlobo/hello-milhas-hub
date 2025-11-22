import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PlusCircle,
  Eye,
  Calendar,
  MoreHorizontal,
  Edit,
  Trash2,
  Ticket as TicketIcon,
  Filter,
  X,
  FileText,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTickets } from "@/hooks/useTickets";
import { EmptyState } from "@/components/shared/EmptyState";
import { RegisterTicketDialog } from "@/components/tickets/RegisterTicketDialog";
import { EditTicketDialog } from "@/components/tickets/EditTicketDialog";
import { DeleteTicketDialog } from "@/components/tickets/DeleteTicketDialog";
import { TicketDetailDialog } from "@/components/tickets/TicketDetailDialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

// 👇 mesmo formato usado no TicketPDFUpload
type Attachment = {
  fileName: string;
  filePath: string;
  fileSize: number;
  uploadedAt: string;
  url: string;
};

export default function Tickets() {
  const navigate = useNavigate();
  const { tickets, loading, fetchTickets } = useTickets();
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false);
  const [editingTicket, setEditingTicket] =
    useState<(typeof tickets)[0] | null>(null);
  const [deletingTicket, setDeletingTicket] =
    useState<(typeof tickets)[0] | null>(null);
  const [detailTicket, setDetailTicket] =
    useState<(typeof tickets)[0] | null>(null);
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState(
    () => localStorage.getItem("tickets_filter_search") || ""
  );
  const [selectedAirline, setSelectedAirline] = useState(
    () => localStorage.getItem("tickets_filter_airline") || "all"
  );
  const [selectedStatus, setSelectedStatus] = useState(
    () => localStorage.getItem("tickets_filter_status") || "all"
  );
  const [dateFrom, setDateFrom] = useState(
    () => localStorage.getItem("tickets_filter_date_from") || ""
  );
  const [dateTo, setDateTo] = useState(
    () => localStorage.getItem("tickets_filter_date_to") || ""
  );

  // Persistir filtros
  useEffect(() => {
    localStorage.setItem("tickets_filter_search", searchTerm);
    localStorage.setItem("tickets_filter_airline", selectedAirline);
    localStorage.setItem("tickets_filter_status", selectedStatus);
    localStorage.setItem("tickets_filter_date_from", dateFrom);
    localStorage.setItem("tickets_filter_date_to", dateTo);
  }, [searchTerm, selectedAirline, selectedStatus, dateFrom, dateTo]);

  // Extrair companhias únicas (usando campo airline gravado no ticket,
  // com fallback para relação, se existir)
  const airlines = useMemo(() => {
    const uniqueAirlines = new Set<string>();
    tickets.forEach((t) => {
      const code =
        t.airline ||
        t.sales?.mileage_accounts?.airline_companies?.code ||
        "";
      if (code) uniqueAirlines.add(code);
    });
    return Array.from(uniqueAirlines).sort();
  }, [tickets]);

  // Status do voo em função da data
  const getFlightStatus = (departureDate: string | null) => {
    if (!departureDate) return "unknown";
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const flightDate = new Date(departureDate);
    flightDate.setHours(0, 0, 0, 0);

    if (flightDate < today) return "past";
    if (flightDate.getTime() === today.getTime()) return "today";
    return "future";
  };

  // Aplicar filtros
  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      // Busca (PNR, código do bilhete, cliente ou passageiro)
      if (searchTerm) {
        const search = searchTerm.toLowerCase();

        const matchesPNR = ticket.pnr
          ?.toLowerCase()
          .includes(search);

        const matchesTicket = ticket.ticket_code
          ?.toLowerCase()
          .includes(search);

        const matchesCustomer =
          ticket.sales?.customer_name
            ?.toLowerCase()
            .includes(search) ||
          ticket.passenger_name?.toLowerCase().includes(search);

        if (!matchesPNR && !matchesTicket && !matchesCustomer) {
          return false;
        }
      }

      // Companhia
      if (selectedAirline !== "all") {
        const airlineCode =
          ticket.airline ||
          ticket.sales?.mileage_accounts?.airline_companies?.code;
        if (airlineCode !== selectedAirline) return false;
      }

      // Status (passado, hoje, futuro)
      if (selectedStatus !== "all") {
        const status = getFlightStatus(
          ticket.departure_date || null
        );
        if (status !== selectedStatus) return false;
      }

      // Data "De"
      if (dateFrom && ticket.departure_date) {
        const ticketDate = new Date(ticket.departure_date);
        const fromDate = new Date(dateFrom);
        if (ticketDate < fromDate) return false;
      }

      // Data "Até"
      if (dateTo && ticket.departure_date) {
        const ticketDate = new Date(ticket.departure_date);
        const toDate = new Date(dateTo);
        if (ticketDate > toDate) return false;
      }

      return true;
    });
  }, [tickets, searchTerm, selectedAirline, selectedStatus, dateFrom, dateTo]);

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedAirline("all");
    setSelectedStatus("all");
    setDateFrom("");
    setDateTo("");
  };

  const hasActiveFilters =
    searchTerm ||
    selectedAirline !== "all" ||
    selectedStatus !== "all" ||
    dateFrom ||
    dateTo;

  const getFlightStatusDot = (ticket: (typeof tickets)[0]) => {
    if (!ticket.departure_date) {
      return (
        <div
          className="w-3 h-3 rounded-full bg-muted"
          title="Sem data"
        />
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const flightDate = new Date(ticket.departure_date);
    flightDate.setHours(0, 0, 0, 0);

    if (flightDate < today) {
      return (
        <div
          className="w-3 h-3 rounded-full bg-green-500"
          title="Já voado"
        />
      );
    } else if (flightDate.getTime() === today.getTime()) {
      return (
        <div
          className="w-3 h-3 rounded-full bg-yellow-500"
          title="Voa hoje"
        />
      );
    } else {
      return (
        <div
          className="w-3 h-3 rounded-full bg-blue-500"
          title="Próximo voo"
        />
      );
    }
  };

  const handleDeleteTicket = async () => {
    if (!deletingTicket) return;

    try {
      const { error } = await supabase
        .from("tickets")
        .delete()
        .eq("id", deletingTicket.id);

      if (error) throw error;

      toast({
        title: "Passagem excluída",
        description: "A passagem foi removida com sucesso.",
      });

      fetchTickets();
      setDeletingTicket(null);
    } catch (error: any) {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // 🔗 Helper pra pegar anexos da linha (coluna JSONB "attachments")
  const getAttachments = (ticket: (typeof tickets)[0]): Attachment[] => {
    const raw = (ticket as any).attachments;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw as Attachment[];
    return [];
  };

  // 👀 Abrir primeiro PDF/JPEG anexado ou avisar se não tiver
  const handleOpenAttachment = (ticket: (typeof tickets)[0]) => {
    const attachments = getAttachments(ticket);

    if (!attachments.length) {
      toast({
        title: "Nenhum bilhete anexado",
        description:
          "Anexe o PDF/JPEG do bilhete na tela de registro ou edição da passagem.",
      });
      return;
    }

    const first = attachments[0];
    if (!first.url) {
      toast({
        title: "Arquivo inválido",
        description:
          "O anexo não possui URL pública. Tente reenviar o PDF/JPEG na edição da passagem.",
        variant: "destructive",
      });
      return;
    }

    window.open(first.url, "_blank");
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-12 w-full" />
          <Card className="p-6">
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Passagens</h1>
            <p className="text-muted-foreground">
              {filteredTickets.length} de {tickets.length} passagem(ns)
            </p>
          </div>
          <Button onClick={() => setRegisterDialogOpen(true)}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Registrar Emissão
          </Button>
        </div>

        {/* Painel de Filtros */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-4 w-4" />
            <h3 className="font-semibold">Filtros</h3>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="ml-auto"
              >
                <X className="h-4 w-4 mr-2" />
                Limpar Filtros
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <Label htmlFor="search">Buscar</Label>
              <Input
                id="search"
                placeholder="PNR, bilhete, cliente/passageiro..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="airline">Companhia</Label>
              <Select
                value={selectedAirline}
                onValueChange={setSelectedAirline}
              >
                <SelectTrigger id="airline">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {airlines.map((code) => (
                    <SelectItem key={code} value={code}>
                      {code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={selectedStatus}
                onValueChange={setSelectedStatus}
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="past">🟢 Já voado</SelectItem>
                  <SelectItem value="today">🟡 Voa hoje</SelectItem>
                  <SelectItem value="future">
                    🔵 Próximo voo
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="dateFrom">Data De</Label>
              <Input
                id="dateFrom"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="dateTo">Data Até</Label>
              <Input
                id="dateTo"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>
        </Card>

        <Card>
          {filteredTickets.length === 0 ? (
            <EmptyState
              icon={TicketIcon}
              title={
                tickets.length === 0
                  ? "Nenhuma passagem registrada"
                  : "Nenhuma passagem encontrada"
              }
              description={
                tickets.length === 0
                  ? "Registre a primeira emissão de passagem para começar."
                  : "Ajuste os filtros para ver mais resultados."
              }
              actionLabel={
                tickets.length === 0
                  ? "Registrar Emissão"
                  : undefined
              }
              onAction={
                tickets.length === 0
                  ? () => setRegisterDialogOpen(true)
                  : undefined
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data Emissão</TableHead>
                  <TableHead>Cliente / Passageiro</TableHead>
                  <TableHead>Data do Voo</TableHead>
                  <TableHead>Companhia</TableHead>
                  <TableHead>Localizador</TableHead>
                  <TableHead>Bilhete</TableHead>
                  <TableHead className="text-center">
                    Status
                  </TableHead>
                  <TableHead className="text-right">
                    Ações
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTickets.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {ticket.issued_at || ticket.created_at
                          ? new Date(
                              ticket.issued_at ||
                                ticket.created_at
                            ).toLocaleDateString("pt-BR")
                          : "-"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">
                        {ticket.sales?.customer_name ||
                          ticket.passenger_name ||
                          "-"}
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {ticket.departure_date
                          ? new Date(
                              ticket.departure_date
                            ).toLocaleDateString("pt-BR")
                          : "-"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {ticket.airline ||
                          ticket.sales
                            ?.mileage_accounts
                            ?.airline_companies?.code ||
                          "-"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {ticket.pnr || "-"}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {ticket.ticket_code || "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-center">
                        {getFlightStatusDot(ticket)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {/* 👇 NOVA AÇÃO: VER BILHETE PDF/JPEG */}
                          <DropdownMenuItem
                            onClick={() => handleOpenAttachment(ticket)}
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Ver bilhete (PDF/JPEG)
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={() =>
                              setDetailTicket(ticket)
                            }
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Ver Detalhes
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              setEditingTicket(ticket)
                            }
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() =>
                              setDeletingTicket(ticket)
                            }
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {filteredTickets.length > 0 && (
            <div className="border-t px-6 py-4">
              <p className="text-sm font-medium text-muted-foreground mb-3">
                Legenda de Status:
              </p>
              <div className="flex flex-wrap gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-sm text-muted-foreground">
                    Já voado
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <span className="text-sm text-muted-foreground">
                    Voa hoje
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-sm text-muted-foreground">
                    Próximo voo
                  </span>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>

      <RegisterTicketDialog
        open={registerDialogOpen}
        onOpenChange={setRegisterDialogOpen}
      />

      <EditTicketDialog
        ticket={editingTicket}
        open={!!editingTicket}
        onOpenChange={(open) => !open && setEditingTicket(null)}
        onSuccess={fetchTickets}
      />

      <DeleteTicketDialog
        open={!!deletingTicket}
        onOpenChange={(open) => !open && setDeletingTicket(null)}
        onConfirm={handleDeleteTicket}
        ticketInfo={deletingTicket?.passenger_name || ""}
      />

      <TicketDetailDialog
        ticket={detailTicket}
        open={!!detailTicket}
        onOpenChange={(open) => !open && setDetailTicket(null)}
      />
    </div>
  );
}
