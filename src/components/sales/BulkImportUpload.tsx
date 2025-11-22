import { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, FileSpreadsheet, ArrowLeft } from 'lucide-react';

interface BulkImportUploadProps {
  onFileUploaded: (file: File) => void;
  onBack: () => void;
  parsing: boolean;
}

export function BulkImportUpload({
  onFileUploaded,
  onBack,
  parsing,
}: BulkImportUploadProps) {
  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        onFileUploaded(file);
      }
    },
    [onFileUploaded]
  );

  return (
    <div className="space-y-6 py-6">
      <div
        className={`
          border-2 border-dashed rounded-lg p-12 text-center
          transition-colors
          ${parsing ? 'opacity-50 cursor-not-allowed border-border' : 'border-border hover:border-primary/50'}
        `}
      >
        <input
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleFileChange}
          disabled={parsing}
          className="hidden"
          id="bulk-import-file"
        />
        
        <label
          htmlFor="bulk-import-file"
          className={`flex flex-col items-center gap-4 ${parsing ? 'cursor-not-allowed' : 'cursor-pointer'}`}
        >
          {parsing ? (
            <>
              <FileSpreadsheet className="h-16 w-16 text-muted-foreground animate-pulse" />
              <div>
                <p className="text-lg font-semibold">Processando arquivo...</p>
                <p className="text-sm text-muted-foreground">
                  Aguarde enquanto analisamos os dados
                </p>
              </div>
            </>
          ) : (
            <>
              <Upload className="h-16 w-16 text-muted-foreground" />
              <div>
                <p className="text-lg font-semibold">
                  Clique para selecionar o arquivo
                </p>
                <p className="text-sm text-muted-foreground">
                  Formatos aceitos: .csv, .xlsx, .xls
                </p>
              </div>
            </>
          )}
        </label>
      </div>

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={parsing}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
      </div>
    </div>
  );
}
