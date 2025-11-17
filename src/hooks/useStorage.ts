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
      
      // ✅ PATH COM ISOLAMENTO POR USUÁRIO (respeita RLS)
      // Formato: userId/quotes/filename
      const filePath = `${supplierId}/quotes/${fileName}`;

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

      // Gerar signed URL com validade de 1 ano
      const { data, error: signedUrlError } = await supabase.storage
        .from("tickets")
        .createSignedUrl(filePath, 31536000); // 365 dias em segundos

      if (signedUrlError) {
        console.error('[UPLOAD] Erro ao gerar signed URL:', signedUrlError);
        throw signedUrlError;
      }

      console.log('[UPLOAD] Sucesso! Signed URL:', data.signedUrl);
      return data.signedUrl;
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

  const refreshSignedUrls = async (urls: string[]): Promise<string[]> => {
    console.log(`[REFRESH] Regenerando ${urls.length} signed URL(s)...`);
    const refreshed: string[] = [];
    
    for (const url of urls) {
      try {
        // Extrair o filePath da URL
        // Exemplo: https://.../storage/v1/object/sign/tickets/uuid/quotes/123.png?token=...
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/');
        const bucketIndex = pathParts.indexOf('tickets');
        
        if (bucketIndex === -1) {
          console.warn('[REFRESH] URL não é do bucket tickets:', url);
          refreshed.push(url);
          continue;
        }
        
        const filePath = pathParts.slice(bucketIndex + 1).join('/');
        
        // Gerar nova signed URL
        const { data, error } = await supabase.storage
          .from("tickets")
          .createSignedUrl(filePath, 31536000);
        
        if (error) {
          console.error('[REFRESH] Erro ao regenerar URL:', error);
          refreshed.push(url); // Mantém URL antiga em caso de erro
        } else {
          console.log('[REFRESH] URL regenerada:', data.signedUrl);
          refreshed.push(data.signedUrl);
        }
      } catch (err) {
        console.error('[REFRESH] Erro ao processar URL:', err);
        refreshed.push(url);
      }
    }
    
    return refreshed;
  };

  return {
    uploading,
    uploadTicketFile,
    deleteTicketFile,
    refreshSignedUrls,
  };
};
