import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfitCalculator } from "@/components/calculator/ProfitCalculator";
import { MarginCalculator } from "@/components/calculator/MarginCalculator";
import { DollarSign, Calculator as CalculatorIcon } from "lucide-react";

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
            Calcule lucros e margens das suas vendas
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 bg-gradient-to-r from-muted to-muted/50">
          <TabsTrigger 
            value="profit"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-primary-foreground"
          >
            Calculadora de Lucro
          </TabsTrigger>
          <TabsTrigger 
            value="margin"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-primary-foreground"
          >
            Análise de Margem
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profit" className="space-y-4">
          <Card className="shadow-lg border-primary/20">
            <CardHeader className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b">
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 bg-gradient-to-br from-primary to-primary/80 rounded-lg shadow-md">
                  <DollarSign className="h-5 w-5 text-primary-foreground" />
                </div>
                Calculadora de Lucro
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <ProfitCalculator />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="margin" className="space-y-4">
          <Card className="shadow-lg border-primary/20">
            <CardHeader className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b">
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 bg-gradient-to-br from-primary to-primary/80 rounded-lg shadow-md">
                  <CalculatorIcon className="h-5 w-5 text-primary-foreground" />
                </div>
                Análise de Margem
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <MarginCalculator costPerMile={0.029} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
