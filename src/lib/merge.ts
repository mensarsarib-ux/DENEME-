/**
 * Üç yönlü birleştirme: iki telefon (ya da iki ekip üyesi) aynı veriyi aynı anda değiştirdiğinde
 * ikisinin değişikliği de korunur. "base" iki tarafın da en son bildiği ortak veridir.
 *
 * - Kayıt listeleri (kişiler, işlemler, sekmeler, hesaplar, notlar) kayıt kimliğine göre birleştirilir:
 *   yalnızca bir tarafın değiştirdiği kayıt o taraftan alınır, eklenenler ikisinden de eklenir,
 *   silinen kayıt (öteki taraf onu değiştirmediyse) silinir.
 * - Aynı kaydı iki taraf da değiştirdiyse bu telefondaki (son yapılan) değişiklik geçerli olur.
 * - Ayarlar ve profil alan alan birleştirilir.
 * - Ortak veri bilinmiyorsa (base yok) hiçbir şey silinmez; iki tarafın kayıtları birleştirilir.
 */
type Obj = Record<string, unknown>;
type Row = Obj & { id: string };

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const isRowList = (v: unknown): v is Row[] =>
  Array.isArray(v) && v.every((x) => isObj(x) && typeof x.id === "string");
const isStringList = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === "string");

/** Bir değeri (alanı) birleştirir: yalnızca bir taraf değiştirdiyse o, ikisi de değiştirdiyse bu telefon */
function mergeValue(base: unknown, local: unknown, remote: unknown, hasBase: boolean): unknown {
  if (same(local, remote)) return local;
  if (isRowList(local) && isRowList(remote) && (!hasBase || base === undefined || isRowList(base))) {
    return mergeRows(hasBase ? ((base as Row[] | undefined) ?? []) : null, local, remote);
  }
  if (isStringList(local) && isStringList(remote) && (!hasBase || base === undefined || isStringList(base))) {
    return mergeStrings(hasBase ? ((base as string[] | undefined) ?? []) : null, local, remote);
  }
  if (isObj(local) && isObj(remote) && (!hasBase || base === undefined || isObj(base))) {
    return mergeFields(hasBase ? ((base as Obj | undefined) ?? {}) : null, local, remote);
  }
  if (!hasBase) return local;
  if (same(local, base)) return remote;
  return local;
}

/** Nesneyi alan alan birleştirir; alan sırası bu telefondaki gibi kalır */
function mergeFields(base: Obj | null, local: Obj, remote: Obj): Obj {
  const out: Obj = {};
  const keys = [...Object.keys(local), ...Object.keys(remote).filter((k) => !(k in local))];
  for (const k of keys) {
    const inLocal = k in local;
    const inRemote = k in remote;
    if (base && k in base) {
      // Bir taraf alanı kaldırdıysa ve öteki değiştirmediyse alan kalkar
      if (!inLocal && same(remote[k], base[k])) continue;
      if (!inRemote && same(local[k], base[k])) continue;
    }
    if (!inLocal) out[k] = remote[k];
    else if (!inRemote) out[k] = local[k];
    else out[k] = mergeValue(base?.[k], local[k], remote[k], base !== null);
  }
  return out;
}

/** Kayıt listesini kimliğe göre birleştirir */
function mergeRows(base: Row[] | null, local: Row[], remote: Row[]): Row[] {
  const b = new Map((base ?? []).map((r) => [r.id, r]));
  const l = new Map(local.map((r) => [r.id, r]));
  const r = new Map(remote.map((x) => [x.id, x]));

  const pick = (id: string): Row | null => {
    const lb = b.get(id);
    const ll = l.get(id);
    const rr = r.get(id);
    if (base === null || !lb) {
      // Ortak geçmişte yok: iki taraftan da eklenmiş olabilir; ikisinde de varsa bu telefonunki
      return ll ?? rr ?? null;
    }
    if (!ll && !rr) return null;
    // Bu telefonda silindi: öteki taraf değiştirmediyse silinir, değiştirdiyse onun hali kalır
    if (!ll) return same(rr, lb) ? null : (rr ?? null);
    // Öteki tarafta silindi: bu telefonda değişmediyse silinir, değiştiyse bu telefonun hali kalır
    if (!rr) return same(ll, lb) ? null : ll;
    if (same(ll, lb)) return rr;
    if (same(rr, lb)) return ll;
    return ll;
  };

  // Sıra: öteki tarafın sırası değişmediyse bu telefonunki, değiştiyse onunki; yeni kayıtlar sona eklenir
  const remoteOrderChanged = base !== null && !same(remote.map((x) => x.id), base.map((x) => x.id));
  const primary = remoteOrderChanged ? remote : local;
  const secondary = remoteOrderChanged ? local : remote;
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const row of [...primary, ...secondary]) {
    if (!seen.has(row.id)) {
      seen.add(row.id);
      ids.push(row.id);
    }
  }
  const out: Row[] = [];
  for (const id of ids) {
    const row = pick(id);
    if (row) out.push(row);
  }
  return out;
}

/** Metin listesini (ör. okunan bildirimler) birleştirir */
function mergeStrings(base: string[] | null, local: string[], remote: string[]): string[] {
  const b = new Set(base ?? []);
  const l = new Set(local);
  const r = new Set(remote);
  const out: string[] = [];
  for (const s of [...local, ...remote]) {
    if (out.includes(s)) continue;
    // Bir tarafta kaldırılan öğe (ortak geçmişte vardıysa) kalkar
    if (base !== null && b.has(s) && (!l.has(s) || !r.has(s))) continue;
    out.push(s);
  }
  return out;
}

/** Tüm veriyi birleştirir; base null ise ortak geçmiş bilinmiyordur (hiçbir şey silinmez) */
export function mergeSnapshots(base: Obj | null, local: Obj, remote: Obj): Obj {
  return mergeFields(base, local, remote);
}
