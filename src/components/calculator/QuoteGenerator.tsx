import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { FileText, Send, Copy, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { FlightSegmentForm, type FlightSegment } from "@/components/sales/FlightSegmentForm";
import { RoundTripForm, type RoundTripData } from "@/components/calculator/RoundTripForm";
import { usePaymentInterestConfig } from "@/hooks/usePaymentInterestConfig";
import { formatMiles } from "@/lib/utils";

export function QuoteGenerator() {
  const { toast } = useToast();
  const { configs } = usePaymentInterestConfig();
  
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [passengers, setPassengers] = useState("1");
  const [totalPrice, setTotalPrice] = useState("");
  const [boardingFee, setBoardingFee] = useState("");
  
  const [tripType, setTripType] = useState<"one_way" | "round_trip" | "multi_city">("round_trip");
  const [flightSegments, setFlightSegments] = useState<FlightSegment[]>([
    { from: "", to: "", date: "" }
  ]);
  const [roundTripData, setRoundTripData] = useState<RoundTripData>({
    origin: "",
    destination: "",
    departureDate: "",
    returnDate: "",
    miles: 0
  });

  const handleGenerateQuote = async () => {
    if (!clientName || !clientPhone || !totalPrice) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha cliente, telefone e valor total.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      let routeText = "";
      if (tripType === "round_trip") {
        routeText = `${roundTripData.origin} ⇄ ${roundTripData.destination}`;
      } else if (tripType === "one_way") {
        routeText = `${flightSegments[0]?.from} → ${flightSegments[0]?.to}`;
      } else {
        const validSegments = flightSegments.filter(s => s.from && s.to);
        routeText = validSegments.map(s => `${s.from} → ${s.to}`).join(', ');
      }

      const quoteData = {
        user_id: user.id,
        client_name: clientName,
        client_phone: clientPhone,
        route: routeText,
        miles_needed: 0,
        total_price: parseFloat(totalPrice) || 0,
        trip_type: tripType,
        boarding_fee: parseFloat(boardingFee) || 0,
        passengers: parseInt(passengers) || 1,
        status: 'pending',
      };

      const { error } = await supabase
        .from('quotes')
        .insert(quoteData);
      
      if (error) throw error;
      
      toast({
        title: "Orçamento salvo!",
        description: "Criado com sucesso.",
      });

      // Reset form
      setClientName("");
      setClientPhone("");
      setTotalPrice("");
      setBoardingFee("");
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Novo Orçamento
        </CardTitle>
        <CardDescription>
          Preencha os dados para gerar um orçamento
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Nome do Cliente</Label>
            <Input
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Nome completo"
            />
          </div>
          <div className="space-y-2">
            <Label>Telefone</Label>
            <Input
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              placeholder="(XX) XXXXX-XXXX"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Tipo de Viagem</Label>
          <RadioGroup value={tripType} onValueChange={(value: any) => setTripType(value)}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="one_way" id="one_way" />
              <Label htmlFor="one_way">Só Ida</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="round_trip" id="round_trip" />
              <Label htmlFor="round_trip">Ida e Volta</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="multi_city" id="multi_city" />
              <Label htmlFor="multi_city">Multi-trechos</Label>
            </div>
          </RadioGroup>
        </div>

        <Separator />

        {tripType === "round_trip" && (
          <RoundTripForm
            data={roundTripData}
            onChange={setRoundTripData}
          />
        )}

        {tripType === "one_way" && (
          <FlightSegmentForm
            segment={flightSegments[0]}
            onChange={(updated) => setFlightSegments([updated])}
            onRemove={() => {}}
            showRemove={false}
          />
        )}

        {tripType === "multi_city" && (
          <div className="space-y-3">
            {flightSegments.map((segment, idx) => (
              <FlightSegmentForm
                key={idx}
                segment={segment}
                onChange={(updated) => {
                  const newSegments = [...flightSegments];
                  newSegments[idx] = updated;
                  setFlightSegments(newSegments);
                }}
                onRemove={() => {
                  setFlightSegments(flightSegments.filter((_, i) => i !== idx));
                }}
                showRemove={flightSegments.length > 1}
              />
            ))}
            <Button
              onClick={() => setFlightSegments([...flightSegments, { from: "", to: "", date: "" }])}
              variant="outline"
              className="w-full"
            >
              Adicionar Trecho
            </Button>
          </div>
        )}

        <Separator />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Valor Total (R$)</Label>
            <Input
              type="number"
              value={totalPrice}
              onChange={(e) => setTotalPrice(e.target.value)}
              placeholder="0.00"
              step="0.01"
            />
          </div>
          <div className="space-y-2">
            <Label>Taxa de Embarque (R$)</Label>
            <Input
              type="number"
              value={boardingFee}
              onChange={(e) => setBoardingFee(e.target.value)}
              placeholder="0.00"
              step="0.01"
            />
          </div>
        </div>

        <Button onClick={handleGenerateQuote} className="w-full" size="lg">
          <FileText className="h-4 w-4 mr-2" />
          Salvar Orçamento
        </Button>
      </CardContent>
    </Card>
  );
}
