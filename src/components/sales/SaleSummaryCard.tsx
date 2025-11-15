import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface SaleSummaryCardProps {
  customerName: string;
  routeText: string;
  departureDate: string;
  returnDate?: string;
  passengers: number;
  milesNeeded: string;
  priceTotal: string;
  boardingFee?: string;
  paymentMethod?: string;
  saleSource?: string;
}

export function SalesSummaryCard({
  customerName,
  routeText,
  departureDate,
  returnDate,
  passengers,
  milesNeeded,
  priceTotal,
  boardingFee,
  paymentMethod,
  saleSource,
}: SaleSummaryCardProps) {
  return (
    <Card className="p-6 sticky top-6">
      <h3 className="text-lg font-semibold mb-4">Resumo da Venda</h3>
      <div className="space-y-3 text-sm">
        {customerName && (
          <>
            <div>
              <p className="text-muted-foreground">Cliente</p>
              <p className="font-medium">{customerName}</p>
            </div>
            <Separator />
          </>
        )}
        {routeText && (
          <>
            <div>
              <p className="text-muted-foreground">Rota</p>
              <p className="font-medium">{routeText}</p>
            </div>
            <Separator />
          </>
        )}
        {departureDate && (
          <>
            <div>
              <p className="text-muted-foreground">Datas</p>
              <p className="font-medium">
                Ida: {new Date(departureDate).toLocaleDateString("pt-BR")}
              </p>
              {returnDate && (
                <p className="font-medium">
                  Volta: {new Date(returnDate).toLocaleDateString("pt-BR")}
                </p>
              )}
            </div>
            <Separator />
          </>
        )}
        {passengers > 0 && (
          <>
            <div>
              <p className="text-muted-foreground">Passageiros</p>
              <p className="font-medium">{passengers}</p>
            </div>
            <Separator />
          </>
        )}
        {milesNeeded && (
          <>
            <div>
              <p className="text-muted-foreground">Milhagem</p>
              <p className="font-medium">{parseInt(milesNeeded).toLocaleString("pt-BR")} milhas</p>
            </div>
            <Separator />
          </>
        )}
        {boardingFee && (
          <>
            <div>
              <p className="text-muted-foreground">Taxa de Embarque</p>
              <p className="font-medium">
                R$ {parseFloat(boardingFee).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
            </div>
            <Separator />
          </>
        )}
        {priceTotal && (
          <>
            <div>
              <p className="text-muted-foreground">Valor Total</p>
              <p className="text-xl font-bold text-primary">
                R$ {(parseFloat(priceTotal) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
            </div>
            <Separator />
          </>
        )}
        {paymentMethod && (
          <>
            <div>
              <p className="text-muted-foreground">Forma de Pagamento</p>
              <p className="font-medium">{paymentMethod}</p>
            </div>
            <Separator />
          </>
        )}
        {saleSource && (
          <>
            <div>
              <p className="text-muted-foreground">Origem</p>
              <p className="font-medium">{saleSource}</p>
            </div>
          </>
        )}
        {!customerName && !routeText && !departureDate && (
          <p className="text-muted-foreground text-center py-8">
            Preencha os dados da venda para ver o resumo
          </p>
        )}
      </div>
    </Card>
  );
}
