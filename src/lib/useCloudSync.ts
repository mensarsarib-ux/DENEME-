import { useCallback, useEffect, useRef, useState } from "react";
import { notifyChanges, pull, push, pushIfUnchanged, type Session } from "./cloud";
import { mergeSnapshots } from "./merge";
import { describeChanges } from "./changes";

export type SyncStatus = "loading" | "idle" | "syncing" | "synced" | "error";

/** Sunucudan yeni veri kontrol edilme sıklığı (ms) ve değişiklikten sonra yazmadan önce beklenen süre */
const POLL_MS = 15_000;
const PUSH_DELAY_MS = 1_500;

/**
 * Oturum açıkken veriyi sunucuyla eşitler: açılışta sunucudaki veriyi alır (yoksa mevcut veriyi yazar),
 * değişiklikleri kısa bir beklemeyle sunucuya yazar, başka telefondan gelen değişiklikleri düzenli aralıkla alır.
 * Aynı anda değişiklik olursa iki tarafınki kayıt kayıt birleştirilir (bkz. merge.ts).
 */
export function useCloudSync({
  session,
  snapshot,
  apply,
  onExpired,
  businessId = null,
  canSeed = true,
}: {
  session: Session | null;
  /** Veri ortak işletmeden okunur/yazılır; boşsa kişinin kendi verisi kullanılır */
  businessId?: string | null;
  /** Ortak veri henüz yoksa ilk veriyi yazabilen taraf (sahip); üye yazamaz */
  canSeed?: boolean;
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
  const latest = useRef({ json, snapshot, apply, onExpired, session, businessId, canSeed });
  latest.current = { json, snapshot, apply, onExpired, session, businessId, canSeed };
  // Sunucuyla aynı olduğu bilinen son veri ve sunucudaki güncelleme zamanı
  const syncedJson = useRef<string | null>(null);
  const syncedAt = useRef<string | null>(null);
  const busy = useRef(false);

  /**
   * Cihazda sunucuya henüz gitmemiş değişiklik olduğunu gösteren işaret ve sunucuyla en son ortak veri
   * (uygulama kapansa da kalır). İşaret varsa açılışta sunucudaki veri cihazdakinin üzerine yazılmaz;
   * ikisi ortak veriye göre birleştirilir.
   */
  const storeKey = (kind: "dirty" | "base", cur: typeof latest.current) =>
    `hesabim:${kind}:${cur.session?.userId ?? "-"}:${cur.businessId ?? "kisisel"}`;
  const setDirty = (cur: typeof latest.current, on: boolean) => {
    try {
      if (on) localStorage.setItem(storeKey("dirty", cur), "1");
      else localStorage.removeItem(storeKey("dirty", cur));
    } catch {
      /* depolama erişilemiyorsa koruma yalnızca oturum boyunca geçerli */
    }
  };
  const isDirty = (cur: typeof latest.current) => {
    try {
      return localStorage.getItem(storeKey("dirty", cur)) === "1";
    } catch {
      return false;
    }
  };
  const saveBase = (cur: typeof latest.current, base: string) => {
    try {
      localStorage.setItem(storeKey("base", cur), base);
    } catch {
      /* yer yoksa ortak veri saklanmaz; birleştirmede hiçbir kayıt silinmez */
    }
  };
  const loadBase = (cur: typeof latest.current): Record<string, unknown> | null => {
    try {
      const raw = localStorage.getItem(storeKey("base", cur));
      return raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  };
  const parse = (text: string | null) => (text ? (JSON.parse(text) as Record<string, unknown>) : null);

  /** Sunucuyla ortak veri: son alınan ya da yazılan veri ve sunucudaki zamanı */
  const markSynced = (at: string, base: string) => {
    syncedAt.current = at;
    syncedJson.current = base;
    saveBase(latest.current, base);
    setLastSync(new Date());
    setStatus("synced");
  };

  /**
   * Sunucudaki veriyi alır; yenisi varsa uygular. Bu telefonda gönderilmemiş değişiklik varsa ikisi birleştirilir
   * (birleşik veri hemen ardından sunucuya yazılır). İlk çağrıda sunucuda veri yoksa mevcut veriyi yazar.
   */
  const pullRemote = useCallback(async (first: boolean) => {
    const cur = latest.current;
    if (!cur.session || busy.current) return;
    busy.current = true;
    try {
      const remote = await pull(cur.session, cur.businessId);
      if (remote === "expired") return latest.current.onExpired();
      if (remote === null) {
        // Ortak işletmede veri yoksa üye boş verisini yazmaz; yalnızca sahip ilk veriyi oluşturur
        if (first && (!cur.businessId || cur.canSeed)) {
          const at = await push(cur.session, cur.snapshot, cur.businessId);
          if (at === "expired") return latest.current.onExpired();
          setDirty(cur, false);
          markSynced(at, cur.json);
        }
      } else if (remote.updatedAt !== syncedAt.current) {
        const remoteJson = JSON.stringify(remote.data);
        // Beklerken yapılan değişiklikler de hesaba katılsın diye güncel veri kullanılır
        const now = latest.current;
        // Gönderilmemiş değişiklik: açılışta kalıcı işaretten, açıkken ortak veriden farkından anlaşılır
        const pending = first ? isDirty(now) : syncedJson.current !== null && now.json !== syncedJson.current;
        if (pending) {
          const base = first ? loadBase(now) : parse(syncedJson.current);
          now.apply(mergeSnapshots(base, now.snapshot, remote.data));
          // Ortak veri artık sunucudaki; birleşik veri ondan farklı olduğu için yazma kendiliğinden başlar
          markSynced(remote.updatedAt, remoteJson);
        } else {
          const applied = latest.current.apply(remote.data);
          markSynced(remote.updatedAt, JSON.stringify(applied));
        }
      } else if (first) {
        markSynced(remote.updatedAt, syncedJson.current ?? cur.json);
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

  /**
   * Yerel veriyi sunucuya yazar. Araya başka bir telefonun yazması girdiyse onun verisi alınır,
   * iki tarafın değişiklikleri birleştirilir ve birleşik veri yazılır (kimsenin kaydı kaybolmaz).
   */
  const pushNow = useCallback(async () => {
    const cur = latest.current;
    if (!cur.session || busy.current) return;
    busy.current = true;
    setStatus("syncing");
    try {
      let base = parse(syncedJson.current);
      let at = syncedAt.current;
      let data: Record<string, unknown> = cur.snapshot;
      // Birleştirmede bu telefonun güncel verisi: ekran birleşik veriyle henüz yenilenmediyse son birleşik veri
      let staleJson: string | null = null;
      const localNow = () => (latest.current.json === staleJson ? data : latest.current.snapshot);
      const applyMerged = (merged: Record<string, unknown>) => {
        staleJson = latest.current.json;
        data = latest.current.apply(merged);
      };
      if (!at) {
        // Sunucuyla hiç eşitlenmemiş (ör. açılışta bağlantı yoktu): varsa sunucudaki veriyle önce birleştirilir
        const remote = await pull(cur.session, cur.businessId);
        if (remote === "expired") return cur.onExpired();
        if (remote) {
          applyMerged(mergeSnapshots(loadBase(cur), localNow(), remote.data));
          base = remote.data;
          at = remote.updatedAt;
        }
      }
      let written: string | null = null;
      // Sunucu zamanı karşılaştırılamazsa (ör. biçim farkı) koşulsuz yazmaya dönülür; veri hiçbir zaman yazılmadan kalmaz
      let conditional = true;
      for (let attempt = 0; attempt < 4 && written === null; attempt++) {
        const result =
          at && conditional
            ? await pushIfUnchanged(cur.session, data, at, cur.businessId)
            : await push(cur.session, data, cur.businessId);
        if (result === "expired") return cur.onExpired();
        if (result !== "conflict") {
          written = result;
          break;
        }
        // Araya başka bir yazma girdi: güncel veriyi al, birleştir, tekrar dene
        const remote = await pull(cur.session, cur.businessId);
        if (remote === "expired") return cur.onExpired();
        if (remote === null) {
          at = null;
          continue;
        }
        if (remote.updatedAt === at) {
          // Arada yazma olmamış ama koşul tutmadı: aynı veri üzerine koşulsuz yazılır
          conditional = false;
          continue;
        }
        applyMerged(mergeSnapshots(base, localNow(), remote.data));
        base = remote.data;
        at = remote.updatedAt;
      }
      if (written === null) throw new Error("conflict");
      // Üye değişiklikleri, içerikleriyle sahibe bildirilir
      if (cur.businessId && !cur.canSeed) {
        const messages = describeChanges(base, data);
        await notifyChanges(cur.session, cur.businessId, messages).catch(() => undefined);
      }
      // Gönderim sırasında yeni bir değişiklik olmadıysa işaret kaldırılır
      const writtenJson = JSON.stringify(data);
      if (latest.current.json === cur.json || latest.current.json === writtenJson) setDirty(cur, false);
      markSynced(written, writtenJson);
    } catch {
      setStatus("error");
    } finally {
      busy.current = false;
    }
  }, []);

  // Yerel değişiklikleri kısa beklemeyle sunucuya yaz
  useEffect(() => {
    if (!session || !ready || json === syncedJson.current) return;
    setDirty(latest.current, true);
    const timer = window.setTimeout(() => void pushNow(), PUSH_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [json, session, ready, pushNow]);

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

  // "Şimdi eşitle": önce sunucudan çeker, sonra bekleyen yerel değişiklikleri hemen yazar
  const [pushTick, setPushTick] = useState(0);
  useEffect(() => {
    if (pushTick === 0 || !session || !ready || json === syncedJson.current) return;
    void pushNow();
    // Yalnızca "Şimdi eşitle" çağrıldığında çalışır
  }, [pushTick]);

  const syncNow = useCallback(async () => {
    await pullRemote(false);
    setPushTick((n) => n + 1);
  }, [pullRemote]);

  return { status, lastSync, ready, syncNow };
}
