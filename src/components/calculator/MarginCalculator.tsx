import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calculator, TrendingUp, AlertTriangle } from "lucide-react";

interface MarginCalculatorProps {
  costPerMile?: number;
  onCalculated?: (result: {
    grossValue: number;
    costValue: number;
    marginValue: number;
    marginPercentage: number;
  }) => void;
}

export function MarginCalculator({ costPerMile = 0.029, onCalculated }: MarginCalculatorProps) {
  const [miles, setMiles] = useState("");
  const [pricePerK, setPricePerK] = useState("");
  const [fees, setFees] = useState("");
  const [targetMargin, setTargetMargin] = useState("20");

  const milesNum = parseFloat(miles) || 0;
  const pricePerKNum = parseFloat(pricePerK) || 0;
  const feesNum = parseFloat(fees) || 0;
  const targetMarginNum = parseFloat(targetMargin) || 0;

  // Cálculos principais
  const grossValue = (milesNum / 1000) * pricePerKNum + feesNum;
  const costValue = milesNum * costPerMile;
  const marginValue = grossValue - costValue;
  const marginPercentage = grossValue > 0 ? (marginValue / grossValue) * 100 : 0;

  // Break-even: qual preço/1k para atingir margem alvo?
  const breakEvenPricePerK =
    milesNum > 0
      ? ((costValue / (1 - targetMarginNum / 100) - feesNum) / milesNum) * 1000
      : 0;

  useEffect(() => {
    if (onCalculated && milesNum > 0) {
      onCalculated({
        grossValue,
        costValue,
        marginValue,
        marginPercentage,
      });
    }
  }, [grossValue, costValue, marginValue, marginPercentage, onCalculated, milesNum]);

  const isGoodMargin = marginPercentage >= 15;
  const isNegative = marginValue < 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Simulador de Margem
        </CardTitle>
        <CardDescription>
          Calcule a margem de lucro e o ponto de equilíbrio
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="calc-miles">Milhagem</Label>
            <Input
              id="calc-miles"
              type="number"
              value={miles}
              onChange={(e) => setMiles(e.target.value)}
              placeholder="Ex: 50000"
            />
          </div>
          <div>
            <Label htmlFor="calc-price">Preço/1k milhas</Label>
            <Input
              id="calc-price"
              type="number"
              step="0.01"
              value={pricePerK}
              onChange={(e) => setPricePerK(e.target.value)}
              placeholder="Ex: 45.00"
            />
          </div>
          <div>
            <Label htmlFor="calc-fees">Taxas Totais (R$)</Label>
            <Input
              id="calc-fees"
              type="number"
              step="0.01"
              value={fees}
              onChange={(e) => setFees(e.target.value)}
              placeholder="Ex: 300.00"
            />
          </div>
          <div>
            <Label htmlFor="calc-target">Margem Alvo (%)</Label>
            <Input
              id="calc-target"
              type="number"
              step="0.1"
              value={targetMargin}
              onChange={(e) => setTargetMargin(e.target.value)}
              placeholder="Ex: 20"
            />
          </div>
        </div>

        {milesNum > 0 && pricePerKNum > 0 && (
          <div className="space-y-3 pt-4 border-t">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Valor Bruto</p>
                <p className="text-lg font-semibold">
                  R$ {grossValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Custo Total</p>
                <p className="text-lg font-semibold text-destructive">
                  R$ {costValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Margem (R$)</p>
                <p className={`text-lg font-semibold ${isNegative ? "text-destructive" : "text-green-600"}`}>
                  R$ {marginValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Margem (%)</p>
                <p className={`text-lg font-semibold ${isNegative ? "text-destructive" : isGoodMargin ? "text-green-600" : "text-orange-500"}`}>
                  {marginPercentage.toFixed(2)}%
                </p>
              </div>
            </div>

            {!isNegative && (
              <Alert>
                <TrendingUp className="h-4 w-4" />
                <AlertDescription>
                  <strong>Break-even:</strong> Para margem de {targetMarginNum}%, venda por{" "}
                  <strong>
                    R$ {breakEvenPricePerK.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}/mil
                  </strong>
                </AlertDescription>
              </Alert>
            )}

            {isNegative && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Prejuízo!</strong> O preço está abaixo do custo. Aumente para pelo menos{" "}
                  <strong>
                    R$ {((costValue / milesNum) * 1000).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}/mil
                  </strong>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
