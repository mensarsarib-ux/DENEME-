import { useEffect, useState } from "react";
import Splash from "./components/Splash";
import Dashboard from "./components/Dashboard";

// Açılış ekranı ne kadar görünsün (ms) ve çıkış animasyonunun süresi
const SPLASH_DURATION = 2200;
const SPLASH_EXIT = 400;

export default function App() {
  const [phase, setPhase] = useState<"splash" | "exiting" | "home">("splash");

  useEffect(() => {
    const exit = window.setTimeout(() => setPhase("exiting"), SPLASH_DURATION);
    const done = window.setTimeout(
      () => setPhase("home"),
      SPLASH_DURATION + SPLASH_EXIT,
    );
    return () => {
      window.clearTimeout(exit);
      window.clearTimeout(done);
    };
  }, []);

  if (phase === "home") return <Dashboard />;

  return (
    <div className={`splash-wrap ${phase === "exiting" ? "is-exiting" : ""}`}>
      <Splash />
    </div>
  );
}
