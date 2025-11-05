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
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${supplierId}/${saleId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("tickets")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("tickets").getPublicUrl(filePath);

      return publicUrl;
    } catch (error: any) {
      toast({
        title: "Erro no upload",
        description: error.message,
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
