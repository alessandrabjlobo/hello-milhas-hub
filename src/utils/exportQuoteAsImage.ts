import html2canvas from 'html2canvas';

export const exportQuoteAsImage = async (
  elementId: string,
  fileName: string = 'orcamento'
): Promise<void> => {
  try {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error('Elemento não encontrado para captura');
    }

    // Capturar o elemento como canvas
    const canvas = await html2canvas(element, {
      scale: 2, // Resolução 2x para melhor qualidade
      backgroundColor: '#ffffff',
      logging: false,
      useCORS: true,
      allowTaint: true,
    });

    // Converter canvas para blob
    canvas.toBlob((blob) => {
      if (!blob) {
        throw new Error('Falha ao gerar imagem');
      }
      
      // Criar link de download
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().split('T')[0];
      link.download = `${fileName}-${timestamp}.jpg`;
      link.href = url;
      link.click();
      
      // Limpar URL temporária
      URL.revokeObjectURL(url);
    }, 'image/jpeg', 0.95);
  } catch (error) {
    console.error('Erro ao exportar orçamento:', error);
    throw error;
  }
};
