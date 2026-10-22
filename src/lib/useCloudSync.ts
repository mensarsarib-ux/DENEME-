import { useCallback, useEffect, useRef, useState } from "react";
import { pull, push, type Session } from "./cloud";

export type SyncStatus = "loading" | "idle" | "syncing" | "synced" | "error";

/** Sunucudan yeni veri kontrol edilme sıklığı (ms) ve değişiklikten sonra yazmadan önce beklenen süre */
const POLL_MS = 15_000;
const PUSH_DELAY_MS = 1_500;

/**
 * Oturum açıkken veriyi sunucuyla eşitler: açılışta sunucudaki veriyi alır (yoksa mevcut veriyi yazar),
 * değişiklikleri kısa bir beklemeyle sunucuya yazar, başka telefondan gelen değişiklikleri düzenli aralıkla alır.
 * Çakışmada son yazan kazanır.
 */
export function useCloudSync({
  session,
  snapshot,
  apply,
  onExpired,
}: {
  session: Session | null;
  /** Sunucuya yazılacak veri; anahtar sırası her zaman aynı olmalı */
  snapshot: Record<string, unknown>;
  /** Sunucudan gelen veriyi uygular; uygulanan verinin aynı biçimdeki halini döndürür */
  apply: (remote: Record<string, unknown>) => Record<string, unknown>;
  onExpired: () => void;
}) {
  const [status, setStatus] = useState<SyncStatus>(session ? "loading" : "idle");
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [ready, setReady] = useState(false);

  const json = JSON.stringify(snapshot);
  const latest = useRef({ json, snapshot, apply, onExpired, session });
  latest.current = { json, snapshot, apply, onExpired, session };
  // Sunucuyla aynı olduğu bilinen son veri ve sunucudaki güncelleme zamanı
  const syncedJson = useRef<string | null>(null);
  const syncedAt = useRef<string | null>(null);
  const busy = useRef(false);

  const markSynced = (at: string) => {
    syncedAt.current = at;
    setLastSync(new Date());
    setStatus("synced");
  };

  /** Sunucudaki veriyi alır; yenisi varsa uygular. İlk çağrıda sunucuda veri yoksa mevcut veriyi yazar. */
  const pullRemote = useCallback(async (first: boolean) => {
    const cur = latest.current;
    if (!cur.session || busy.current) return;
    busy.current = true;
    try {
      const remote = await pull(cur.session);
      if (remote === "expired") return latest.current.onExpired();
      if (remote === null) {
        if (first) {
          const at = await push(cur.session, cur.snapshot);
          if (at === "expired") return latest.current.onExpired();
          syncedJson.current = cur.json;
          markSynced(at);
        }
      } else if (remote.updatedAt !== syncedAt.current) {
        const applied = latest.current.apply(remote.data);
        syncedJson.current = JSON.stringify(applied);
        markSynced(remote.updatedAt);
      } else if (first) {
        markSynced(remote.updatedAt);
      }
      if (first) setReady(true);
    } catch {
      setStatus("error");
      if (first) setReady(true);
    } finally {
      busy.current = false;
    }
  }, []);

  // Oturum açılınca ilk eşitleme
  const userId = session?.userId;
  useEffect(() => {
    setReady(false);
    syncedJson.current = null;
    syncedAt.current = null;
    if (!userId) {
      setStatus("idle");
      return;
    }
    setStatus("loading");
    void pullRemote(true);
  }, [userId, pullRemote]);

  // Yerel değişiklikleri kısa beklemeyle sunucuya yaz
  useEffect(() => {
    if (!session || !ready || json === syncedJson.current) return;
    const timer = window.setTimeout(async () => {
      const cur = latest.current;
      if (!cur.session || busy.current) return;
      busy.current = true;
      setStatus("syncing");
      try {
        const at = await push(cur.session, cur.snapshot);
        if (at === "expired") return cur.onExpired();
        syncedJson.current = cur.json;
        markSynced(at);
      } catch {
        setStatus("error");
      } finally {
        busy.current = false;
      }
    }, PUSH_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [json, session, ready]);

  // Başka telefondaki değişiklikleri al: düzenli aralıkla, sayfa öne gelince ve internet dönünce
  useEffect(() => {
    if (!session || !ready) return;
    const check = () => {
      if (document.visibilityState === "visible") void pullRemote(false);
    };
    const timer = window.setInterval(check, POLL_MS);
    document.addEventListener("visibilitychange", check);
    window.addEventListener("online", check);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("online", check);
    };
  }, [session, ready, pullRemote]);

  const syncNow = useCallback(() => void pullRemote(false), [pullRemote]);

  return { status, lastSync, ready, syncNow };
}
