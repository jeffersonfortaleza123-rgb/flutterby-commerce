/**
 * Redimensiona e comprime uma imagem no próprio navegador antes de
 * enviá-la, usando o Canvas do navegador (sem precisar de nenhuma
 * biblioteca extra). Evita fotos de celular de 5-10MB indo pro
 * servidor sem necessidade — o site nunca precisa de mais do que
 * ~1200px de largura pra exibir uma foto de produto com qualidade.
 */
export const compressImage = (file: File, maxDimension = 1200, quality = 0.82): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        const scale = maxDimension / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Não foi possível processar a imagem"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Não foi possível comprimir a imagem"));
        },
        "image/jpeg",
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Não foi possível ler a imagem"));
    };

    img.src = objectUrl;
  });
};
