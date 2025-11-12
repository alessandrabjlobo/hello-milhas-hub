import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2, Plane } from "lucide-react";

export interface FlightSegment {
  from: string;
  to: string;
  date: string;
  miles?: number;
  boardingFee?: number;
}

interface FlightSegmentFormProps {
  segment: FlightSegment;
  index: number;
  onUpdate: (index: number, field: keyof FlightSegment, value: string | number) => void;
  onRemove?: (index: number) => void;
  canRemove?: boolean;
  title?: string;
  showBoardingFee?: boolean;
}

export function FlightSegmentForm({
  segment,
  index,
  onUpdate,
  onRemove,
  canRemove = false,
  title,
  showBoardingFee = false,
}: FlightSegmentFormProps) {
  return (
    <div className="p-4 border rounded-lg space-y-3 bg-muted/30">
      <div className="flex items-center justify-between">
        <Label className="font-semibold flex items-center gap-2">
          <Plane className="h-4 w-4 text-primary" />
          {title || `Trecho ${index + 1}`}
        </Label>
        {canRemove && onRemove && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemove(index)}
            className="h-8 w-8 p-0"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        )}
      </div>

      <div className={`grid gap-3 ${showBoardingFee ? 'md:grid-cols-5' : 'md:grid-cols-4'}`}>
        <div className="space-y-2">
          <Label htmlFor={`from-${index}`}>Origem *</Label>
          <Input
            id={`from-${index}`}
            placeholder="GRU - São Paulo"
            value={segment.from}
            onChange={(e) => onUpdate(index, "from", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`to-${index}`}>Destino *</Label>
          <Input
            id={`to-${index}`}
            placeholder="MIA - Miami"
            value={segment.to}
            onChange={(e) => onUpdate(index, "to", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`date-${index}`}>Data *</Label>
          <Input
            id={`date-${index}`}
            type="date"
            value={segment.date}
            onChange={(e) => onUpdate(index, "date", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`miles-${index}`}>Milhas por Passageiro *</Label>
          <Input
            id={`miles-${index}`}
            type="number"
            placeholder="15000"
            value={segment.miles || ""}
            onChange={(e) => onUpdate(index, "miles", parseInt(e.target.value) || 0)}
          />
          <p className="text-xs text-muted-foreground">
            Milhas necessárias para 1 passageiro neste trecho
          </p>
        </div>

        {showBoardingFee && (
          <div className="space-y-2">
            <Label htmlFor={`boarding-fee-${index}`}>
              Taxa/pax (R$) *
            </Label>
            <Input
              id={`boarding-fee-${index}`}
              type="number"
              step="0.01"
              placeholder="35.00"
              value={segment.boardingFee || ""}
              onChange={(e) => onUpdate(index, "boardingFee", parseFloat(e.target.value) || 0)}
            />
            <p className="text-xs text-muted-foreground">
              Taxa para 1 passageiro
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
