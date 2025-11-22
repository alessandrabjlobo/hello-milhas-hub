import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, AlertCircle, XCircle, ArrowLeft, Download } from 'lucide-react';
import type { ProcessedSaleRow } from '@/hooks/useBulkImport';

interface BulkImportReviewProps {
  rows: ProcessedSaleRow[];
  stats: {
    total: number;
    valid: number;
    invalid: number;
    imported: number;
    error: number;
  };
  importing: boolean;
  onImport: () => void;
  onBack: () => void;
}

export function BulkImportReview({
  rows,
  stats,
  importing,
  onImport,
  onBack,
}: BulkImportReviewProps) {
  return (
    <div className="space-y-6 py-6">
      {/* Stats */}
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-slate-50 border rounded-lg p-3 text-center">
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="text-sm text-muted-foreground">Total</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-green-600">{stats.valid}</div>
          <div className="text-sm text-green-700">Válidas</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-red-600">{stats.invalid}</div>
          <div className="text-sm text-red-700">Com Erro</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.imported}</div>
          <div className="text-sm text-blue-700">Importadas</div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-amber-600">{stats.error}</div>
          <div className="text-sm text-amber-700">Falhas</div>
        </div>
      </div>

      {/* Alerts */}
      {stats.invalid > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {stats.invalid} venda(s) com erros. Apenas vendas válidas serão importadas.
          </AlertDescription>
        </Alert>
      )}

      {/* Table */}
      <div className="border rounded-lg max-h-[400px] overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Programa</TableHead>
              <TableHead>Rota</TableHead>
              <TableHead>Milhas</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Erros/Avisos</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.rowNumber}>
                <TableCell className="font-mono text-xs">
                  {row.rowNumber}
                </TableCell>
                <TableCell>
                  {row.status === 'valid' && (
                    <Badge variant="default">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Válida
                    </Badge>
                  )}
                  {row.status === 'invalid' && (
                    <Badge variant="destructive">
                      <XCircle className="h-3 w-3 mr-1" />
                      Erro
                    </Badge>
                  )}
                  {row.status === 'imported' && (
                    <Badge variant="secondary">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Importada
                    </Badge>
                  )}
                  {row.status === 'error' && (
                    <Badge variant="destructive">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Falhou
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="font-medium">
                  {row.data.nome_cliente}
                </TableCell>
                <TableCell>
                  {row.validation.resolvedData.airlineName || row.data.programa_milhas}
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {row.data.origem} → {row.data.destino}
                </TableCell>
                <TableCell>
                  {row.data.milhas_ida}
                  {row.data.milhas_volta && ` + ${row.data.milhas_volta}`}
                </TableCell>
                <TableCell>
                  R$ {row.data.valor_total}
                </TableCell>
                <TableCell>
                  {row.validation.errors.length > 0 && (
                    <div className="text-xs text-red-600 space-y-1">
                      {row.validation.errors.map((err, i) => (
                        <div key={i}>• {err}</div>
                      ))}
                    </div>
                  )}
                  {row.validation.warnings.length > 0 && (
                    <div className="text-xs text-amber-600 space-y-1">
                      {row.validation.warnings.map((warn, i) => (
                        <div key={i}>⚠️ {warn}</div>
                      ))}
                    </div>
                  )}
                  {row.errorMessage && (
                    <div className="text-xs text-red-600">
                      ❌ {row.errorMessage}
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Actions */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={importing}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        
        <Button
          onClick={onImport}
          disabled={stats.valid === 0 || importing}
          size="lg"
        >
          {importing ? (
            <>
              <Download className="h-5 w-5 mr-2 animate-spin" />
              Importando...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-5 w-5 mr-2" />
              Importar {stats.valid} venda(s)
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
