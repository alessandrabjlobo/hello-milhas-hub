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
  const cost = parseFloat(costPerMile) || 0;
  const price = parseFloat(salePrice) || 0;

  const totalCost = miles * cost;
  const profit = price - totalCost;
  const profitMargin = price > 0 ? (profit / price) * 100 : 0;

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
              <Label htmlFor="manual-cost">Custo por Milha (R$)</Label>
              <Input
                id="manual-cost"
                type="number"
                step="0.0001"
                placeholder="0.029"
                value={costPerMile}
                onChange={(e) => setCostPerMile(e.target.value)}
              />
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

        {(miles > 0 && cost > 0 && price > 0) && (
          <div className="mt-6 space-y-4 p-4 bg-muted/50 rounded-lg">
            <h4 className="font-semibold text-sm">Resultados:</h4>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Custo Total</p>
                <p className="text-lg font-bold">
                  R$ {totalCost.toFixed(2)}
                </p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3 text-primary" />
                  <p className="text-xs text-muted-foreground">Lucro</p>
                </div>
                <p className={`text-lg font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  R$ {profit.toFixed(2)}
                </p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-primary" />
                  <p className="text-xs text-muted-foreground">Margem</p>
                </div>
                <p className={`text-lg font-bold ${profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {profitMargin.toFixed(2)}%
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
