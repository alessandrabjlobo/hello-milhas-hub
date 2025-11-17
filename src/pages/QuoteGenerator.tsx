import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ProfitCalculator } from "@/components/calculator/ProfitCalculator";
import { QuoteGenerator as QuoteGeneratorComponent } from "@/components/calculator/QuoteGenerator";

export default function QuoteGenerator() {
  const navigate = useNavigate();
  const [notes, setNotes] = useState("");

  return (
    <div className="container max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
      <div>
        <h1 className="text-3xl font-bold">Gerador de Orçamentos</h1>
        <p className="text-muted-foreground">
          Crie orçamentos profissionais e envie por WhatsApp
        </p>
      </div>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1.2fr] gap-6">
      {/* COLUNA ESQUERDA - Calculadora + Caderno */}
      <div className="space-y-4">
        {/* Calculadora (MESMO componente da página /calculator) */}
        <ProfitCalculator />

        {/* Caderno do Orçamento */}
        <Card>
          <CardHeader>
            <CardTitle>Caderno do Orçamento</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Cole aqui os prints, tabelas, comparativos e anotações deste orçamento..."
              rows={8}
            />
          </CardContent>
        </Card>
      </div>

      {/* COLUNA DIREITA - Formulário de Orçamento EXISTENTE */}
      <div>
        <QuoteGeneratorComponent />
      </div>
    </div>
  </div>
  );
}
