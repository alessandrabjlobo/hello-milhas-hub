import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Plane } from "lucide-react";

export interface RoundTripData {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate: string;
  miles: number;          // usado para "Só Ida" em outros fluxos
  milesOutbound: number;  // milhas ida / pax
  milesReturn: number;    // milhas volta / pax
}

interface RoundTripFormProps {
  data: RoundTripData;
  onChange: (data: RoundTripData) => void;
}

export function RoundTripForm({ data, onChange }: RoundTripFormProps) {
  const updateField = (field: keyof RoundTripData, value: string | number) => {
    onChange({ ...data, [field]: value });
  };

  const handleMilesChange = (field: "milesOutbound" | "milesReturn", value: string) => {
    const numeric = value.replace(/\D/g, "");
    const num = numeric ? Number(numeric) : 0;
    updateField(field, num);
  };

  return (
    <div className="p-4 border rounded-lg space-y-4 bg-muted/30">
      <div className="flex items-center gap-2 mb-2">
        <Plane className="h-4 w-4 text-primary" />
        <Label className="font-semibold">Voo Ida e Volta</Label>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="origin">Origem *</Label>
          <Input
            id="origin"
            placeholder="GRU - São Paulo"
            value={data.origin}
            onChange={(e) => updateField("origin", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="destination">Destino *</Label>
          <Input
            id="destination"
            placeholder="MIA - Miami"
            value={data.destination}
            onChange={(e) => updateField("destination", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="departureDate">Data de Ida *</Label>
          <Input
            id="departureDate"
            type="date"
            value={data.departureDate}
            onChange={(e) => updateField("departureDate", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="returnDate">Data de Volta *</Label>
          <Input
            id="returnDate"
            type="date"
            value={data.returnDate}
            onChange={(e) => updateField("returnDate", e.target.value)}
          />
        </div>
      </div>

      {/* 🔹 Campos separados de milhas: Ida e Volta */}
      <div className="grid md:grid-cols-2 gap-4 mt-2">
        <div className="space-y-2">
          <Label htmlFor="milesOutbound">Milhas ida/pax *</Label>
          <Input
            id="milesOutbound"
            placeholder="Ex: 30000"
            value={data.milesOutbound ? data.milesOutbound.toString() : ""}
            onChange={(e) => handleMilesChange("milesOutbound", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="milesReturn">Milhas volta/pax *</Label>
          <Input
            id="milesReturn"
            placeholder="Ex: 30000"
            value={data.milesReturn ? data.milesReturn.toString() : ""}
            onChange={(e) => handleMilesChange("milesReturn", e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
