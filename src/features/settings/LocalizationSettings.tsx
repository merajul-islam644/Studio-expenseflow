// Localization admin screen — read-only list of available languages and
// the default one. The actual localization provider (which lists and
// renders languages) handles switching at runtime; this screen is the
// admin's view of what's configured.
import { useQuery } from "@tanstack/react-query";
import { blocksClient } from "../../lib/blocks/client";
import { useT } from "../../lib/i18n/LocalizationProvider";

type Language = {
  code: string;
  name: string;
  isDefault: boolean;
};

export function LocalizationSettings() {
  const { t } = useT();
  const query = useQuery({
    queryKey: ["localization", "languages"],
    queryFn: async () => {
      const response = await blocksClient.localization.languages();
      const record = response as Array<Record<string, unknown>> | { data?: Array<Record<string, unknown>> };
      const items = Array.isArray(record) ? record : (record.data ?? []);
      return items.map((entry) => ({
        code: String(entry.languageCode ?? entry.code ?? entry.culture ?? "en"),
        name: String(entry.languageName ?? entry.displayName ?? entry.name ?? "English"),
        isDefault: Boolean(entry.isDefault)
      })) as Language[];
    },
    staleTime: 60_000
  });

  const languages = query.data ?? [];
  const defaultLang = languages.find((l) => l.isDefault);

  return (
    <div className="section-card">
      <h3>Localization</h3>
      <p className="section-subtitle">Default language and supported languages for ExpenseFlow.</p>
      <div className="form-grid">
        <div className="form-field">
          <span>{t("settings.localization.defaultLanguage")}</span>
          <input value={defaultLang ? `${defaultLang.name} (${defaultLang.code})` : "English (en)"} readOnly />
        </div>
      </div>
      <div className="table-shell">
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Default</th>
            </tr>
          </thead>
          <tbody>
            {languages.length === 0 ? (
              <tr><td colSpan={3} className="muted">Only English (en) is configured.</td></tr>
            ) : null}
            {languages.map((lang) => (
              <tr key={lang.code}>
                <td data-label="Code"><strong>{lang.code}</strong></td>
                <td data-label="Name">{lang.name}</td>
                <td data-label="Default">{lang.isDefault ? "✓" : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
