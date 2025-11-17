import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, CreditCard, Calculator } from "lucide-react";
import { usePaymentInterestConfig } from "@/hooks/usePaymentInterestConfig";
import { Skeleton } from "@/components/ui/skeleton";

export default function PaymentInterestSettings() {
  const { configs, loading, createConfig, updateConfig, deleteConfig, calculateInstallmentValue } =
    usePaymentInterestConfig();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<{ 
    id: string; 
    installments: number; 
    interest_rate: number; 
    payment_type: 'debit' | 'credit';
    config_type?: 'total' | 'per_installment';
    per_installment_rates?: Record<number, number>;
  } | null>(null);
  const [paymentType, setPaymentType] = useState<'debit' | 'credit'>('credit');
  const [installments, setInstallments] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [configType, setConfigType] = useState<'total' | 'per_installment'>('total');
  const [perInstallmentRates, setPerInstallmentRates] = useState<Record<number, number>>({});
  
  // Calculator
  const [calculatorValue, setCalculatorValue] = useState("");

  const handleOpenDialog = (config?: typeof editingConfig) => {
    if (config) {
      console.log('🔧 [EDIT] Carregando configuração:', config);
      
      // Normalizar taxas ao carregar (garantir Record<number, number>)
      const normalizedRates = config.per_installment_rates 
        ? Object.fromEntries(
            Object.entries(config.per_installment_rates).map(([k, v]) => [
              Number(k), 
              typeof v === 'string' ? parseFloat(v) : Number(v)
            ])
          )
        : {};
      
      setEditingConfig(config);
      setPaymentType(config.payment_type || 'credit');
      setInstallments(config.installments.toString());
      setInterestRate(config.interest_rate.toString());
      setConfigType(config.config_type || 'total');
      setPerInstallmentRates(normalizedRates);
      console.log('✅ [EDIT] Taxas por parcela carregadas (normalizadas):', normalizedRates);
    } else {
      setEditingConfig(null);
      setPaymentType('credit');
      setInstallments("");
      setInterestRate("");
      setConfigType('total');
      setPerInstallmentRates({});
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const installmentsNum = parseInt(installments);
    const interestRateNum = parseFloat(interestRate);

    // Validação: débito deve ter 1 parcela
    if (paymentType === 'debit' && installmentsNum !== 1) {
      return;
    }

    if (!installmentsNum || installmentsNum < 1 || installmentsNum > 24) {
      return;
    }

    if (configType === 'total' && (isNaN(interestRateNum) || interestRateNum < 0)) {
      return;
    }

    let success = false;
    if (editingConfig) {
      console.log('💾 [UPDATE] Salvando config:', {
        id: editingConfig.id,
        installments: installmentsNum,
        interest_rate: configType === 'total' ? interestRateNum : 0,
        config_type: configType,
        per_installment_rates: configType === 'per_installment' ? perInstallmentRates : {},
      });
      success = await updateConfig(editingConfig.id, {
        installments: installmentsNum,
        interest_rate: configType === 'total' ? interestRateNum : 0,
        config_type: configType,
        per_installment_rates: configType === 'per_installment' ? perInstallmentRates : {},
      });
    } else {
      console.log('💾 [CREATE] Criando config:', {
        installments: installmentsNum,
        interest_rate: configType === 'total' ? interestRateNum : 0,
        payment_type: paymentType,
        config_type: configType,
        per_installment_rates: configType === 'per_installment' ? perInstallmentRates : {},
      });
      success = await createConfig({
        installments: installmentsNum,
        interest_rate: configType === 'total' ? interestRateNum : 0,
        payment_type: paymentType,
        config_type: configType,
        per_installment_rates: configType === 'per_installment' ? perInstallmentRates : {},
      });
    }

    if (success) {
      setDialogOpen(false);
      setEditingConfig(null);
      setInstallments("");
      setInterestRate("");
      setConfigType('total');
      setPerInstallmentRates({});
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Deseja realmente remover esta configuração?")) {
      await deleteConfig(id);
    }
  };

  return (
    <div className="container max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Configurações de Juros</h1>
          <p className="text-muted-foreground">
            Configure as taxas para débito e crédito parcelado
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Configuração
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Tabela de Configurações */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Taxas Configuradas
            </CardTitle>
            <CardDescription>
              {configs.length} configuração(ões) ativa(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : configs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CreditCard className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Nenhuma configuração cadastrada</p>
                <p className="text-sm">Adicione taxas para habilitar parcelamento</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Parcelas</TableHead>
                    <TableHead>Taxa (%)</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {configs.map((config) => (
                    <TableRow key={config.id}>
                      <TableCell className="capitalize">
                        {config.payment_type === 'debit' ? 'Débito' : 'Crédito'}
                      </TableCell>
                      <TableCell className="font-medium">{config.installments}x</TableCell>
                      <TableCell>{config.interest_rate.toFixed(3)}%</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog({
                            id: config.id,
                            installments: config.installments,
                            interest_rate: config.interest_rate,
                            payment_type: config.payment_type,
                            config_type: config.config_type,                    // Necessário para "Juros Personalizado"
                            per_installment_rates: config.per_installment_rates, // Taxas individuais por parcela
                          })}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(config.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Calculadora */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Simulador de Parcelas
            </CardTitle>
            <CardDescription>
              Calcule os valores de parcelas com base nas taxas configuradas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="calculator-value">Valor Total (R$)</Label>
              <Input
                id="calculator-value"
                type="number"
                step="0.01"
                placeholder="1000.00"
                value={calculatorValue}
                onChange={(e) => setCalculatorValue(e.target.value)}
              />
            </div>

            {calculatorValue && parseFloat(calculatorValue) > 0 && (
              <div className="space-y-2">
                <Label>Simulação de Parcelas</Label>
                <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
                  {configs.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      Configure taxas de juros para ver a simulação
                    </div>
                  ) : (
                    configs.map((config) => {
                      const result = calculateInstallmentValue(
                        parseFloat(calculatorValue),
                        config.installments
                      );
                      return (
                        <div key={config.id} className="p-3 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold">
                              {config.payment_type === 'debit' ? 'Débito' : `${config.installments}x`}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              Taxa: {config.interest_rate}%
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span>Parcela:</span>
                            <span className="font-semibold">
                              R$ {result.installmentValue.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span>Total:</span>
                            <span className="font-semibold text-primary">
                              R$ {result.finalPrice.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog para Adicionar/Editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingConfig ? "Editar Configuração" : "Nova Configuração"}
            </DialogTitle>
            <DialogDescription>
              Configure a taxa de juros para débito ou crédito
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {!editingConfig && (
              <div className="space-y-2">
                <Label>Tipo de Pagamento</Label>
                <RadioGroup value={paymentType} onValueChange={(v) => {
                  setPaymentType(v as 'debit' | 'credit');
                  if (v === 'debit') {
                    setInstallments('1');
                  }
                }}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="debit" id="debit" />
                    <Label htmlFor="debit" className="cursor-pointer">Débito</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="credit" id="credit" />
                    <Label htmlFor="credit" className="cursor-pointer">Crédito</Label>
                  </div>
                </RadioGroup>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="installments">
                {paymentType === 'debit' ? 'Parcelas (fixo em 1)' : 'Número de Parcelas *'}
              </Label>
              <Input
                id="installments"
                type="number"
                min="1"
                max={paymentType === 'debit' ? '1' : '24'}
                placeholder="12"
                value={installments}
                onChange={(e) => setInstallments(e.target.value)}
                disabled={paymentType === 'debit'}
              />
              <p className="text-xs text-muted-foreground">
                {paymentType === 'debit' ? 'Débito sempre em 1 parcela' : 'Entre 1 e 24 parcelas'}
              </p>
            </div>

            {paymentType === 'credit' && parseInt(installments) >= 6 && (
              <div className="space-y-2">
                <Label>Tipo de Configuração de Juros</Label>
                <RadioGroup value={configType} onValueChange={(v) => setConfigType(v as typeof configType)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="total" id="total" />
                    <Label htmlFor="total" className="cursor-pointer">Juros Total</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="per_installment" id="per_installment" />
                    <Label htmlFor="per_installment" className="cursor-pointer">Juros Personalizado por Parcela</Label>
                  </div>
                </RadioGroup>
              </div>
            )}

            {configType === 'total' && (
              <div className="space-y-2">
                <Label htmlFor="interest-rate">
                  {paymentType === 'debit' ? 'Taxa de Débito (%) *' : 'Taxa de Juros (%) *'}
                </Label>
                <Input
                  id="interest-rate"
                  type="number"
                  step="0.001"
                  min="0"
                  placeholder={paymentType === 'debit' ? "4.160" : "6.750"}
                  value={interestRate}
                  onChange={(e) => setInterestRate(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {paymentType === 'debit' 
                    ? 'Taxa aplicada para pagamento no débito'
                    : 'Taxa total aplicada para este número de parcelas (não proporcional)'}
                </p>
              </div>
            )}

            {configType === 'per_installment' && paymentType === 'credit' && installments && parseInt(installments) >= 6 && (
              <div className="space-y-2 border rounded-lg p-4 bg-muted/50">
                <Label className="text-sm font-semibold">Taxa de Juros por Parcela (%)</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Configure a taxa individual para cada número de parcelas
                </p>
                <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                  {Array.from({ length: parseInt(installments) }, (_, i) => i + 1).map((num) => (
                    <div key={num} className="flex items-center gap-2">
                      <Label className="text-xs w-8">{num}x:</Label>
                      <Input
                        type="number"
                        step="0.001"
                        placeholder="0.000"
                        value={perInstallmentRates[num] ?? ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPerInstallmentRates(prev => ({
                            ...prev,
                            [num]: val === '' ? 0 : parseFloat(val) || 0
                          }));
                        }}
                        className="h-8 text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              {editingConfig ? "Atualizar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
