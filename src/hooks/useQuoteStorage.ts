import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useQuoteStorage = () => {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const uploadQuoteImage = async (
    userId: string,
    quoteId: string | null,
    file: File
  ): Promise<string | null> => {
    try {
      setUploading(true);

      // Gerar nome único para o arquivo
      const timestamp = Date.now();
      const extension = file.name.split('.').pop();
      const fileName = `${timestamp}.${extension}`;
      
      // Estrutura: userId/quoteId/timestamp.ext
      const folderPath = quoteId ? `${userId}/${quoteId}` : `${userId}/temp`;
      const filePath = `${folderPath}/${fileName}`;

      // Upload para o bucket "quotes"
      const { error: uploadError } = await supabase.storage
        .from("quotes")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from("quotes")
        .getPublicUrl(filePath);

      toast({
        title: "Imagem enviada!",
        description: "A imagem foi adicionada ao orçamento.",
      });

      return publicUrl;
    } catch (error: any) {
      console.error("Erro ao fazer upload:", error);
      toast({
        title: "Erro no upload",
        description: error.message || "Não foi possível enviar a imagem.",
        variant: "destructive",
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const deleteQuoteImage = async (fileUrl: string): Promise<boolean> => {
    try {
      // Extrair o caminho do arquivo da URL
      const urlParts = fileUrl.split("/quotes/");
      if (urlParts.length < 2) throw new Error("URL inválida");

      const filePath = urlParts[1];

      const { error } = await supabase.storage
        .from("quotes")
        .remove([filePath]);

      if (error) throw error;

      toast({
        title: "Imagem removida",
        description: "A imagem foi excluída do orçamento.",
      });

      return true;
    } catch (error: any) {
      console.error("Erro ao deletar imagem:", error);
      toast({
        title: "Erro ao remover",
        description: error.message || "Não foi possível remover a imagem.",
        variant: "destructive",
      });
      return false;
    }
  };

  return { uploading, uploadQuoteImage, deleteQuoteImage };
};
