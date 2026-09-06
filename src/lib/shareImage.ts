/**
 * Gera uma imagem no formato de Stories (1080x1920) com a foto do
 * produto, o preço e o nome da loja, pronta pra compartilhar.
 *
 * O Instagram não tem uma API pública pra postar direto no Stories a
 * partir de um site qualquer. O jeito que funciona de verdade é: gerar
 * a imagem aqui e abrir o menu nativo de compartilhamento do celular
 * (Web Share API) — o Instagram Stories aparece como uma das opções
 * de destino nesse menu, igual quando você compartilha uma foto da
 * galeria.
 */
export const generateProductShareImage = async (
  imageUrl: string | null,
  productName: string,
  price: number,
  storeName: string
): Promise<Blob> => {
  const WIDTH = 1080;
  const HEIGHT = 1920;
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Não foi possível gerar a imagem");

  // Fundo
  const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  gradient.addColorStop(0, "#fdf2f8");
  gradient.addColorStop(1, "#fce7f3");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Foto do produto (busca via fetch pra evitar problema de CORS ao desenhar no canvas)
  if (imageUrl) {
    try {
      const response = await fetch(imageUrl, { mode: "cors" });
      const blob = await response.blob();
      const bitmap = await createImageBitmap(blob);

      const boxSize = 880;
      const boxX = (WIDTH - boxSize) / 2;
      const boxY = 260;

      // Cover: preenche o quadrado mantendo proporção
      const scale = Math.max(boxSize / bitmap.width, boxSize / bitmap.height);
      const drawWidth = bitmap.width * scale;
      const drawHeight = bitmap.height * scale;
      const drawX = boxX + (boxSize - drawWidth) / 2;
      const drawY = boxY + (boxSize - drawHeight) / 2;

      ctx.save();
      ctx.beginPath();
      const radius = 32;
      ctx.moveTo(boxX + radius, boxY);
      ctx.arcTo(boxX + boxSize, boxY, boxX + boxSize, boxY + boxSize, radius);
      ctx.arcTo(boxX + boxSize, boxY + boxSize, boxX, boxY + boxSize, radius);
      ctx.arcTo(boxX, boxY + boxSize, boxX, boxY, radius);
      ctx.arcTo(boxX, boxY, boxX + boxSize, boxY, radius);
      ctx.closePath();
      ctx.clip();
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(boxX, boxY, boxSize, boxSize);
      ctx.drawImage(bitmap, drawX, drawY, drawWidth, drawHeight);
      ctx.restore();
    } catch {
      // Sem imagem (erro de rede/CORS): segue só com texto, não trava o compartilhamento.
    }
  }

  // Nome da loja
  ctx.fillStyle = "#831843";
  ctx.font = "bold 56px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(storeName, WIDTH / 2, 160);

  // Nome do produto
  ctx.fillStyle = "#1f2937";
  ctx.font = "600 52px sans-serif";
  wrapText(ctx, productName, WIDTH / 2, 1250, 900, 62);

  // Preço em destaque
  ctx.fillStyle = "#ec4899";
  ctx.font = "bold 100px sans-serif";
  ctx.fillText(
    `R$ ${price.toFixed(2).replace(".", ",")}`,
    WIDTH / 2,
    1450
  );

  ctx.fillStyle = "#831843";
  ctx.font = "500 40px sans-serif";
  ctx.fillText("Fale no WhatsApp e garanta o seu!", WIDTH / 2, 1560);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Não foi possível gerar a imagem"));
    }, "image/png");
  });
};

const wrapText = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) => {
  const words = text.split(" ");
  let line = "";
  let currentY = y;
  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, currentY);
      line = word;
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, currentY);
};

/**
 * Tenta compartilhar a imagem via menu nativo do celular (onde o
 * Instagram Stories aparece como opção). Se o navegador não suportar
 * compartilhar arquivos, baixa a imagem pro dispositivo como alternativa.
 */
export const shareProductImage = async (blob: File, title: string): Promise<"shared" | "downloaded"> => {
  if (navigator.canShare && navigator.canShare({ files: [blob] }) && navigator.share) {
    await navigator.share({ files: [blob], title });
    return "shared";
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return "downloaded";
};
