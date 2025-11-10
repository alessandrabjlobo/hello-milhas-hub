import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCreditInterestConfig } from "@/hooks/useCreditInterestConfig";
import { usePaymentMethods } from "@/hooks/usePaymentMethods";

interface SaleSuccessDialogProps {
  open: boolean;
  onClose: () => void;
  onRegisterTicket?: () => void;
  saleData: {
    customerName: string;
    routeText: string;
    airline: string;
    milesNeeded: string;
    priceTotal: string;
    boardingFee: string;
    passengers: number;
    paymentMethod?: string;
    pnr?: string;
  };
}

export function SaleSuccessDialog({
  open,
  onClose,
  onRegisterTicket,
  saleData,
}: SaleSuccessDialogProps) {
  const { toast } = useToast();
  const [copiedFull, setCopiedFull] = useState(false);
  const [copiedShort, setCopiedShort] = useState(false);
  const { configs, calculateInstallmentValue } = useCreditInterestConfig();
  const { activeMethods } = usePaymentMethods();

  const totalPrice = parseFloat(saleData.priceTotal);

  // Build payment methods sections
  const buildPaymentMethodsSection = () => {
    if (activeMethods.length === 0) {
      return "\n⚠️ Configure formas de pagamento em Configurações > Formas de Pagamento";
    }

    let sections: string[] = [];

    activeMethods.forEach((method) => {
      if (method.method_type === "pix") {
        sections.push(
          `📱 PIX (Aprovação Imediata)\n• Chave: ${method.additional_info?.pix_key || "A configurar"}\n• Titular: ${method.additional_info?.holder_name || "A configurar"}`
        );
      }

      if (method.method_type === "credit") {
        let creditSection = "💳 Cartão de Crédito";
        
        if (configs.length === 0) {
          creditSection += "\n• À vista: R$ " + totalPrice.toFixed(2);
        } else {
          configs.forEach((config) => {
            const result = calculateInstallmentValue(totalPrice, config.installments);
            if (config.interest_rate === 0) {
              creditSection += `\n• ${config.installments}x de R$ ${result.installmentValue.toFixed(2)} (sem juros)`;
            } else {
              creditSection += `\n• ${config.installments}x de R$ ${result.installmentValue.toFixed(2)} - Total: R$ ${result.finalPrice.toFixed(2)} (${config.interest_rate}%)`;
            }
          });
        }
        sections.push(creditSection);
      }

      if (method.method_type === "boleto") {
        sections.push(`🎫 Boleto Bancário\n• ${method.description || "Pagamento via boleto"}`);
      }

      if (method.method_type === "transfer") {
        sections.push(
          `🏦 Transferência Bancária\n• Banco: ${method.additional_info?.bank_name || "A configurar"}\n• Agência: ${method.additional_info?.agency || "A configurar"}\n• Conta: ${method.additional_info?.account_number || "A configurar"}\n• Titular: ${method.additional_info?.holder_name || "A configurar"}`
        );
      }
    });

    return "\n\n" + sections.join("\n\n");
  };

  const fullMessage = `✅ Sua passagem está pronta!

${saleData.pnr ? `Localizador (PNR): ${saleData.pnr}` : "⏳ Localizador será enviado em breve"}
Companhia: ${saleData.airline}
Passageiro(s): ${saleData.customerName}${saleData.passengers > 1 ? ` +${saleData.passengers - 1}` : ""}
Rota: ${saleData.routeText}

💰 Valor Total: R$ ${totalPrice.toFixed(2)}

━━━━━━━━━━━━━━━━━━━━━━━━

💳 FORMAS DE PAGAMENTO DISPONÍVEIS${buildPaymentMethodsSection()}

━━━━━━━━━━━━━━━━━━━━━━━━

Qualquer dúvida, estamos à disposição! 😊`;

  const shortMessage = saleData.pnr
    ? `PNR ${saleData.pnr} • Total R$ ${totalPrice.toFixed(2)}`
    : `Venda confirmada • Total R$ ${totalPrice.toFixed(2)} • PNR em breve`;

  const copyToClipboard = async (text: string, type: "full" | "short") => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === "full") {
        setCopiedFull(true);
        setTimeout(() => setCopiedFull(false), 2000);
      } else {
        setCopiedShort(true);
        setTimeout(() => setCopiedShort(false), 2000);
      }
      toast({
        title: "Copiado!",
        description: "Mensagem copiada para a área de transferência.",
      });
    } catch (err) {
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar a mensagem.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Check className="h-5 w-5 text-green-500" />
            Venda Registrada com Sucesso!
          </DialogTitle>
          <DialogDescription>
            Copie a mensagem abaixo para enviar ao cliente
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="full" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="full">Mensagem Completa</TabsTrigger>
            <TabsTrigger value="short">Versão Curta</TabsTrigger>
          </TabsList>

          <TabsContent value="full" className="space-y-4">
            <div className="bg-muted rounded-md p-4 text-sm whitespace-pre-wrap font-mono max-h-96 overflow-y-auto">
              {fullMessage}
            </div>
            <Button
              onClick={() => copyToClipboard(fullMessage, "full")}
              className="w-full"
              variant={copiedFull ? "secondary" : "default"}
            >
              {copiedFull ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Copiado!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar Mensagem Completa
                </>
              )}
            </Button>
          </TabsContent>

          <TabsContent value="short" className="space-y-4">
            <div className="bg-muted rounded-md p-4 text-sm whitespace-pre-wrap font-mono">
              {shortMessage}
            </div>
            <Button
              onClick={() => copyToClipboard(shortMessage, "short")}
              className="w-full"
              variant={copiedShort ? "secondary" : "default"}
            >
              {copiedShort ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Copiado!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar Versão Curta
                </>
              )}
            </Button>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4">
          {onRegisterTicket && (
            <Button onClick={onRegisterTicket}>
              Registrar Passagem
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
