import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { FileUp, FileSpreadsheet, AlertCircle } from 'lucide-react';
import { useBulkImport } from '@/hooks/useBulkImport';
import { generateSalesImportTemplate } from '@/lib/bulk-import-generator';
import { BulkImportUpload } from './BulkImportUpload';
import { BulkImportReview } from './BulkImportReview';

interface BulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function BulkImportDialog({
  open,
  onOpenChange,
  onSuccess,
}: BulkImportDialogProps) {
  const [step, setStep] = useState<'download' | 'upload' | 'review'>('download');
  const bulkImport = useBulkImport();

  const handleDownloadTemplate = () => {
    generateSalesImportTemplate('xlsx');
    setStep('upload');
  };

  const handleFileUploaded = async (file: File) => {
    await bulkImport.handleFileUpload(file);
    setStep('review');
  };

  const handleImportComplete = () => {
    onSuccess();
    onOpenChange(false);
    setStep('download');
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setStep('download');
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileUp className="h-5 w-5" />
            Importar Vendas em Lote
          </DialogTitle>
          <DialogDescription>
            Importe múltiplas vendas de uma planilha Excel
          </DialogDescription>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="py-4">
          <Progress
            value={
              step === 'download' ? 33 : step === 'upload' ? 66 : 100
            }
          />
          <div className="flex justify-between mt-2 text-sm text-muted-foreground">
            <span className={step === 'download' ? 'font-semibold text-foreground' : ''}>
              1. Baixar Modelo
            </span>
            <span className={step === 'upload' ? 'font-semibold text-foreground' : ''}>
              2. Enviar Arquivo
            </span>
            <span className={step === 'review' ? 'font-semibold text-foreground' : ''}>
              3. Revisar e Importar
            </span>
          </div>
        </div>

        {/* Step: Download */}
        {step === 'download' && (
          <div className="space-y-6 py-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <FileSpreadsheet className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="space-y-2">
                  <h3 className="font-semibold text-blue-900">
                    Como funciona a importação?
                  </h3>
                  <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                    <li>Baixe o modelo de planilha do sistema</li>
                    <li>Preencha os dados das vendas (um por linha)</li>
                    <li>Salve o arquivo e faça o upload</li>
                    <li>Revise os dados importados</li>
                    <li>Confirme para criar as vendas</li>
                  </ol>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div className="space-y-2">
                  <h3 className="font-semibold text-amber-900">
                    Campos obrigatórios
                  </h3>
                  <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">
                    <li>Data da venda, nome e CPF do cliente</li>
                    <li>Programa de milhas, origem e destino</li>
                    <li>Milhas, passageiros e valores</li>
                    <li>Forma de pagamento</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleDownloadTemplate}
                className="flex-1"
                size="lg"
              >
                <FileSpreadsheet className="h-5 w-5 mr-2" />
                Baixar Modelo Excel
              </Button>
              <Button
                variant="outline"
                onClick={() => setStep('upload')}
                size="lg"
              >
                Já tenho o arquivo →
              </Button>
            </div>
          </div>
        )}

        {/* Step: Upload */}
        {step === 'upload' && (
          <BulkImportUpload
            onFileUploaded={handleFileUploaded}
            onBack={() => setStep('download')}
            parsing={bulkImport.parsing}
          />
        )}

        {/* Step: Review */}
        {step === 'review' && (
          <BulkImportReview
            rows={bulkImport.rows}
            stats={bulkImport.stats}
            importing={bulkImport.importing}
            onImport={async () => {
              await bulkImport.importValidRows();
              handleImportComplete();
            }}
            onBack={() => setStep('upload')}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
