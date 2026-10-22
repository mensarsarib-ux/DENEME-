/** İşletme logosu: yuvarlak; fotoğraf yoksa firma adının baş harfleri gösterilir */
export default function CompanyLogo({
  logo,
  name,
  size = 36,
}: {
  logo?: string;
  name: string;
  size?: number;
}) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toLocaleUpperCase("tr-TR");
  return (
    <span
      className={`company-logo ${logo ? "has-photo" : ""}`}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      aria-hidden="true"
    >
      {logo ? <img src={logo} alt="" /> : initials || "H"}
    </span>
  );
}
