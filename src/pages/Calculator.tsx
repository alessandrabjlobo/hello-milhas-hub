import { ProfitCalculator } from "@/components/calculator/ProfitCalculator";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Calculator() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container max-w-5xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Calculadora Inteligente de Milhas
            </h1>
            <p className="text-muted-foreground mt-1">
              Calcule automaticamente o preço ideal com análise de margem em tempo real
            </p>
          </div>
        </div>

        <ProfitCalculator />
      </div>
    </div>
  );
}
