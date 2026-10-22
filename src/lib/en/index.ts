import { app } from "./app";
import { parties } from "./parties";
import { pages } from "./pages";

/** Türkçe metin → İngilizce karşılığı. Her alan kendi dosyasında tutulur. */
export const EN: Record<string, string> = { ...app, ...parties, ...pages };
