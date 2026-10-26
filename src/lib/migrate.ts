import { createBusiness, push, type Session } from "./cloud";
import { listWorkspaces, readWorkspaceSnapshot, setWorkspaceServerId } from "./storage";

/**
 * Bu cihazda olup sunucuda kaydı olmayan yerel işletmeleri sunucuya taşır.
 * Her işletme için sunucuda işletme açılır ve yerel verisi yüklenir. Yerel veri silinmez.
 * Dönen değer: en az bir işletme taşındıysa true.
 */
export async function migrateLocalWorkspaces(session: Session, knownServerIds: string[]): Promise<boolean> {
  let changed = false;
  for (const w of listWorkspaces()) {
    if (w.serverId || knownServerIds.includes(w.id)) continue;
    const serverId = await createBusiness(session, w.name);
    if (serverId === "expired") return changed;
    const snapshot = readWorkspaceSnapshot(w.id);
    if (Object.keys(snapshot).length > 0) {
      const at = await push(session, snapshot, serverId);
      if (at === "expired") return changed;
    }
    setWorkspaceServerId(w.id, serverId);
    changed = true;
  }
  return changed;
}
