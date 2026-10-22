import type { ReactNode } from "react";
import { Svg } from "./Icon";
import { t } from "../lib/i18n";

/** Menü sayfalarının ortak başlığı: geri düğmesi, başlık ve isteğe bağlı sağ düğme */
export default function PageHeader({
  title,
  subtitle,
  icon,
  onBack,
  action,
}: {
  title: string;
  subtitle?: string;
  icon?: string;
  onBack: () => void;
  action?: ReactNode;
}) {
  return (
    <header className="cust-header">
      <button className="round-btn" aria-label={t("Geri")} onClick={onBack}>
        <Svg d="M15 5l-7 7 7 7" />
      </button>
      <div className="cust-title">
        {icon && (
          <span className="cust-avatar" aria-hidden="true">
            <Svg d={icon} />
          </span>
        )}
        <div className="cust-name">
          <strong>{title}</strong>
          {subtitle && <small>{subtitle}</small>}
        </div>
      </div>
      {action}
    </header>
  );
}
