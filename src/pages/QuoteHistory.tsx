import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, DollarSign, FileText, ExternalLink, CheckCircle2, LayoutGrid, List, Edit2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
  const { toast } = useToast();
  const navigate = useNavigate();

  const fetchQuotes = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
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
  }, [filter]);

  const handleEdit = (quoteId: string) => {
    navigate(`/quotes/${quoteId}`);
  };

  const handleConvert = (quoteId: string) => {
    // Navigate to new sale wizard with quote data pre-filled
    navigate(`/sales/new?quoteId=${quoteId}`);
  };

  const getStatusBadge = (quote: Quote) => {
    if (quote.converted_to_sale_id) {
      return <Badge variant="default" className="gap-1"><CheckCircle2 className="h-3 w-3" />Convertido</Badge>;
    }
    if (quote.status === "sent") {
      return <Badge variant="secondary">Enviado</Badge>;
    }
    return <Badge variant="outline">Pendente</Badge>;
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Histórico de Orçamentos</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie seus orçamentos e converta em vendas
          </p>
        </div>
        <Button onClick={() => navigate("/calculator")}>
          Novo Orçamento
        </Button>
      </div>

      <div className="flex items-center justify-between">
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

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-32 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : quotes.length === 0 ? (
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
              {quotes.map((quote) => (
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
                      ? new Date(quote.departure_date).toLocaleDateString("pt-BR")
                      : "-"}
                  </TableCell>
                  <TableCell className="font-semibold text-primary">
                    R$ {quote.total_price.toFixed(2)}
                  </TableCell>
                  <TableCell>{getStatusBadge(quote)}</TableCell>
                  <TableCell>
                    {quote.attachments && Array.isArray(quote.attachments) && quote.attachments.length > 0 ? (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <ExternalLink className="h-3 w-3" />
                        {quote.attachments.length}
                      </div>
                    ) : "-"}
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
                          onClick={() => navigate(`/sales/${quote.converted_to_sale_id}`)}
                        >
                          Ver Venda
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {quotes.map((quote) => (
            <Card key={quote.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">{quote.client_name}</h3>
                    {quote.client_phone && (
                      <p className="text-sm text-muted-foreground">{quote.client_phone}</p>
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
                      <span>{new Date(quote.departure_date).toLocaleDateString("pt-BR")}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <DollarSign className="h-4 w-4 text-primary" />
                    <span className="text-primary">R$ {quote.total_price.toFixed(2)}</span>
                  </div>
                </div>

                {quote.attachments && Array.isArray(quote.attachments) && quote.attachments.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <ExternalLink className="h-4 w-4" />
                    <span>{quote.attachments.length} anexo(s)</span>
                  </div>
                )}

                <div className="pt-2 border-t space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Criado em {new Date(quote.created_at).toLocaleDateString("pt-BR")}
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
                        onClick={() => navigate(`/sales/${quote.converted_to_sale_id}`)}
                      >
                        Ver Venda
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default QuoteHistory;
