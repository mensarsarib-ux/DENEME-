import { useEffect, useRef, useState } from "react";
import { haptic } from "../lib/haptics";
import { t } from "../lib/i18n";

/** Çerçevenin kenarı ve dairenin çapı (px) */
const VIEW = 280;
const CIRCLE = 240;
const EDGE = (VIEW - CIRCLE) / 2;
const OUTPUT = 192;
const MAX_ZOOM = 5;

interface Pos {
  x: number;
  y: number;
}

/**
 * Profil fotoğrafını daireye yerleştirme penceresi: fotoğraf sürüklenir, iki parmakla veya
 * kaydırıcıyla büyütülür; dairenin içi son görüntüdür. "Uygula" daireyi kırpıp küçük bir görsel üretir.
 */
export default function CropSheet({
  file,
  onApply,
  onCancel,
}: {
  file: File;
  onApply: (dataUrl: string) => void;
  onCancel: () => void;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [failed, setFailed] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState<Pos>({ x: 0, y: 0 });
  const imgRef = useRef<HTMLImageElement>(null);
  const pointers = useRef(new Map<number, Pos>());
  const lastDist = useRef(0);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const minScale = natural ? CIRCLE / Math.min(natural.w, natural.h) : 1;
  const scale = minScale * zoom;

  /** Fotoğraf daireyi her zaman tamamen kaplar; kenarlardan boşluk kalmaz */
  function clamp(p: Pos, s: number): Pos {
    if (!natural) return p;
    return {
      x: Math.min(EDGE, Math.max(EDGE + CIRCLE - natural.w * s, p.x)),
      y: Math.min(EDGE, Math.max(EDGE + CIRCLE - natural.h * s, p.y)),
    };
  }

  function onLoad() {
    const img = imgRef.current;
    if (!img) return;
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    const s = CIRCLE / Math.min(w, h);
    setNatural({ w, h });
    setPos({ x: (VIEW - w * s) / 2, y: (VIEW - h * s) / 2 });
  }

  /** Dairenin ortasındaki nokta sabit kalacak şekilde yakınlaştırır */
  function changeZoom(next: number) {
    const z = Math.min(MAX_ZOOM, Math.max(1, next));
    const s2 = minScale * z;
    const u = (VIEW / 2 - pos.x) / scale;
    const v = (VIEW / 2 - pos.y) / scale;
    setZoom(z);
    setPos(clamp({ x: VIEW / 2 - u * s2, y: VIEW / 2 - v * s2 }, s2));
  }

  function down(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      lastDist.current = Math.hypot(a.x - b.x, a.y - b.y);
    }
  }

  function move(e: React.PointerEvent) {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const cur = { x: e.clientX, y: e.clientY };
    pointers.current.set(e.pointerId, cur);
    if (pointers.current.size === 1) {
      setPos((p) => clamp({ x: p.x + cur.x - prev.x, y: p.y + cur.y - prev.y }, scale));
    } else if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (lastDist.current > 0) changeZoom(zoom * (dist / lastDist.current));
      lastDist.current = dist;
    }
  }

  function up(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
    lastDist.current = 0;
  }

  function apply() {
    const img = imgRef.current;
    if (!img || !natural) return;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = OUTPUT;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setFailed(true);
      return;
    }
    const sx = (EDGE - pos.x) / scale;
    const sy = (EDGE - pos.y) / scale;
    const size = CIRCLE / scale;
    ctx.drawImage(img, sx, sy, size, size, 0, 0, OUTPUT, OUTPUT);
    haptic("success");
    onApply(canvas.toDataURL("image/png"));
  }

  return (
    <div className="action-backdrop" data-keep-keypad onClick={onCancel}>
      <div
        className="action-sheet is-centered crop-sheet"
        role="dialog"
        aria-label={t("Fotoğrafı yerleştir")}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="action-handle" aria-hidden="true" />
        <h2 className="sheet-title">{t("Fotoğrafı yerleştir")}</h2>
        <p className="sheet-note">{t("Fotoğrafı sürükleyip daireye tam ortalayın.")}</p>

        <div
          className="crop-view"
          style={{ width: VIEW, height: VIEW }}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          onWheel={(e) => changeZoom(zoom * (e.deltaY < 0 ? 1.08 : 0.92))}
        >
          {src && (
            <img
              ref={imgRef}
              src={src}
              alt=""
              draggable={false}
              onLoad={onLoad}
              onError={() => setFailed(true)}
              style={{
                width: natural?.w,
                transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
                visibility: natural ? "visible" : "hidden",
              }}
            />
          )}
          {/* İşaretleme izi: dairenin dışı karartılır, ortada artı işareti görünür */}
          <div className="crop-circle" style={{ width: CIRCLE, height: CIRCLE }} aria-hidden="true">
            <span className="crop-cross crop-cross-h" />
            <span className="crop-cross crop-cross-v" />
          </div>
        </div>

        <label className="crop-zoom">
          <span>{t("Yakınlaştır")}</span>
          <input
            type="range"
            min={1}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            onChange={(e) => changeZoom(Number(e.target.value))}
          />
        </label>

        {failed && (
          <p className="form-error" role="alert">
            {t("Bu dosya okunamadı; başka bir fotoğraf deneyin.")}
          </p>
        )}

        <button className="primary-btn" type="button" disabled={!natural || failed} onClick={apply}>
          {t("UYGULA")}
        </button>
        <button className="action-btn is-cancel" type="button" onClick={onCancel}>
          {t("Vazgeç")}
        </button>
      </div>
    </div>
  );
}
