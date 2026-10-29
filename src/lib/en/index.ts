import { app } from "./app";
import { parties } from "./parties";
import { auth } from "./auth";
import { statement } from "./statement";
import { voice } from "./voice";
import { pages } from "./pages";
import { extra } from "./extra";

/** Türkçe metin → İngilizce karşılığı. Her alan kendi dosyasında tutulur. */
export const EN: Record<string, string> = { ...app, ...parties, ...pages, ...voice, ...statement, ...auth, ...extra };
