/**
 * Helper para parsing de números em formato brasileiro (pt-BR)
 * Exemplo: "1.850,50" -> 1850.50
 */
export function parseBRNumber(value: string | number): number {
  if (typeof value === "number") return value;
  if (!value) return 0;

  const str = String(value).trim();
  // Remove pontos de milhar e troca vírgula por ponto
  const normalized = str.replace(/\./g, "").replace(",", ".");
  const parsed = parseFloat(normalized);

  return isNaN(parsed) ? 0 : parsed;
}

type DateInput = string | number | Date | null | undefined;

/**
 * Converte vários formatos de data usados pelo Excel para um Date válido.
 * Aceita:
 *  - "DD/MM/YYYY"
 *  - "DD/MM/YYYY HH:MM[:SS]"
 *  - "YYYY-MM-DD"
 *  - "YYYY-MM-DDTHH:MM:SS..."
 *  - Número serial do Excel (ex.: 45876)
 *  - Objeto Date
 */
export function parseBRDate(value: DateInput): Date | null {
  if (value === null || value === undefined || value === "") return null;

  // Se já for Date, só valida
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return null;
    return value;
  }

  const raw = String(value).trim();
  if (!raw) return null;

  // Se vier algo como "21/11/2025 00:00" -> pega só a parte da data
  const firstPart = raw.split(" ")[0];

  // 1) Formato BR: DD/MM/YYYY
  const brMatch = firstPart.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brMatch) {
    const day = parseInt(brMatch[1], 10);
    const month = parseInt(brMatch[2], 10);
    const year = parseInt(brMatch[3], 10);

    if (month < 1 || month > 12) return null;
    if (day < 1 || day > 31) return null;
    // deixa mais amplo: 2000–2100
    if (year < 2000 || year > 2100) return null;

    const d = new Date(year, month - 1, day);
    return d.getFullYear() === year &&
      d.getMonth() === month - 1 &&
      d.getDate() === day
      ? d
      : null;
  }

  // 2) Formato ISO/americano: YYYY-MM-DD ou YYYY-MM-DDTHH:MM:SS
  const isoMatch = firstPart.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10);
    const day = parseInt(isoMatch[3], 10);

    if (month < 1 || month > 12) return null;
    if (day < 1 || day > 31) return null;
    if (year < 2000 || year > 2100) return null;

    const d = new Date(year, month - 1, day);
    return d.getFullYear() === year &&
      d.getMonth() === month - 1 &&
      d.getDate() === day
      ? d
      : null;
  }

  // 3) Possível número serial do Excel (ex.: 45876)
  const asNumber = Number(raw);
  if (!isNaN(asNumber) && isFinite(asNumber) && asNumber > 30000 && asNumber < 60000) {
    // Excel usa base 1899-12-30 (considerando o bug de 1900)
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const ms = excelEpoch.getTime() + asNumber * 24 * 60 * 60 * 1000;
    const d = new Date(ms);
    if (isNaN(d.getTime())) return null;
    return d;
  }

  // Tenta um parse padrão por último (casos como "2025-11-21T00:00:00.000Z")
  const fallback = new Date(raw);
  if (!isNaN(fallback.getTime())) {
    return fallback;
  }

  return null;
}

/**
 * Valida se uma data é reconhecida por parseBRDate
 */
export function isValidBRDate(value: DateInput): boolean {
  return parseBRDate(value) !== null;
}

/**
 * Formata Date para string ISO (YYYY-MM-DD)
 */
export function formatDateToISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
