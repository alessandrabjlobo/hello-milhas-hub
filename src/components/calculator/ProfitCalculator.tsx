import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calculator, TrendingUp, DollarSign } from "lucide-react";
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
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [accounts, setAccounts] = useState<MileageAccount[]>([]);

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
  const price = parseFloat(salePrice) || 0;

  // Cálculo correto: dividir milhas por 1.000 e multiplicar pelo custo do milheiro
  const totalCost = (miles / 1000) * costPerThousand;
  const profit = price - totalCost;
  const profitMargin = price > 0 ? (profit / price) * 100 : 0;
  const effectiveCostPerMile = miles > 0 ? totalCost / miles : 0;

  const selectedAccountData = accounts.find(a => a.id === selectedAccount);
  const insufficientBalance = selectedAccountData && miles > selectedAccountData.balance;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          <CardTitle>Calculadora de Lucro</CardTitle>
        </div>
        <CardDescription>
          Calcule o lucro de suas vendas de milhas
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
              <Label htmlFor="manual-cost">Custo por Milheiro (R$)</Label>
              <Input
                id="manual-cost"
                type="number"
                step="0.01"
                placeholder="29.00"
                value={costPerMile}
                onChange={(e) => setCostPerMile(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                💡 Valor por cada 1.000 milhas
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="manual-price">Preço de Venda (R$)</Label>
              <Input
                id="manual-price"
                type="number"
                step="0.01"
                placeholder="1450.00"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
              />
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
                      {account.airline_companies.name} - {account.account_number} ({account.balance.toLocaleString()} milhas)
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
              <Label htmlFor="account-price">Preço de Venda (R$)</Label>
              <Input
                id="account-price"
                type="number"
                step="0.01"
                placeholder="1450.00"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
              />
            </div>
          </TabsContent>
        </Tabs>

        {(miles > 0 && costPerThousand > 0 && price > 0) && (
          <div className="mt-6 space-y-4">
            <h4 className="font-semibold text-lg mb-4">💰 Resultados do Cálculo</h4>
            
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

              <Card className={`border-2 ${profitMargin >= 0 ? 'border-green-500/50 bg-green-500/5' : 'border-red-500/50 bg-red-500/5'}`}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Margem</p>
                  </div>
                  <p className={`text-2xl font-bold ${profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {profitMargin.toFixed(1)}%
                  </p>
                  <div className="w-full bg-muted rounded-full h-2 mt-2">
                    <div 
                      className={`h-2 rounded-full transition-all ${profitMargin >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                      style={{ width: `${Math.min(Math.abs(profitMargin), 100)}%` }}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 border-border/50">
                <CardContent className="p-4 space-y-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Custo/Milha</p>
                  <p className="text-2xl font-bold text-foreground">
                    R$ {effectiveCostPerMile.toFixed(4)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Custo efetivo por milha
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4">
                <h5 className="font-semibold text-sm mb-2">📊 Como funciona o cálculo?</h5>
                <p className="text-xs text-muted-foreground">
                  1. Divide-se as milhas por 1.000 para obter o número de milheiros<br/>
                  2. Multiplica-se pelos custos do milheiro: <strong>{(miles / 1000).toFixed(1)} milheiros × R$ {costPerThousand.toFixed(2)} = R$ {totalCost.toFixed(2)}</strong><br/>
                  3. Subtrai-se o custo total do preço de venda: <strong>R$ {price.toFixed(2)} - R$ {totalCost.toFixed(2)} = R$ {profit.toFixed(2)}</strong>
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
