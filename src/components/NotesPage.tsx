import { useState } from "react";
import type { Note } from "../data/mock";
import { haptic } from "../lib/haptics";
import { locale, t } from "../lib/i18n";
import { MENU_ITEMS } from "../lib/menu";
import { fold } from "../lib/search";
import PageHeader from "./PageHeader";
import { Svg } from "./Icon";

const ICON = MENU_ITEMS.find((m) => m.page === "notes")!.icon;
const PIN_ICON = "M12 3l3 6 5 1-4 4 1 6-5-3-5 3 1-6-4-4 5-1z";

const dateLabel = (iso: string) =>
  new Date(iso).toLocaleDateString(locale(), { day: "numeric", month: "long", year: "numeric" });

/** Notlar: arama, ekleme, düzenleme, sabitleme ve silme */
export default function NotesPage({
  notes,
  onChange,
  onBack,
}: {
  notes: Note[];
  onChange: (notes: Note[]) => void;
  onBack: () => void;
}) {
  const [query, setQuery] = useState("");
  // null: liste, "new": yeni not, diğer: düzenlenen notun kimliği
  const [editing, setEditing] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [pinned, setPinned] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const q = fold(query.trim());
  const visible = [...notes]
    .filter((n) => !q || fold(`${n.title} ${n.text}`).includes(q))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updated.localeCompare(a.updated));

  function open(note: Note | null) {
    setEditing(note ? note.id : "new");
    setTitle(note?.title ?? "");
    setText(note?.text ?? "");
    setPinned(note?.pinned ?? false);
    setConfirmDelete(false);
  }

  /** Not düzenleyiciden çıkarken değişiklik varsa kaydedilir; boş yeni not atılır */
  function closeEditor() {
    const hasContent = title.trim() !== "" || text.trim() !== "";
    if (editing === "new") {
      if (hasContent) {
        haptic("success");
        onChange([
          ...notes,
          { id: `n${Date.now()}`, title: title.trim(), text: text.trim(), pinned, updated: new Date().toISOString() },
        ]);
      }
    } else if (editing) {
      const current = notes.find((n) => n.id === editing);
      const changed =
        current && (current.title !== title.trim() || current.text !== text.trim() || current.pinned !== pinned);
      if (current && changed) {
        haptic("success");
        onChange(
          notes.map((n) =>
            n.id === editing
              ? { ...n, title: title.trim(), text: text.trim(), pinned, updated: new Date().toISOString() }
              : n,
          ),
        );
      }
    }
    setEditing(null);
  }

  function remove() {
    haptic("warning");
    onChange(notes.filter((n) => n.id !== editing));
    setEditing(null);
  }

  if (editing !== null) {
    return (
      <div className="cust-page">
        <PageHeader
          title={editing === "new" ? t("Yeni not") : t("Notu düzenle")}
          subtitle={t("Geri dönünce otomatik kaydedilir")}
          icon={ICON}
          onBack={closeEditor}
          action={
            editing !== "new" ? (
              <button className="header-danger" type="button" onClick={() => setConfirmDelete(true)}>
                {t("SİL")}
              </button>
            ) : undefined
          }
        />
        <div className="form">
          <div className="field">
            <label htmlFor="note-title">{t("Başlık")}</label>
            <input id="note-title" autoFocus={editing === "new"} autoComplete="off" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="note-text">{t("Not")}</label>
            <textarea id="note-text" rows={10} value={text} onChange={(e) => setText(e.target.value)} />
          </div>
          <button
            type="button"
            className={`action-btn ${pinned ? "is-active" : ""}`}
            aria-pressed={pinned}
            onClick={() => {
              haptic("light");
              setPinned((p) => !p);
            }}
          >
            <Svg d={PIN_ICON} />
            {pinned ? t("Üste sabitlendi") : t("Üste sabitle")}
          </button>
        </div>

        {confirmDelete && (
          <div className="action-backdrop" onClick={() => setConfirmDelete(false)}>
            <div className="action-sheet is-centered" role="alertdialog" aria-label={t("Silme onayı")} onClick={(e) => e.stopPropagation()}>
              <div className="action-handle" aria-hidden="true" />
              <h2 className="sheet-title">{t("Bu notu silmek istediğinize emin misiniz?")}</h2>
              <p className="sheet-note">{t("Silinen not geri alınamaz.")}</p>
              <button className="danger-btn" type="button" onClick={remove}>{t("EVET, SİL")}</button>
              <button className="action-btn is-cancel" type="button" autoFocus onClick={() => setConfirmDelete(false)}>{t("Vazgeç")}</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="cust-page">
      <PageHeader
        title={t("Notlar")}
        subtitle={t("{n} not", { n: notes.length })}
        icon={ICON}
        onBack={onBack}
        action={
          <button className="header-add" type="button" aria-label={t("Yeni not")} onClick={() => open(null)}>
            {t("+ YENİ")}
          </button>
        }
      />
      <div className="search-bar">
        <input
          type="search"
          aria-label={t("Notlarda ara")}
          placeholder={t("Notlarda ara")}
          autoComplete="off"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {visible.length === 0 ? (
        <div className="search-empty">
          <p>{notes.length === 0 ? t("Henüz not yok.") : t("“{query}” ile eşleşen not yok.", { query: query.trim() })}</p>
          <button type="button" className="help-link" onClick={() => open(null)}>{t("Yeni not ekle")}</button>
        </div>
      ) : (
        <ul className="list">
          {visible.map((n) => (
            <li key={n.id}>
              <button type="button" className="note-row" onClick={() => open(n)}>
                <span className="note-top">
                  <strong>{n.title || t("Başlıksız not")}</strong>
                  {n.pinned && (
                    <span className="note-pin" aria-label={t("Sabitlenmiş")}>
                      <Svg d={PIN_ICON} />
                    </span>
                  )}
                </span>
                {n.text && <span className="note-text">{n.text}</span>}
                <span className="note-date">{dateLabel(n.updated)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
