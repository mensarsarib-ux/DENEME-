import {
  Children,
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";

/**
 * Yana kaydırılan grafik geçidi. Kaydırdıkça grafikler opaklık geçişiyle soluklaşıp
 * yerini bir sonrakine bırakır; alttaki noktalar hangi grafikte olunduğunu gösterir.
 */
export default function ChartCarousel({
  labels,
  children,
}: {
  /** Her grafiğin adı (erişilebilirlik için nokta etiketleri) */
  labels: string[];
  children: ReactNode;
}) {
  const slides = Children.toArray(children);
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  /** Kaydırma konumuna göre her grafiğin opaklığını ve etkin noktayı günceller */
  const update = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const position = track.scrollLeft / (track.clientWidth || 1);
    Array.from(track.children).forEach((el, i) => {
      const distance = Math.abs(position - i);
      (el as HTMLElement).style.opacity = String(
        Math.max(0, 1 - distance * 1.2),
      );
    });
    const next = Math.round(position);
    setIndex((prev) => (prev === next ? prev : next));
  }, []);

  useEffect(() => {
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [update, slides.length]);

  function goTo(i: number) {
    const track = trackRef.current;
    if (!track) return;
    const target = Math.min(Math.max(i, 0), slides.length - 1);
    track.scrollTo({ left: target * track.clientWidth, behavior: "smooth" });
  }

  function onKeyDown(event: KeyboardEvent) {
    // Alanlara yazarken oklar kaydırmasın
    if ((event.target as HTMLElement).closest("input, textarea, select")) return;
    if (event.key === "ArrowRight") goTo(index + 1);
    if (event.key === "ArrowLeft") goTo(index - 1);
  }

  return (
    <div className="carousel">
      <div
        className="carousel-track"
        ref={trackRef}
        onScroll={update}
        onKeyDown={onKeyDown}
        role="group"
        aria-roledescription="carousel"
        aria-label="Grafikler"
        tabIndex={0}
      >
        {slides.map((slide, i) => (
          <div
            key={i}
            className="carousel-slide"
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} / ${slides.length}: ${labels[i] ?? ""}`}
          >
            {slide}
          </div>
        ))}
      </div>

      {slides.length > 1 && (
        <div className="carousel-dots">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              className={`carousel-dot ${i === index ? "is-active" : ""}`}
              aria-label={labels[i] ?? `Grafik ${i + 1}`}
              aria-current={i === index ? "true" : undefined}
              onClick={() => goTo(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
