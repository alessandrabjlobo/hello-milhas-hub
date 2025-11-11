import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Plane, ArrowRight } from "lucide-react";

export interface RoundTripData {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate: string;
}

interface RoundTripFormProps {
  data: RoundTripData;
  onChange: (data: RoundTripData) => void;
}

export function RoundTripForm({ data, onChange }: RoundTripFormProps) {
  const updateField = (field: keyof RoundTripData, value: string) => {
    onChange({ ...data, [field]: value });
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

      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground pt-2">
        <span>{data.origin || "Origem"}</span>
        <ArrowRight className="h-4 w-4" />
        <span>{data.destination || "Destino"}</span>
        <ArrowRight className="h-4 w-4" />
        <span>{data.origin || "Origem"}</span>
      </div>
    </div>
  );
}
