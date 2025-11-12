import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { QuoteGenerator as QuoteGeneratorComponent } from "@/components/calculator/QuoteGenerator";

export default function QuoteGenerator() {
  const navigate = useNavigate();

  return (
    <div className="container max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Gerador de Orçamentos</h1>
          <p className="text-muted-foreground">
            Crie orçamentos profissionais e envie por WhatsApp
          </p>
        </div>
      </div>

      <QuoteGeneratorComponent />
    </div>
  );
}
