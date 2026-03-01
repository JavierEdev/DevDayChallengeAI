export class TextUtils {
  private static singleton: TextUtils | null = null;

  static get shared(): TextUtils {
    if (!TextUtils.singleton) {
      TextUtils.singleton = new TextUtils();
    }
    return TextUtils.singleton;
  }

  private constructor() {}

  normalizeFreeText(value: string): string {
    return value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  normalizeIdentifier(value: string): string {
    return value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  normalizeCompactKey(value: string): string {
    return value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
  }

  escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  toIsoDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  parseIsoDateFromText(value: string): string | null {
    const isoDate = value.match(/\b(\d{4}-\d{2}-\d{2})\b/)?.[1];
    if (isoDate) {
      return isoDate;
    }

    const slashDate = value.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
    if (!slashDate?.[1] || !slashDate[2] || !slashDate[3]) {
      return null;
    }

    const day = slashDate[1].padStart(2, "0");
    const month = slashDate[2].padStart(2, "0");
    return `${slashDate[3]}-${month}-${day}`;
  }

  clampText(value: string, maxChars: number): string {
    const normalized = value.trim();
    if (normalized.length <= maxChars) {
      return normalized;
    }
    return `${normalized.slice(0, Math.max(0, maxChars - 3))}...`;
  }
}
