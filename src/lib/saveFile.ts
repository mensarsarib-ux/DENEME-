/** Claude önizlemesinin (artifact) sunduğu "dosya kaydet/paylaş" yeteneği; iOS uygulamasında paylaşım penceresini açar */
interface ViewerDownloads {
  save: (request: { filename: string; data: Blob | string }) => Promise<{ status: string }>;
}

export type SaveOutcome = "saved" | "declined" | "unavailable";

export async function saveViaViewer(filename: string, data: Blob | string): Promise<SaveOutcome> {
  const claude = (window as unknown as { claude?: { use?: (name: string) => Promise<unknown> } }).claude;
  if (!claude?.use) return "unavailable";
  try {
    const downloads = (await claude.use("downloads")) as ViewerDownloads | null;
    if (!downloads) return "unavailable";
    await downloads.save({ filename, data });
    return "saved";
  } catch (error) {
    return (error as { code?: string })?.code === "declined" ? "declined" : "unavailable";
  }
}
