// Achica la foto elegida para que el escudo entre en el celular y en la nube.
export function readCrestFile(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onerror = () => resolve(null);
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => resolve(null);
      image.onload = () => {
        const size = 256;
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
        const dataUrl = canvas.toDataURL("image/jpeg", 0.72);
        resolve(dataUrl.length < 120_000 ? dataUrl : null);
      };
      image.src = String(reader.result ?? "");
    };
    reader.readAsDataURL(file);
  });
}
