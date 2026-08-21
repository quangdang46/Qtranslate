import { PROVIDER_ICONS } from "@/domain/providers";
import "../styles/providerToolbar.css";

interface ProviderToolbarProps {
  activeKey: string;
  onSelect: (key: string) => void;
}

/**
 * Row of provider badges, shared by the popup and the main translator form.
 * Only providers backed by a real TranslationProvider are clickable; the
 * rest render disabled to visually match the classic QTranslate icon row.
 */
export function ProviderToolbar({ activeKey, onSelect }: ProviderToolbarProps) {
  return (
    <div className="provider-toolbar">
      {PROVIDER_ICONS.map((provider) => (
        <button
          key={provider.key}
          type="button"
          className={
            "provider-icon" +
            (provider.key === activeKey ? " provider-icon-active" : "") +
            (provider.enabled ? "" : " provider-icon-disabled")
          }
          style={{ background: provider.color }}
          disabled={!provider.enabled}
          title={provider.enabled ? provider.label : `${provider.label} (Coming soon)`}
          onClick={() => onSelect(provider.key)}
        >
          {provider.initials}
        </button>
      ))}
    </div>
  );
}
