import type { MatchRange } from "../lib/search";

/** Eşleşen kısmı vurgulayarak yazar */
export default function Highlight({
  text,
  range,
}: {
  text: string;
  range: MatchRange | null;
}) {
  if (!range) return <>{text}</>;
  const [start, end] = range;
  return (
    <>
      {text.slice(0, start)}
      <mark>{text.slice(start, end)}</mark>
      {text.slice(end)}
    </>
  );
}
