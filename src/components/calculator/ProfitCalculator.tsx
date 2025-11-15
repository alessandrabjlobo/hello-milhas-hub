import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Calculator, TrendingUp, AlertCircle, Info, ChevronDown, ChevronUp } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

type MileageAccount = {
  id: string;
  account_number: string;
  balance: number;
  cost_per_mile: number;
  airline_companies: {
    name: string;
  };
};

// Formatação de números
const formatNumber = (value: string): string => {
  const numbers = value.replace(/\D/g, '');
  return numbers.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

const parseFormattedNumber = (value: string): number => {
  return parseFloat(value.replace(/\./g, '')) || 0;
};

const formatCurrency = (value: number): string => {
  return value.toLocaleString('pt-BR', { 
    minimumFractionDigits: 2,
    maximumFractionDigits: 2 
  });
};

interface ProfitCalculatorProps {
  embedded?: boolean;
  initialMiles?: number;
  initialBoardingFee?: number;
  initialPassengers?: number;
  initialCostPerMile?: number;
  onPriceCalculated?: (price: number) => void;
}

export function ProfitCalculator({
  embedded = false,
  initialMiles,
  initialBoardingFee,
  initialPassengers,
  initialCostPerMile,
  onPriceCalculated,
}: ProfitCalculatorProps = {}) {
  const [milesUsed, setMilesUsed] = useState(initialMiles?.toString() || "50000");
  const [costPerMile, setCostPerMile] = useState(initialCostPerMile?.toString() || "29.00");
  const [boardingFee, setBoardingFee] = useState(initialBoardingFee?.toString() || "35.00");
  const [passengers, setPassengers] = useState(initialPassengers?.toString() || "2");
  const [targetMargin, setTargetMargin] = useState("20");
  const [manualPrice, setManualPrice] = useState("");
  const [accounts, setAccounts] = useState<MileageAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [activeTab, setActiveTab] = useState("manual");
  const [showScenarios, setShowScenarios] = useState(false);

  // Cálculos
  const milesNum = parseFormattedNumber(milesUsed);
  const costPerMileNum = parseFloat(costPerMile) || 0;
  const boardingFeeNum = parseFloat(boardingFee) || 0;
  const passengersNum = parseInt(passengers) || 1;
  const targetMarginNum = parseFloat(targetMargin) || 0;
  const manualPriceNum = parseFloat(manualPrice) || 0;

  const costPerPassenger = (milesNum / 1000) * costPerMileNum + boardingFeeNum;
  const totalCost = costPerPassenger * passengersNum;
  const suggestedPrice = targetMarginNum > 0 && targetMarginNum < 100 
    ? totalCost / (1 - targetMarginNum / 100) 
    : totalCost;
  
  const price = manualPriceNum > 0 ? manualPriceNum : suggestedPrice;
  const profit = price - totalCost;
  const profitMargin = price > 0 ? (profit / price) * 100 : 0;
  const effectiveCostPerMile = milesNum > 0 ? totalCost / milesNum : 0;
  const pricePerThousand = milesNum > 0 ? (price / milesNum) * 1000 : 0;

  useEffect(() => {
    if (!embedded) {
      loadAccounts();
    }
  }, [embedded]);

  // Atualizar quando props mudarem
  useEffect(() => {
    if (initialMiles !== undefined) setMilesUsed(initialMiles.toString());
  }, [initialMiles]);

  useEffect(() => {
    if (initialBoardingFee !== undefined) setBoardingFee(initialBoardingFee.toString());
  }, [initialBoardingFee]);

  useEffect(() => {
    if (initialPassengers !== undefined) setPassengers(initialPassengers.toString());
  }, [initialPassengers]);

  useEffect(() => {
    if (initialCostPerMile !== undefined) setCostPerMile(initialCostPerMile.toString());
  }, [initialCostPerMile]);

  // Notificar mudança de preço sugerido
  useEffect(() => {
    if (onPriceCalculated && suggestedPrice > 0) {
      onPriceCalculated(suggestedPrice);
    }
  }, [suggestedPrice, onPriceCalculated]);

  const loadAccounts = async () => {
    const { data } = await supabase
      .from("mileage_accounts")
      .select(`
        *,
        airline_companies (name)
      `)
      .eq("status", "active");
    
    if (data) {
      setAccounts(data as any);
    }
  };

  useEffect(() => {
    if (selectedAccount) {
      const account = accounts.find(a => a.id === selectedAccount);
      if (account) {
        setCostPerMile(account.cost_per_mile.toString());
      }
    }
  }, [selectedAccount, accounts]);

  // Cenários de margem
  const scenarios = [
    { margin: 0, price: totalCost },
    { margin: 15, price: totalCost / 0.85 },
    { margin: 20, price: totalCost / 0.80 },
    { margin: 25, price: totalCost / 0.75 },
    { margin: 30, price: totalCost / 0.70 },
  ];

  const selectedAccountData = accounts.find(a => a.id === selectedAccount);
  const insufficientBalance = selectedAccountData && milesNum > selectedAccountData.balance;

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Calculator className="h-5 w-5" />
          Calculadora Inteligente de Milhas
        </CardTitle>
        <CardDescription>
          Preencha os campos e veja os resultados instantaneamente
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual">Cálculo Manual</TabsTrigger>
            <TabsTrigger value="account">Por Conta</TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="space-y-4">
            <div>
              <h3 className="text-sm font-medium mb-3">DADOS DE ENTRADA</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="miles" className="text-xs">Milhas *</Label>
                  <Input
                    id="miles"
                    type="text"
                    value={formatNumber(milesUsed)}
                    onChange={(e) => setMilesUsed(e.target.value.replace(/\./g, '').replace(/\D/g, ''))}
                    placeholder="50.000"
                    className="h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="cost" className="text-xs">Custo/milheiro (R$) *</Label>
                  <Input
                    id="cost"
                    type="number"
                    step="0.01"
                    value={costPerMile}
                    onChange={(e) => setCostPerMile(e.target.value)}
                    placeholder="29.00"
                    className="h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="boarding" className="text-xs">Taxa/pax (R$)</Label>
                  <Input
                    id="boarding"
                    type="number"
                    step="0.01"
                    value={boardingFee}
                    onChange={(e) => setBoardingFee(e.target.value)}
                    placeholder="35.00"
                    className="h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="passengers" className="text-xs">Passageiros *</Label>
                  <Input
                    id="passengers"
                    type="number"
                    value={passengers}
                    onChange={(e) => setPassengers(e.target.value)}
                    placeholder="2"
                    className="h-9"
                  />
                </div>
              </div>
              
              <div className="mt-3 space-y-1.5">
                <Label htmlFor="target-margin" className="text-xs">🎯 Margem Alvo (%)</Label>
                <Input
                  id="target-margin"
                  type="number"
                  step="1"
                  value={targetMargin}
                  onChange={(e) => setTargetMargin(e.target.value)}
                  placeholder="20"
                  className="h-9 max-w-[200px]"
                />
              </div>
            </div>

            {(milesNum > 0 && costPerMileNum > 0) && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium mb-3">VALORES</h3>
                  <div className="grid md:grid-cols-2 gap-3">
                    <Card className="bg-primary/5 border-primary/20">
                      <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground mb-1">💡 VALOR SUGERIDO</p>
                        <p className="text-2xl font-bold text-primary">
                          R$ {formatCurrency(suggestedPrice)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Para margem de {targetMargin}%
                        </p>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-4">
                        <Label htmlFor="manual-price" className="text-xs">✏️ SEU PREÇO</Label>
                        <Input
                          id="manual-price"
                          type="number"
                          step="0.01"
                          value={manualPrice}
                          onChange={(e) => setManualPrice(e.target.value)}
                          placeholder={`R$ ${formatCurrency(suggestedPrice)}`}
                          className="h-9 mt-1.5 mb-2"
                        />
                        {manualPriceNum > 0 && (
                          <div className="text-sm space-y-0.5">
                            <p className="flex justify-between">
                              <span className="text-muted-foreground">→ Lucro:</span>
                              <span className="font-semibold text-green-600">R$ {formatCurrency(profit)}</span>
                            </p>
                            <p className="flex justify-between">
                              <span className="text-muted-foreground">→ Margem:</span>
                              <span className="font-semibold">
                                {profitMargin.toFixed(1)}%
                                {profitMargin >= 20 && <span className="ml-1">🎯</span>}
                                {profitMargin >= 10 && profitMargin < 20 && <span className="ml-1">⚠️</span>}
                                {profitMargin < 10 && <span className="ml-1">❌</span>}
                              </span>
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium">RESULTADO</h3>
                    <HoverCard>
                      <HoverCardTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 text-xs">
                          <Info className="h-3 w-3 mr-1" />
                          Ver cálculo
                        </Button>
                      </HoverCardTrigger>
                      <HoverCardContent className="w-80">
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Milhas:</span>
                            <span className="font-medium">{formatNumber(milesUsed)} → {(milesNum / 1000).toFixed(1)} milheiros</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Custo do Milheiro:</span>
                            <span className="font-medium">R$ {costPerMileNum.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Taxa de embarque:</span>
                            <span className="font-medium">R$ {boardingFeeNum.toFixed(2)} × {passengersNum} pax</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Subtotal/passageiro:</span>
                            <span className="font-medium">R$ {formatCurrency(costPerPassenger)}</span>
                          </div>
                          <div className="flex justify-between pt-2 border-t">
                            <span className="font-semibold">Custo Total:</span>
                            <span className="font-bold">R$ {formatCurrency(totalCost)}</span>
                          </div>
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-2">
                    <Card className="p-3">
                      <p className="text-xs text-muted-foreground mb-1">Custo Total</p>
                      <p className="text-lg font-bold">R$ {formatCurrency(totalCost)}</p>
                    </Card>
                    
                    <Card className="p-3">
                      <p className="text-xs text-muted-foreground mb-1">Lucro</p>
                      <p className="text-lg font-bold text-green-600">R$ {formatCurrency(profit)}</p>
                    </Card>
                    
                    <Card className="p-3">
                      <p className="text-xs text-muted-foreground mb-1">Margem</p>
                      <p className="text-lg font-bold flex items-center gap-1">
                        {profitMargin.toFixed(1)}%
                        {profitMargin >= 20 && <span className="text-sm">✅</span>}
                        {profitMargin >= 10 && profitMargin < 20 && <span className="text-sm">⚠️</span>}
                        {profitMargin < 10 && <span className="text-sm">❌</span>}
                      </p>
                    </Card>
                    
                    <Card className="p-3">
                      <p className="text-xs text-muted-foreground mb-1">R$/milheiro</p>
                      <p className="text-lg font-bold">R$ {pricePerThousand.toFixed(2)}</p>
                    </Card>
                  </div>
                </div>

                <Collapsible open={showScenarios} onOpenChange={setShowScenarios}>
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" className="w-full h-9" size="sm">
                      {showScenarios ? (
                        <>
                          <ChevronUp className="h-4 w-4 mr-2" />
                          Ocultar Cenários de Margem
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-4 w-4 mr-2" />
                          Ver Cenários de Margem
                        </>
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-3">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <TrendingUp className="h-4 w-4" />
                          🎯 Cenários de Margem
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {scenarios.map((scenario) => {
                          const isTarget = scenario.margin === targetMarginNum;
                          return (
                            <div
                              key={scenario.margin}
                              className={`flex items-center justify-between p-2.5 rounded-md border text-sm ${
                                isTarget ? 'bg-primary/10 border-primary' : 'bg-muted/30'
                              }`}
                            >
                              <span className="font-medium">
                                {scenario.margin}% {isTarget && <span className="text-primary">⭐</span>}
                              </span>
                              <div className="text-right">
                                <div className="font-bold">R$ {formatCurrency(scenario.price)}</div>
                                <div className="text-xs text-muted-foreground">
                                  +R$ {formatCurrency(scenario.price - totalCost)}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </CardContent>
                    </Card>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            )}
          </TabsContent>

          <TabsContent value="account" className="space-y-4">
            <div>
              <h3 className="text-sm font-medium mb-3">SELECIONAR CONTA</h3>
              <div className="space-y-2">
                <Label htmlFor="account-select" className="text-xs">Conta *</Label>
                <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                  <SelectTrigger id="account-select" className="h-9">
                    <SelectValue placeholder="Escolha uma conta de milhagem" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.airline_companies.name} - {formatNumber(account.balance.toString())} milhas - 
                        R$ {(account.cost_per_mile * 1000).toFixed(2)}/milheiro
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <h3 className="text-sm font-medium mb-3 mt-4">DADOS DE ENTRADA</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="miles-account" className="text-xs">Milhas *</Label>
                  <Input
                    id="miles-account"
                    type="text"
                    value={formatNumber(milesUsed)}
                    onChange={(e) => setMilesUsed(e.target.value.replace(/\./g, '').replace(/\D/g, ''))}
                    placeholder="50.000"
                    className="h-9"
                  />
                  {insufficientBalance && (
                    <Badge variant="destructive" className="text-xs">
                      Saldo insuficiente
                    </Badge>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="boarding-account" className="text-xs">Taxa/pax (R$)</Label>
                  <Input
                    id="boarding-account"
                    type="number"
                    step="0.01"
                    value={boardingFee}
                    onChange={(e) => setBoardingFee(e.target.value)}
                    placeholder="35.00"
                    className="h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="passengers-account" className="text-xs">Passageiros *</Label>
                  <Input
                    id="passengers-account"
                    type="number"
                    value={passengers}
                    onChange={(e) => setPassengers(e.target.value)}
                    placeholder="2"
                    className="h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="target-margin-account" className="text-xs">🎯 Margem (%)</Label>
                  <Input
                    id="target-margin-account"
                    type="number"
                    step="1"
                    value={targetMargin}
                    onChange={(e) => setTargetMargin(e.target.value)}
                    placeholder="20"
                    className="h-9"
                  />
                </div>
              </div>
            </div>

            {(milesNum > 0 && costPerMileNum > 0) && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium mb-3">VALORES</h3>
                  <div className="grid md:grid-cols-2 gap-3">
                    <Card className="bg-primary/5 border-primary/20">
                      <CardContent className="p-4">
                        <p className="text-xs text-muted-foreground mb-1">💡 VALOR SUGERIDO</p>
                        <p className="text-2xl font-bold text-primary">
                          R$ {formatCurrency(suggestedPrice)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Para margem de {targetMargin}%
                        </p>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-4">
                        <Label htmlFor="manual-price-account" className="text-xs">✏️ SEU PREÇO</Label>
                        <Input
                          id="manual-price-account"
                          type="number"
                          step="0.01"
                          value={manualPrice}
                          onChange={(e) => setManualPrice(e.target.value)}
                          placeholder={`R$ ${formatCurrency(suggestedPrice)}`}
                          className="h-9 mt-1.5 mb-2"
                        />
                        {manualPriceNum > 0 && (
                          <div className="text-sm space-y-0.5">
                            <p className="flex justify-between">
                              <span className="text-muted-foreground">→ Lucro:</span>
                              <span className="font-semibold text-green-600">R$ {formatCurrency(profit)}</span>
                            </p>
                            <p className="flex justify-between">
                              <span className="text-muted-foreground">→ Margem:</span>
                              <span className="font-semibold">
                                {profitMargin.toFixed(1)}%
                                {profitMargin >= 20 && <span className="ml-1">🎯</span>}
                                {profitMargin >= 10 && profitMargin < 20 && <span className="ml-1">⚠️</span>}
                                {profitMargin < 10 && <span className="ml-1">❌</span>}
                              </span>
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium">RESULTADO</h3>
                    <HoverCard>
                      <HoverCardTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 text-xs">
                          <Info className="h-3 w-3 mr-1" />
                          Ver cálculo
                        </Button>
                      </HoverCardTrigger>
                      <HoverCardContent className="w-80">
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Milhas:</span>
                            <span className="font-medium">{formatNumber(milesUsed)} → {(milesNum / 1000).toFixed(1)} milheiros</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Custo do Milheiro:</span>
                            <span className="font-medium">R$ {costPerMileNum.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Taxa de embarque:</span>
                            <span className="font-medium">R$ {boardingFeeNum.toFixed(2)} × {passengersNum} pax</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Subtotal/passageiro:</span>
                            <span className="font-medium">R$ {formatCurrency(costPerPassenger)}</span>
                          </div>
                          <div className="flex justify-between pt-2 border-t">
                            <span className="font-semibold">Custo Total:</span>
                            <span className="font-bold">R$ {formatCurrency(totalCost)}</span>
                          </div>
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-2">
                    <Card className="p-3">
                      <p className="text-xs text-muted-foreground mb-1">Custo Total</p>
                      <p className="text-lg font-bold">R$ {formatCurrency(totalCost)}</p>
                    </Card>
                    
                    <Card className="p-3">
                      <p className="text-xs text-muted-foreground mb-1">Lucro</p>
                      <p className="text-lg font-bold text-green-600">R$ {formatCurrency(profit)}</p>
                    </Card>
                    
                    <Card className="p-3">
                      <p className="text-xs text-muted-foreground mb-1">Margem</p>
                      <p className="text-lg font-bold flex items-center gap-1">
                        {profitMargin.toFixed(1)}%
                        {profitMargin >= 20 && <span className="text-sm">✅</span>}
                        {profitMargin >= 10 && profitMargin < 20 && <span className="text-sm">⚠️</span>}
                        {profitMargin < 10 && <span className="text-sm">❌</span>}
                      </p>
                    </Card>
                    
                    <Card className="p-3">
                      <p className="text-xs text-muted-foreground mb-1">R$/mil</p>
                      <p className="text-lg font-bold">R$ {pricePerThousand.toFixed(2)}</p>
                    </Card>
                  </div>
                </div>

                <Collapsible open={showScenarios} onOpenChange={setShowScenarios}>
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" className="w-full h-9" size="sm">
                      {showScenarios ? (
                        <>
                          <ChevronUp className="h-4 w-4 mr-2" />
                          Ocultar Cenários de Margem
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-4 w-4 mr-2" />
                          Ver Cenários de Margem
                        </>
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-3">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <TrendingUp className="h-4 w-4" />
                          🎯 Cenários de Margem
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {scenarios.map((scenario) => {
                          const isTarget = scenario.margin === targetMarginNum;
                          return (
                            <div
                              key={scenario.margin}
                              className={`flex items-center justify-between p-2.5 rounded-md border text-sm ${
                                isTarget ? 'bg-primary/10 border-primary' : 'bg-muted/30'
                              }`}
                            >
                              <span className="font-medium">
                                {scenario.margin}% {isTarget && <span className="text-primary">⭐</span>}
                              </span>
                              <div className="text-right">
                                <div className="font-bold">R$ {formatCurrency(scenario.price)}</div>
                                <div className="text-xs text-muted-foreground">
                                  +R$ {formatCurrency(scenario.price - totalCost)}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </CardContent>
                    </Card>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            )}
            </TabsContent>
          </Tabs>
      </CardContent>
    </Card>
  );
}
