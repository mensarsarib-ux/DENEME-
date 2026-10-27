import { Capacitor } from "@capacitor/core";
import { Directory, Encoding, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

/**
 * Metin dosyasını kaydettirir. Yerel uygulamada dosya geçici klasöre yazılıp iOS paylaşım penceresi açılır
 * ("Dosyalara Kaydet" ile telefona kaydedilir). Tarayıcıda normal indirme başlatılır.
 */
export async function saveTextFile(name: string, text: string, mime = "application/json") {
  if (Capacitor.isNativePlatform()) {
    const written = await Filesystem.writeFile({
      path: name,
      data: text,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });
    await Share.share({ title: name, files: [written.uri] });
    return;
  }
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
