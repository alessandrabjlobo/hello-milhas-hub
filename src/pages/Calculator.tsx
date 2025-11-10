import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfitCalculator } from "@/components/calculator/ProfitCalculator";
import { QuoteGenerator } from "@/components/calculator/QuoteGenerator";
import { MarginCalculator } from "@/components/calculator/MarginCalculator";

export default function Calculator() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("profit");

  return (
    <div className="container max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Calculadora de Milhas</h1>
          <p className="text-muted-foreground">
            Ferramentas para calcular margens, lucros e gerar orçamentos
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profit">Calculadora de Lucro</TabsTrigger>
          <TabsTrigger value="margin">Análise de Margem</TabsTrigger>
          <TabsTrigger value="quote">Gerador de Orçamento</TabsTrigger>
        </TabsList>

        <TabsContent value="profit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Calculadora de Lucro</CardTitle>
            </CardHeader>
            <CardContent>
              <ProfitCalculator />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="margin" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Análise de Margem</CardTitle>
            </CardHeader>
            <CardContent>
              <MarginCalculator costPerMile={0.029} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quote" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Gerador de Orçamento</CardTitle>
            </CardHeader>
            <CardContent>
              <QuoteGenerator />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
