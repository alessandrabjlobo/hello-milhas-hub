import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calculator, TrendingUp, DollarSign, Plane, Users, Percent } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type MileageAccount = {
  id: string;
  account_number: string;
  balance: number;
  cost_per_mile: number;
  airline_companies: {
    name: string;
  };
};

export function ProfitCalculator() {
  const [milesUsed, setMilesUsed] = useState("");
  const [costPerMile, setCostPerMile] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [boardingFee, setBoardingFee] = useState("");
  const [passengers, setPassengers] = useState("1");
  const [pricePerPassenger, setPricePerPassenger] = useState("");
  const [pricingMode, setPricingMode] = useState<"total" | "per_passenger">("total");
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [accounts, setAccounts] = useState<MileageAccount[]>([]);
  const [targetMargin, setTargetMargin] = useState("20");
  const [useManualPrice, setUseManualPrice] = useState(false);

  useEffect(() => {
    loadAccounts();
  }, []);

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

  const miles = parseFloat(milesUsed) || 0;
  const costPerThousand = parseFloat(costPerMile) || 0;
  const boardingFeeNum = parseFloat(boardingFee) || 0;
  const passengersNum = parseInt(passengers) || 1;
  const pricePerPass = parseFloat(pricePerPassenger) || 0;
  const targetMarginNum = parseFloat(targetMargin) || 0;

  // Cálculo: ((milhas/1000) * custo do milheiro + taxa de embarque) * passageiros
  const costPerPassenger = (miles / 1000) * costPerThousand + boardingFeeNum;
  const totalCost = costPerPassenger * passengersNum;

  // Cálculo automático do preço sugerido baseado na margem alvo
  const suggestedPrice = totalCost > 0 && targetMarginNum > 0 && targetMarginNum < 100
    ? totalCost / (1 - targetMarginNum / 100)
    : totalCost * 1.2; // fallback 20%

  // Preço usado nos cálculos (sugerido ou manual)
  const price = useManualPrice 
    ? (pricingMode === "per_passenger" ? pricePerPass * passengersNum : parseFloat(salePrice) || 0)
    : suggestedPrice;

  const profit = price - totalCost;
  const profitMargin = price > 0 ? (profit / price) * 100 : 0;
  const effectiveCostPerMile = miles > 0 ? totalCost / miles : 0;
  const pricePerThousand = miles > 0 ? (price / (miles / 1000)) : 0;

  // Cenários de margem
  const scenarios = [
    { margin: 0, label: "Break-even (0%)", price: totalCost },
    { margin: 15, label: "Margem 15%", price: totalCost / 0.85 },
    { margin: 20, label: "Margem 20%", price: totalCost / 0.80 },
    { margin: 25, label: "Margem 25%", price: totalCost / 0.75 },
    { margin: 30, label: "Margem 30%", price: totalCost / 0.70 },
  ];

  const selectedAccountData = accounts.find(a => a.id === selectedAccount);
  const insufficientBalance = selectedAccountData && miles > selectedAccountData.balance;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          <CardTitle>Calculadora Inteligente de Milhas</CardTitle>
        </div>
        <CardDescription>
          Calcule automaticamente o preço ideal com base na margem desejada
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="manual" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual">Cálculo Manual</TabsTrigger>
            <TabsTrigger value="account">Por Conta</TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="manual-miles">Milhas Utilizadas</Label>
              <Input
                id="manual-miles"
                type="number"
                placeholder="50000"
                value={milesUsed}
                onChange={(e) => setMilesUsed(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="manual-cost">Custo do Milheiro (R$/mil)</Label>
              <Input
                id="manual-cost"
                type="number"
                step="0.01"
                placeholder="29.00"
                value={costPerMile}
                onChange={(e) => setCostPerMile(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                💡 Custo por cada 1.000 milhas
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="boarding-fee">
                <Plane className="inline mr-2 h-4 w-4" />
                Taxa de Embarque (R$)
              </Label>
              <Input
                id="boarding-fee"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={boardingFee}
                onChange={(e) => setBoardingFee(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="passengers">
                <Users className="inline mr-2 h-4 w-4" />
                Número de Passageiros
              </Label>
              <Input
                id="passengers"
                type="number"
                min="1"
                placeholder="1"
                value={passengers}
                onChange={(e) => setPassengers(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="target-margin">
                <Percent className="inline mr-2 h-4 w-4" />
                Margem Alvo (%)
              </Label>
              <Input
                id="target-margin"
                type="number"
                step="0.1"
                placeholder="20"
                value={targetMargin}
                onChange={(e) => setTargetMargin(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                💡 Margem de lucro desejada
              </p>
            </div>
          </TabsContent>

          <TabsContent value="account" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="account-select">Conta de Milhagem</Label>
              <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                <SelectTrigger id="account-select">
                  <SelectValue placeholder="Selecione uma conta" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.airline_companies.name} - {account.account_number} ({account.balance.toLocaleString('pt-BR')} milhas)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="account-miles">Milhas Utilizadas</Label>
              <Input
                id="account-miles"
                type="number"
                placeholder="50000"
                value={milesUsed}
                onChange={(e) => setMilesUsed(e.target.value)}
              />
              {insufficientBalance && (
                <Badge variant="destructive" className="text-xs">
                  Saldo insuficiente
                </Badge>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="account-boarding-fee">
                <Plane className="inline mr-2 h-4 w-4" />
                Taxa de Embarque (R$)
              </Label>
              <Input
                id="account-boarding-fee"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={boardingFee}
                onChange={(e) => setBoardingFee(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="account-passengers">
                <Users className="inline mr-2 h-4 w-4" />
                Número de Passageiros
              </Label>
              <Input
                id="account-passengers"
                type="number"
                min="1"
                placeholder="1"
                value={passengers}
                onChange={(e) => setPassengers(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="account-target-margin">
                <Percent className="inline mr-2 h-4 w-4" />
                Margem Alvo (%)
              </Label>
              <Input
                id="account-target-margin"
                type="number"
                step="0.1"
                placeholder="20"
                value={targetMargin}
                onChange={(e) => setTargetMargin(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                💡 Margem de lucro desejada
              </p>
            </div>
          </TabsContent>
        </Tabs>

        {(miles > 0 && costPerThousand > 0) && (
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-lg">💰 Análise Automática</h4>
              {!useManualPrice && totalCost > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setUseManualPrice(true)}
                >
                  ✏️ Editar Preço Manualmente
                </Button>
              )}
            </div>

            {useManualPrice && (
              <Card className="p-4 bg-muted/50 border-dashed">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="manual-override">Valor de Venda Manual (R$)</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setUseManualPrice(false);
                        setSalePrice("");
                        setPricePerPassenger("");
                      }}
                    >
                      💡 Voltar para Sugestão
                    </Button>
                  </div>
                  <Input
                    id="manual-override"
                    type="number"
                    step="0.01"
                    placeholder={suggestedPrice.toFixed(2)}
                    value={salePrice}
                    onChange={(e) => setSalePrice(e.target.value)}
                  />
                </div>
              </Card>
            )}

            {!useManualPrice && totalCost > 0 && (
              <Card className="p-6 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">💡 Valor Sugerido para Margem de {targetMarginNum}%</p>
                  <p className="text-4xl font-bold text-primary">
                    R$ {suggestedPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    R$ {pricePerThousand.toFixed(2)}/mil milhas
                  </p>
                </div>
              </Card>
            )}
            
            <div className="bg-muted/50 p-4 rounded-lg space-y-2 mb-4">
              <h5 className="font-semibold text-sm mb-2">📊 Breakdown do Cálculo:</h5>
              <div className="text-sm space-y-1 text-muted-foreground">
                <p>• Milhas: {miles.toLocaleString('pt-BR')} → {(miles / 1000).toFixed(1)} milheiros</p>
                <p>• Custo do Milheiro: R$ {costPerThousand.toFixed(2)}</p>
                <p>• Taxa de embarque: R$ {boardingFeeNum.toFixed(2)} × {passengersNum} passageiro(s)</p>
                <p>• Subtotal por passageiro: R$ {costPerPassenger.toFixed(2)}</p>
                <p>• × Número de passageiros: {passengersNum}</p>
                <p className="font-semibold text-foreground pt-1 border-t">= Custo Total: R$ {totalCost.toFixed(2)}</p>
              </div>
            </div>
            
            <div className="grid md:grid-cols-4 gap-4">
              <Card className="border-2 border-border/50">
                <CardContent className="p-4 space-y-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Custo Total</p>
                  <p className="text-2xl font-bold text-foreground">
                    R$ {totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(miles / 1000).toFixed(1)} milheiros × R$ {costPerThousand.toFixed(2)}
                  </p>
                </CardContent>
              </Card>

              <Card className={`border-2 ${profit >= 0 ? 'border-green-500/50 bg-green-500/5' : 'border-red-500/50 bg-red-500/5'}`}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4 text-primary" />
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Lucro</p>
                  </div>
                  <p className={`text-2xl font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    R$ {profit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {profit >= 0 ? '✅ Operação rentável' : '⚠️ Operação com prejuízo'}
                  </p>
                </CardContent>
              </Card>

              <Card className={`border-2 ${profitMargin >= 15 ? 'border-green-500/50 bg-green-500/5' : profitMargin >= 0 ? 'border-orange-500/50 bg-orange-500/5' : 'border-red-500/50 bg-red-500/5'}`}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Margem</p>
                  </div>
                  <p className={`text-2xl font-bold ${profitMargin >= 15 ? 'text-green-600' : profitMargin >= 0 ? 'text-orange-600' : 'text-red-600'}`}>
                    {profitMargin.toFixed(1)}%
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {profitMargin >= 20 ? '🎯 Ótima margem!' : profitMargin >= 10 ? '✅ Boa margem' : profitMargin >= 0 ? '⚠️ Margem baixa' : '❌ Prejuízo'}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 border-border/50">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-1">
                    <Calculator className="h-4 w-4 text-primary" />
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Custo/Milha</p>
                  </div>
                  <p className="text-2xl font-bold text-foreground">
                    R$ {effectiveCostPerMile.toFixed(4)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Custo efetivo por milha
                  </p>
                </CardContent>
              </Card>
            </div>

            {totalCost > 0 && (
              <Card className="mt-6 border-2 border-primary/20">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    🎯 Cenários de Margem
                  </CardTitle>
                  <CardDescription>
                    Veja quanto cobrar para diferentes margens de lucro
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {scenarios.map((scenario) => {
                      const scenarioProfit = scenario.price - totalCost;
                      const isTarget = Math.abs(scenario.margin - targetMarginNum) < 0.5;
                      return (
                        <div
                          key={scenario.margin}
                          className={`flex items-center justify-between p-3 rounded-lg ${
                            isTarget 
                              ? 'bg-primary/10 border-2 border-primary' 
                              : 'bg-muted/50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {isTarget && <span className="text-lg">⭐</span>}
                            <div>
                              <p className="font-semibold text-sm">{scenario.label}</p>
                              <p className="text-xs text-muted-foreground">
                                Lucro: R$ {scenarioProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold">
                              R$ {scenario.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              R$ {((scenario.price / (miles / 1000))).toFixed(2)}/mil
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
