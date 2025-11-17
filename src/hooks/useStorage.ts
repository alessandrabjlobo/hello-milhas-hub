import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useStorage = () => {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const uploadTicketFile = async (
    supplierId: string,
    saleId: string,
    file: File
  ): Promise<string | null> => {
    try {
      setUploading(true);
      const fileExt = file.name.split(".").pop();
      const timestamp = Date.now();
      const fileName = `${timestamp}.${fileExt}`;
      
      // ✅ SIMPLIFICAR PATH (evitar caracteres especiais)
      // Usar apenas: quotes/{timestamp}-{filename}
      const filePath = `quotes/${fileName}`;

      console.log('[UPLOAD] Tentando upload para:', filePath);

      const { error: uploadError } = await supabase.storage
        .from("tickets")
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('[UPLOAD] Erro:', uploadError);
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("tickets")
        .getPublicUrl(filePath);

      console.log('[UPLOAD] Sucesso! URL:', publicUrl);
      return publicUrl;
    } catch (error: any) {
      console.error('[UPLOAD] Erro completo:', error);
      toast({
        title: "Erro no upload",
        description: error.message || "Não foi possível enviar o arquivo",
        variant: "destructive",
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const deleteTicketFile = async (filePath: string): Promise<boolean> => {
    try {
      const { error } = await supabase.storage
        .from("tickets")
        .remove([filePath]);

      if (error) throw error;
      return true;
    } catch (error: any) {
      toast({
        title: "Erro ao remover arquivo",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    uploading,
    uploadTicketFile,
    deleteTicketFile,
  };
};
