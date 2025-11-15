import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, Loader2, FileText, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { parseDocument } from "@/lib/bilhete-parser";

interface ExtractedData {
  pnr?: string;
  ticketNumber?: string;
  passengerName?: string;
  cpf?: string;
  route?: string;
  departureDate?: string;
  airline?: string;
  flightNumber?: string;
}

interface BilheteTicketExtractorProps {
  onDataExtracted: (data: ExtractedData) => void;
}

export function BilheteTicketExtractor({ onDataExtracted }: BilheteTicketExtractorProps) {
  const [file, setFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [processingAI, setProcessingAI] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === "application/pdf") {
      setFile(selectedFile);
      setExtractedData(null);
    } else {
      toast.error("Por favor, selecione um arquivo PDF válido");
    }
  };

  const handleExtract = async () => {
    if (!file) return;

    setExtracting(true);
    setProcessingAI(false);

    try {
      console.log("[BilheteExtractor] 📄 Iniciando extração do PDF:", file.name);

      // Mostrar que está extraindo texto
      toast.info("Lendo texto do PDF...");

      setProcessingAI(true);
      const data = await parseDocument(file);

      console.log("[BilheteExtractor] ✅ Dados extraídos:", data);
      setExtractedData(data);

      const extractedCount = Object.values(data).filter(v => v).length;

      if (extractedCount === 0) {
        toast.error("Nenhum dado encontrado no PDF. Tente preencher manualmente.");
      } else if (extractedCount < 4) {
        toast.success(`${extractedCount} campos extraídos. Complete os faltantes manualmente.`);
      } else {
        toast.success(`${extractedCount} campos extraídos com sucesso!`);
      }
    } catch (error) {
      console.error("[BilheteExtractor] ❌ Erro ao extrair dados:", error);
      toast.error("Não foi possível extrair dados do PDF");
    } finally {
      setExtracting(false);
      setProcessingAI(false);
    }
  };

  const handleApply = () => {
    if (extractedData) {
      onDataExtracted(extractedData);
      toast.success("Dados aplicados ao formulário");
    }
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <FileText className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Extrair Dados do Bilhete (PDF)</h3>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileSelect}
            className="hidden"
            id="pdf-upload"
          />
          <label htmlFor="pdf-upload">
            <Button variant="outline" size="sm" asChild>
              <span className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                {file ? file.name : "Selecionar PDF"}
              </span>
            </Button>
          </label>

          {file && (
            <Button
              onClick={handleExtract}
              disabled={extracting}
              size="sm"
            >
              {extracting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {processingAI ? "Processando com IA..." : "Extraindo texto..."}
                </>
              ) : (
                "Extrair Informações"
              )}
            </Button>
          )}
        </div>

        {extractedData && (
          <div className="border rounded-lg p-3 bg-muted/50 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <CheckCircle2 className="h-4 w-4" />
              Dados Extraídos:
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {extractedData.pnr && (
                <div>
                  <span className="text-muted-foreground">PNR:</span>{" "}
                  <span className="font-medium">{extractedData.pnr}</span>
                </div>
              )}
              {extractedData.ticketNumber && (
                <div>
                  <span className="text-muted-foreground">Bilhete:</span>{" "}
                  <span className="font-medium">{extractedData.ticketNumber}</span>
                </div>
              )}
              {extractedData.passengerName && (
                <div>
                  <span className="text-muted-foreground">Passageiro:</span>{" "}
                  <span className="font-medium">{extractedData.passengerName}</span>
                </div>
              )}
              {extractedData.cpf && (
                <div>
                  <span className="text-muted-foreground">CPF:</span>{" "}
                  <span className="font-medium">{extractedData.cpf}</span>
                </div>
              )}
              {extractedData.route && (
                <div>
                  <span className="text-muted-foreground">Rota:</span>{" "}
                  <span className="font-medium">{extractedData.route}</span>
                </div>
              )}
              {extractedData.airline && (
                <div>
                  <span className="text-muted-foreground">Cia Aérea:</span>{" "}
                  <span className="font-medium">{extractedData.airline}</span>
                </div>
              )}
            </div>
            <Button onClick={handleApply} size="sm" className="w-full">
              Aplicar ao Formulário
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
