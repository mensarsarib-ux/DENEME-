/** Örnek logo: profil fotoğrafı seçilmemiş yeni kurulumda görünür (SVG, gömülü) */
export const SAMPLE_LOGO =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3c8fd9"/><stop offset="1" stop-color="#1e3a5f"/></linearGradient></defs><rect width="120" height="120" fill="url(#g)"/><path d="M30 88V46l30-20 30 20v42H70V64H50v24z" fill="#f5f7fa"/><circle cx="60" cy="50" r="6" fill="#3c8fd9"/></svg>`,
  );

const SIZE = 192;

/** Seçilen fotoğrafı ortadan kare keser, 192 px'e küçültür ve veri adresi olarak döndürür (saklama küçük kalsın) */
export function resizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const side = Math.min(img.naturalWidth, img.naturalHeight);
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = SIZE;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("canvas");
        ctx.drawImage(
          img,
          (img.naturalWidth - side) / 2,
          (img.naturalHeight - side) / 2,
          side,
          side,
          0,
          0,
          SIZE,
          SIZE,
        );
        resolve(canvas.toDataURL("image/png"));
      } catch (error) {
        reject(error);
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image"));
    };
    img.src = url;
  });
}
