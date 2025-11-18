import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  MapPin,
  DollarSign,
  FileText,
  ExternalLink,
  CheckCircle2,
  LayoutGrid,
  List,
  Edit2,
  Trash2,
  Filter,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Quote {
  id: string;
  client_name: string;
  client_phone?: string;
  route?: string;
  total_price: number;
  status: string;
  created_at: string;
  departure_date?: string;
  miles_needed: number;
  attachments: any;
  converted_to_sale_id?: string;
  converted_at?: string;
}

const QuoteHistory = () => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "converted">("all");
  const [viewMode, setViewMode] = useState<"cards" | "list">("list");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [quoteToDelete, setQuoteToDelete] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  // 🔎 Filtros adicionais (layout igual ao /tickets)
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortField, setSortField] = useState<"created_at" | "client_name" | "total_price">(
    "created_at"
  );
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const fetchQuotes = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      let query = supabase
        .from("quotes")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (filter === "pending") {
        query = query.is("converted_to_sale_id", null);
      } else if (filter === "converted") {
        query = query.not("converted_to_sale_id", "is", null);
      }

      const { data, error } = await query;

      if (error) throw error;
      setQuotes(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar orçamentos",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const handleEdit = (quoteId: string) => {
    navigate(`/quotes/${quoteId}`);
  };

  const handleConvert = (quoteId: string) => {
    // Navigate to new sale wizard with quote data pre-filled
    navigate(`/sales/new?quoteId=${quoteId}`);
  };

  const handleDeleteClick = (quoteId: string) => {
    setQuoteToDelete(quoteId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!quoteToDelete) return;

    try {
      const { error } = await supabase.from("quotes").delete().eq("id", quoteToDelete);

      if (error) throw error;

      toast({
        title: "Orçamento excluído",
        description: "O orçamento foi removido com sucesso",
      });

      // Atualizar lista
      setQuotes((prev) => prev.filter((q) => q.id !== quoteToDelete));
    } catch (error: any) {
      toast({
        title: "Erro ao excluir orçamento",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setQuoteToDelete(null);
    }
  };

  const getStatusBadge = (quote: Quote) => {
    if (quote.converted_to_sale_id) {
      return (
        <Badge variant="default" className="gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Convertido
        </Badge>
      );
    }
    if (quote.status === "sent") {
      return <Badge variant="secondary">Enviado</Badge>;
    }
    return <Badge variant="outline">Pendente</Badge>;
  };

  // 🧮 Função auxiliar para extrair apenas YYYY-MM-DD (sem timezone)
  const getDateOnly = (isoString: string): string => {
    return isoString.split('T')[0];
  };

  // 🧮 Sempre usar DATA DE CRIAÇÃO para filtros e ordenação (como string)
  const getQuoteDate = (quote: Quote): string => {
    return getDateOnly(quote.created_at);
  };


  // 🔎 + 🔃 Aplicar filtros e ordenação
  const filteredQuotes = useMemo(() => {
    let result = [...quotes];

    const search = searchTerm.trim().toLowerCase();

    if (search) {
      result = result.filter((q) => {
        const name = (q.client_name || "").toLowerCase();
        const phone = (q.client_phone || "").toLowerCase();
        const route = (q.route || "").toLowerCase();
        return (
          name.includes(search) ||
          phone.includes(search) ||
          route.includes(search)
        );
      });
    }

    if (dateFrom) {
      result = result.filter((q) => {
        const quoteDate = getQuoteDate(q); // "2025-11-18"
        return quoteDate >= dateFrom; // comparação de strings YYYY-MM-DD
      });
    }

    if (dateTo) {
      result = result.filter((q) => {
        const quoteDate = getQuoteDate(q);
        return quoteDate <= dateTo; // comparação de strings YYYY-MM-DD
      });
    }

    // Ordenação
    result.sort((a, b) => {
      let aVal: string | number = "";
      let bVal: string | number = "";

      if (sortField === "created_at") {
        aVal = getQuoteDate(a); // string YYYY-MM-DD
        bVal = getQuoteDate(b); // string YYYY-MM-DD
      } else if (sortField === "client_name") {
        aVal = (a.client_name || "").toLowerCase();
        bVal = (b.client_name || "").toLowerCase();
      } else if (sortField === "total_price") {
        aVal = Number(a.total_price) || 0;
        bVal = Number(b.total_price) || 0;
      }

      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDirection === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      const diff = (aVal as number) - (bVal as number);
      return sortDirection === "asc" ? diff : -diff;
    });

    return result;
  }, [quotes, searchTerm, dateFrom, dateTo, sortField, sortDirection]);

  const clearFilters = () => {
    setSearchTerm("");
    setDateFrom("");
    setDateTo("");
    setSortField("created_at");
    setSortDirection("desc");
  };

  const hasActiveFilters =
    !!searchTerm ||
    !!dateFrom ||
    !!dateTo ||
    sortField !== "created_at" ||
    sortDirection !== "desc";

  if (loading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Histórico de Orçamentos</h1>
            <p className="text-muted-foreground mt-1">
              Gerencie seus orçamentos e converta em vendas
            </p>
          </div>
          <Button onClick={() => navigate("/calculator")}>Novo Orçamento</Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-32 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Histórico de Orçamentos</h1>
          <p className="text-muted-foreground mt-1">
            {filteredQuotes.length} de {quotes.length} orçamento(s)
          </p>
        </div>
        <Button onClick={() => navigate("/calculator")}>Novo Orçamento</Button>
      </div>

      <div className="flex items-center justify-between">
        {/* Filtro por status (igual você já tinha) */}
        <div className="flex gap-2">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            onClick={() => setFilter("all")}
          >
            Todos
          </Button>
          <Button
            variant={filter === "pending" ? "default" : "outline"}
            onClick={() => setFilter("pending")}
          >
            Pendentes
          </Button>
          <Button
            variant={filter === "converted" ? "default" : "outline"}
            onClick={() => setFilter("converted")}
          >
            Convertidos
          </Button>
        </div>

        <div className="flex gap-2">
          <Button
            variant={viewMode === "cards" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("cards")}
          >
            <LayoutGrid className="h-4 w-4 mr-2" />
            Cards
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("list")}
          >
            <List className="h-4 w-4 mr-2" />
            Lista
          </Button>
        </div>
      </div>

      {quotes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              Nenhum orçamento encontrado.
              <br />
              Crie seu primeiro orçamento na calculadora.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* 🔶 Painel de filtros (layout inspirado em /tickets) */}
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
                  placeholder="Cliente, telefone, rota..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
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
              <div>
                <Label htmlFor="sortField">Ordenar por</Label>
                <Select
                  value={sortField}
                  onValueChange={(value: "created_at" | "client_name" | "total_price") =>
                    setSortField(value)
                  }
                >
                  <SelectTrigger id="sortField">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="created_at">Data</SelectItem>
                    <SelectItem value="client_name">Cliente</SelectItem>
                    <SelectItem value="total_price">Valor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="sortDirection">Direção</Label>
                <Select
                  value={sortDirection}
                  onValueChange={(value: "asc" | "desc") =>
                    setSortDirection(value)
                  }
                >
                  <SelectTrigger id="sortDirection">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">Decrescente</SelectItem>
                    <SelectItem value="asc">Crescente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          {filteredQuotes.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center">
                  Nenhum orçamento encontrado com os filtros atuais.
                  <br />
                  Ajuste os filtros para ver mais resultados.
                </p>
              </CardContent>
            </Card>
          ) : viewMode === "list" ? (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Rota</TableHead>
                    <TableHead>Data Viagem</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Anexos</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredQuotes.map((quote) => (
                    <TableRow key={quote.id}>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(quote.created_at).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{quote.client_name}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {quote.client_phone || "-"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {quote.route || "-"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {quote.departure_date
                          ? new Date(
                              quote.departure_date
                            ).toLocaleDateString("pt-BR")
                          : "-"}
                      </TableCell>
                      <TableCell className="font-semibold text-primary">
                        R$ {quote.total_price.toFixed(2)}
                      </TableCell>
                      <TableCell>{getStatusBadge(quote)}</TableCell>
                      <TableCell>
                        {quote.attachments &&
                        Array.isArray(quote.attachments) &&
                        quote.attachments.length > 0 ? (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <ExternalLink className="h-3 w-3" />
                            {quote.attachments.length}
                          </div>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(quote.id)}
                          >
                            <Edit2 className="h-3 w-3 mr-1" />
                            Editar
                          </Button>
                          {!quote.converted_to_sale_id ? (
                            <Button
                              size="sm"
                              onClick={() => handleConvert(quote.id)}
                            >
                              Converter
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                navigate(`/sales/${quote.converted_to_sale_id}`)
                              }
                            >
                              Ver Venda
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteClick(quote.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredQuotes.map((quote) => (
                <Card
                  key={quote.id}
                  className="hover:shadow-lg transition-shadow"
                >
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">
                          {quote.client_name}
                        </h3>
                        {quote.client_phone && (
                          <p className="text-sm text-muted-foreground">
                            {quote.client_phone}
                          </p>
                        )}
                      </div>
                      {getStatusBadge(quote)}
                    </div>

                    <div className="space-y-2">
                      {quote.route && (
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span>{quote.route}</span>
                        </div>
                      )}
                      {quote.departure_date && (
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>
                            {new Date(
                              quote.departure_date
                            ).toLocaleDateString("pt-BR")}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <DollarSign className="h-4 w-4 text-primary" />
                        <span className="text-primary">
                          R$ {quote.total_price.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {quote.attachments &&
                      Array.isArray(quote.attachments) &&
                      quote.attachments.length > 0 && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <ExternalLink className="h-4 w-4" />
                          <span>{quote.attachments.length} anexo(s)</span>
                        </div>
                      )}

                    <div className="pt-2 border-t space-y-2">
                      <p className="text-xs text-muted-foreground">
                        Criado em{" "}
                        {new Date(quote.created_at).toLocaleDateString("pt-BR")}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(quote.id)}
                          className="flex-1"
                        >
                          <Edit2 className="h-3 w-3 mr-1" />
                          Editar
                        </Button>
                        {!quote.converted_to_sale_id ? (
                          <Button
                            className="flex-1"
                            size="sm"
                            onClick={() => handleConvert(quote.id)}
                          >
                            Converter
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            className="flex-1"
                            size="sm"
                            onClick={() =>
                              navigate(`/sales/${quote.converted_to_sale_id}`)
                            }
                          >
                            Ver Venda
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteClick(quote.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este orçamento? Esta ação não pode
              ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default QuoteHistory;
