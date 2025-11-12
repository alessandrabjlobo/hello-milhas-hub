import { useState } from "react";
import { Upload, X, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Attachment {
  fileName: string;
  filePath: string;
  fileSize: number;
  uploadedAt: string;
  url: string;
}

interface TicketPDFUploadProps {
  ticketId?: string;
  onAttachmentsChange: (attachments: Attachment[]) => void;
  attachments: Attachment[];
  disabled?: boolean;
}

export function TicketPDFUpload({
  ticketId,
  onAttachmentsChange,
  attachments,
  disabled = false,
}: TicketPDFUploadProps) {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    try {
      setUploading(true);
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Usuário não autenticado");

      const newAttachments: Attachment[] = [];

      for (const file of Array.from(files)) {
        // Validate file type
        if (!["application/pdf", "image/jpeg", "image/jpg"].includes(file.type)) {
          toast({
            title: "Tipo de arquivo inválido",
            description: "Apenas arquivos PDF e JPEG são permitidos.",
            variant: "destructive",
          });
          continue;
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          toast({
            title: "Arquivo muito grande",
            description: "O arquivo deve ter no máximo 10MB.",
            variant: "destructive",
          });
          continue;
        }

        const fileExt = file.type === "application/pdf" ? "pdf" : "jpg";
        const fileName = `${Date.now()}-${file.name}`;
        const filePath = `${userData.user.id}/${ticketId || "temp"}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("ticket-pdfs")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from("ticket-pdfs").getPublicUrl(filePath);

        newAttachments.push({
          fileName: file.name,
          filePath,
          fileSize: file.size,
          uploadedAt: new Date().toISOString(),
          url: publicUrl,
        });
      }

      onAttachmentsChange([...attachments, ...newAttachments]);

      toast({
        title: "Upload concluído!",
        description: `${newAttachments.length} arquivo(s) enviado(s).`,
      });
    } catch (error: any) {
      toast({
        title: "Erro no upload",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const handleRemove = async (filePath: string) => {
    try {
      const { error } = await supabase.storage
        .from("ticket-pdfs")
        .remove([filePath]);

      if (error) throw error;

      onAttachmentsChange(attachments.filter((a) => a.filePath !== filePath));

      toast({
        title: "Arquivo removido",
        description: "O arquivo foi excluído com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao remover",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || uploading}
          onClick={() => document.getElementById("pdf-upload")?.click()}
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Anexar PDF/JPEG
            </>
          )}
        </Button>
        <span className="text-xs text-muted-foreground">
          Máximo 10MB por arquivo (PDF ou JPEG)
        </span>
      </div>

      <input
        id="pdf-upload"
        type="file"
        accept="application/pdf,image/jpeg,image/jpg"
        multiple
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || uploading}
      />

      {attachments.length > 0 && (
        <div className="space-y-2">
          {attachments.map((attachment) => (
            <div
              key={attachment.filePath}
              className="flex items-center justify-between p-2 bg-muted rounded-md text-sm"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex flex-col min-w-0">
                  <span className="truncate font-medium">
                    {attachment.fileName}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatFileSize(attachment.fileSize)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(attachment.url, "_blank")}
                >
                  Ver
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemove(attachment.filePath)}
                  disabled={disabled}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
