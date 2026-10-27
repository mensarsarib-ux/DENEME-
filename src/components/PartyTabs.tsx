import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type PointerEvent,
} from "react";
import { haptic } from "../lib/haptics";
import { money } from "../lib/format";
import { Svg } from "./Icon";
import { t } from "../lib/i18n";

export interface TabInfo {
  id: string;
  name: string;
  count: number;
  total: number;
}

const MAX_NAME = 24;
/** Basılı tutma süresi (ms) ve bu süre boyunca izin verilen parmak kayması (px) */
const LONG_PRESS_MS = 500;
const MOVE_TOLERANCE = 8;
/** Pencere açıldıktan sonra bu süre boyunca tıklamalar yok sayılır (ms) */
const OPEN_GUARD_MS = 450;

type Dialog =
  | { type: "create" }
  | { type: "menu" | "rename" | "confirm"; tab: TabInfo };

/**
 * Müşteriler, Tedarikçiler ve kullanıcının açtığı sekmeler.
 * Dokununca sekmeye geçilir, basılı tutunca Düzenle / Sil seçenekleri açılır.
 * Satırın sonundaki + (sağa kaydırınca görünür) yeni sekme ekler.
 */
export default function PartyTabs({
  tabs,
  active,
  onSelect,
  onCreate,
  onRename,
  onDelete,
}: {
  tabs: TabInfo[];
  active: string;
  onSelect: (id: string) => void;
  /** Yeni sekme adı (doğrulanmış) ile çağrılır */
  onCreate: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}) {
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [name, setName] = useState("");
  const [pressingId, setPressingId] = useState<string | null>(null);
  const activeRef = useRef<HTMLButtonElement>(null);
  const pressTimer = useRef<number | null>(null);
  const pressOrigin = useRef({ x: 0, y: 0 });
  // Basılı tutma menüyü açtıysa, ardından gelen "click" sekmeye geçmesin
  const longPressed = useRef(false);
  // Basılı tutma menüyü açarken parmak hâlâ ekrandadır; parmak kalkınca telefonun
  // ürettiği "click" yeni açılan pencereye düşüp onu kapatmasın diye zaman tutulur
  const dialogOpenedAt = useRef(0);

  // Çok sekme olunca seçili sekme görünür alana kaydırılır
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [active]);

  // Pencereler Esc ile kapanır
  useEffect(() => {
    if (!dialog) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeDialog();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [dialog]);

  useEffect(() => cancelTimer, []);

  function cancelTimer() {
    if (pressTimer.current !== null) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  }

  /** Basılı tutma veya sağ tıkla açılan menü; açılış anı korumaya kaydedilir */
  function openMenu(tab: TabInfo) {
    dialogOpenedAt.current = Date.now();
    setDialog({ type: "menu", tab });
  }

  function startPress(event: PointerEvent, tab: TabInfo) {
    // Yeni dokunuş başlarken önceki basılı tutma işareti sıfırlanır
    longPressed.current = false;
    if (event.button !== 0) return;
    pressOrigin.current = { x: event.clientX, y: event.clientY };
    cancelTimer();
    setPressingId(tab.id);
    pressTimer.current = window.setTimeout(() => {
      pressTimer.current = null;
      longPressed.current = true;
      setPressingId(null);
      haptic("medium");
      openMenu(tab);
    }, LONG_PRESS_MS);
  }

  /** Parmak kayarsa (satır kaydırılıyorsa) basılı tutma iptal olur */
  function movePress(event: PointerEvent) {
    if (pressTimer.current === null) return;
    const { x, y } = pressOrigin.current;
    if (Math.hypot(event.clientX - x, event.clientY - y) > MOVE_TOLERANCE) {
      endPress();
    }
  }

  function endPress() {
    cancelTimer();
    setPressingId(null);
  }

  function closeDialog() {
    setDialog(null);
    setName("");
  }

  const trimmed = name.trim();
  const lower = trimmed.toLocaleLowerCase("tr-TR");
  const editingId = dialog && dialog.type === "rename" ? dialog.tab.id : null;
  // Aynı isimde başka bir sekme olamaz (düzenlenen sekmenin kendisi hariç)
  const duplicate =
    trimmed !== "" &&
    tabs.some(
      (t) =>
        t.id !== editingId && t.name.toLocaleLowerCase("tr-TR") === lower,
    );
  const canSubmit =
    trimmed !== "" &&
    !duplicate &&
    !(dialog?.type === "rename" && trimmed === dialog.tab.name);

  function submitName(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit || !dialog) return;
    if (dialog.type === "create") onCreate(trimmed);
    else if (dialog.type === "rename") onRename(dialog.tab.id, trimmed);
    closeDialog();
  }

  return (
    <>
      <div className="party-bar">
        <div className="party-tabs" role="tablist" aria-label={t("Cari hesaplar")}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              ref={tab.id === active ? activeRef : undefined}
              role="tab"
              aria-selected={active === tab.id}
              aria-haspopup="menu"
              title={t("Düzenlemek veya silmek için basılı tutun")}
              className={`party-tab ${active === tab.id ? "is-active" : ""} ${pressingId === tab.id ? "is-pressing" : ""}`}
              onPointerDown={(e) => startPress(e, tab)}
              onPointerMove={movePress}
              onPointerUp={endPress}
              onPointerLeave={endPress}
              onPointerCancel={endPress}
              onContextMenu={(e) => {
                // Sağ tık, klavyedeki menü tuşu ve bazı telefonlardaki uzun basma
                e.preventDefault();
                endPress();
                longPressed.current = true;
                haptic("medium");
                openMenu(tab);
              }}
              onClick={() => {
                if (longPressed.current) {
                  longPressed.current = false;
                  return;
                }
                haptic("light");
                onSelect(tab.id);
              }}
            >
              <span className="party-tab-label">
                <span className="party-tab-name">{t(tab.name)}</span>
                {active !== tab.id && (
                  <span className="party-chevron" aria-hidden="true">
                    ›
                  </span>
                )}
              </span>
              <span className="party-tab-meta">
                {t("{n} kayıt", { n: tab.count })} · {money.format(tab.total)}
              </span>
            </button>
          ))}
          {/* Sekme satırının sonunda: sağa kaydırınca görünür */}
          <button
            className="party-add"
            type="button"
            aria-label={t("Yeni sekme ekle")}
            onClick={() => {
              haptic("light");
              setName("");
              setDialog({ type: "create" });
            }}
          >
            +
          </button>
        </div>
      </div>

      {dialog && (
        <div
          className={`action-backdrop ${dialog.type === "create" || dialog.type === "rename" ? "is-top" : ""}`}
          onClickCapture={(e) => {
            if (Date.now() - dialogOpenedAt.current < OPEN_GUARD_MS) {
              e.stopPropagation();
              e.preventDefault();
            }
          }}
          onClick={closeDialog}
        >
          {/* Basılı tutunca açılan seçenekler */}
          {dialog.type === "menu" && (
            <div
              className="action-sheet"
              role="dialog"
              aria-label={t("Sekme seçenekleri")}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="action-handle" aria-hidden="true" />
              <div className="action-summary">
                <strong>{t(dialog.tab.name)}</strong>
                <span className="party-tab-meta">
                  {t("{n} kayıt", { n: dialog.tab.count })} · {money.format(dialog.tab.total)}
                </span>
              </div>
              <button
                className="action-btn"
                type="button"
                onClick={() => {
                  setName(dialog.tab.name);
                  setDialog({ type: "rename", tab: dialog.tab });
                }}
              >
                <Svg d="M4 20h4L19 9l-4-4L4 16zM13 7l4 4" />
                {t("Düzenle")}
              </button>
              <button
                className="action-btn is-danger"
                type="button"
                onClick={() => setDialog({ type: "confirm", tab: dialog.tab })}
              >
                <Svg d="M5 7h14M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
                {t("Sil")}
              </button>
              <button
                className="action-btn is-cancel"
                type="button"
                onClick={closeDialog}
              >
                {t("Vazgeç")}
              </button>
            </div>
          )}

          {/* Silmeden önce onay */}
          {dialog.type === "confirm" && (
            <div
              className="action-sheet"
              role="alertdialog"
              aria-label={t("Silme onayı")}
              aria-describedby="confirm-text"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="action-handle" aria-hidden="true" />
              <h2 className="sheet-title">{t("Silmek istediğinize emin misiniz?")}</h2>
              <p className="sheet-note" id="confirm-text">
                {dialog.tab.id === "customer"
                  ? t("“{name}” sekmesindeki {n} kayıt ve bu kayıtlara ait tüm işlemler silinecek. Ana ekranın parçası olduğu için sekme boş olarak kalacak. Bu işlem geri alınamaz.", { name: t(dialog.tab.name), n: dialog.tab.count })
                  : t("“{name}” sekmesi, içindeki {n} kayıt ve bu kayıtlara ait tüm işlemler silinecek. Bu işlem geri alınamaz.", { name: t(dialog.tab.name), n: dialog.tab.count })}
              </p>
              <button
                className="danger-btn"
                type="button"
                onClick={() => {
                  haptic("warning");
                  onDelete(dialog.tab.id);
                  closeDialog();
                }}
              >
                {t("EVET, SİL")}
              </button>
              <button
                className="action-btn is-cancel"
                type="button"
                autoFocus
                onClick={closeDialog}
              >
                {t("Vazgeç")}
              </button>
            </div>
          )}

          {/* Yeni sekme ve sekme adı düzenleme */}
          {(dialog.type === "create" || dialog.type === "rename") && (
            <form
              className="action-sheet"
              role="dialog"
              aria-label={dialog.type === "create" ? t("Yeni sekme") : t("Sekmeyi düzenle")}
              onClick={(e) => e.stopPropagation()}
              onSubmit={submitName}
              noValidate
            >
              <div className="action-handle" aria-hidden="true" />
              <h2 className="sheet-title">
                {dialog.type === "create" ? t("Yeni sekme") : t("Sekmeyi düzenle")}
              </h2>
              <p className="sheet-note">
                {dialog.type === "create"
                  ? t("Kendi sekmenizi adlandırın; örneğin Vergi Giderleri.")
                  : t("Sekmenin yeni adını yazın. Kayıtlar ve işlemler aynen kalır.")}
              </p>
              <div className="field">
                <label htmlFor="tab-name">{t("Sekme adı")}</label>
                <input
                  id="tab-name"
                  autoFocus
                  autoComplete="off"
                  maxLength={MAX_NAME}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  aria-invalid={duplicate ? true : undefined}
                  aria-describedby={duplicate ? "tab-error" : undefined}
                />
                {duplicate && (
                  <p className="form-error" id="tab-error" role="alert">
                    {t("Bu isimde bir sekme zaten var.")}
                  </p>
                )}
              </div>
              <button className="primary-btn" type="submit" disabled={!canSubmit}>
                {dialog.type === "create" ? t("SEKME OLUŞTUR") : t("KAYDET")}
              </button>
              <button
                className="action-btn is-cancel"
                type="button"
                onClick={closeDialog}
              >
                {t("Vazgeç")}
              </button>
            </form>
          )}
        </div>
      )}
    </>
  );
}
