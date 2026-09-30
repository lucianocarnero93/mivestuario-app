// Achica la foto elegida para que el escudo entre en el celular y en la nube.
export function readCrestFile(
  file: File,
  options: { size?: number; quality?: number; maxChars?: number } = {},
): Promise<string | null> {
  const size = options.size ?? 256;
  const quality = options.quality ?? 0.72;
  const maxChars = options.maxChars ?? 120_000;
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onerror = () => resolve(null);
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => resolve(null);
      image.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(null);
          return;
        }
        const scale = Math.max(size / image.width, size / image.height);
        const width = image.width * scale;
        const height = image.height * scale;
        ctx.fillStyle = "#0b1c12";
        ctx.fillRect(0, 0, size, size);
        ctx.drawImage(image, (size - width) / 2, (size - height) / 2, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(dataUrl.length < maxChars ? dataUrl : null);
      };
      image.src = String(reader.result ?? "");
    };
    reader.readAsDataURL(file);
  });
}
