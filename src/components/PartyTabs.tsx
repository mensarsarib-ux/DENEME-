import { useEffect, useRef, useState, type FormEvent } from "react";
import { money } from "../lib/format";

export interface TabInfo {
  id: string;
  name: string;
  count: number;
  total: number;
}

const MAX_NAME = 24;

/** Müşteriler, Tedarikçiler ve kullanıcının açtığı sekmeler; sağdaki + ile yeni sekme eklenir */
export default function PartyTabs({
  tabs,
  active,
  onSelect,
  onCreate,
}: {
  tabs: TabInfo[];
  active: string;
  onSelect: (id: string) => void;
  /** Yeni sekme adı (doğrulanmış) ile çağrılır */
  onCreate: (name: string) => void;
}) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const activeRef = useRef<HTMLButtonElement>(null);

  // Çok sekme olunca seçili sekme görünür alana kaydırılır
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [active]);

  useEffect(() => {
    if (!creating) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [creating]);

  const trimmed = name.trim();
  const lower = trimmed.toLocaleLowerCase("tr-TR");
  const duplicate =
    trimmed !== "" &&
    tabs.some((t) => t.name.toLocaleLowerCase("tr-TR") === lower);
  const canCreate = trimmed !== "" && !duplicate;

  function close() {
    setCreating(false);
    setName("");
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!canCreate) return;
    onCreate(trimmed);
    close();
  }

  return (
    <>
      <div className="party-bar">
        <div className="party-tabs" role="tablist" aria-label="Cari hesaplar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              ref={tab.id === active ? activeRef : undefined}
              role="tab"
              aria-selected={active === tab.id}
              className={`party-tab ${active === tab.id ? "is-active" : ""}`}
              onClick={() => onSelect(tab.id)}
            >
              <span className="party-tab-label">
                <span className="party-tab-name">{tab.name}</span>
                {active !== tab.id && (
                  <span className="party-chevron" aria-hidden="true">
                    ›
                  </span>
                )}
              </span>
              <span className="party-tab-meta">
                {tab.count} kayıt · {money.format(tab.total)}
              </span>
            </button>
          ))}
          {/* Sekme satırının sonunda: sağa kaydırınca görünür */}
          <button
            className="party-add"
            type="button"
            aria-label="Yeni sekme ekle"
            onClick={() => setCreating(true)}
          >
            +
          </button>
        </div>
      </div>

      {creating && (
        <div className="action-backdrop" onClick={close}>
          <form
            className="action-sheet"
            role="dialog"
            aria-label="Yeni sekme"
            onClick={(e) => e.stopPropagation()}
            onSubmit={submit}
            noValidate
          >
            <div className="action-handle" aria-hidden="true" />
            <h2 className="sheet-title">Yeni sekme</h2>
            <p className="sheet-note">
              Kendi sekmenizi adlandırın; örneğin Vergi Giderleri.
            </p>
            <div className="field">
              <label htmlFor="tab-name">Sekme adı</label>
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
                  Bu isimde bir sekme zaten var.
                </p>
              )}
            </div>
            <button className="primary-btn" type="submit" disabled={!canCreate}>
              SEKME OLUŞTUR
            </button>
            <button className="action-btn is-cancel" type="button" onClick={close}>
              Vazgeç
            </button>
          </form>
        </div>
      )}
    </>
  );
}
