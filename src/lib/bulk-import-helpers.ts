/**
 * Helper para parsing de números em formato brasileiro (pt-BR)
 * Exemplo: "1.850,50" -> 1850.50
 */
export function parseBRNumber(value: string | number): number {
  if (typeof value === 'number') return value;
  if (!value) return 0;

  const str = String(value).trim();
  // Remove pontos de milhar e troca vírgula por ponto
  const normalized = str.replace(/\./g, '').replace(',', '.');
  const parsed = parseFloat(normalized);

  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Converte número serial do Excel em Date
 * (excel conta dias a partir de 1899-12-30)
 */
function excelSerialToDate(serial: number): Date | null {
  if (!isFinite(serial)) return null;
  const excelEpoch = new Date(Date.UTC(1899, 11, 30)); // 1899-12-30
  const millis = excelEpoch.getTime() + serial * 24 * 60 * 60 * 1000;
  const d = new Date(millis);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Normaliza string de data:
 * - remove horário (ex: "21/11/2025 00:00:00" -> "21/11/2025")
 * - converte "YYYY-MM-DD" -> "DD/MM/YYYY"
 */
function normalizeDateString(raw: string): string {
  if (!raw) return '';

  let str = raw.trim();

  // corta parte de horário se existir
  if (str.includes('T')) {
    str = str.split('T')[0];
  }
  if (str.includes(' ')) {
    str = str.split(' ')[0];
  }

  // ISO -> BR
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return `${d}/${m}/${y}`;
  }

  return str;
}

/**
 * Helper para parsing de datas em formato brasileiro
 * Aceita:
 *  - "DD/MM/YYYY"
 *  - "DD/MM/YY" (converte 25 -> 2025)
 *  - "YYYY-MM-DD"
 *  - "DD/MM/YYYY HH:MM[:SS]"
 *  - número serial do Excel (ex: 45678)
 */
export function parseBRDate(dateInput: string | number): Date | null {
  if (dateInput === null || dateInput === undefined || dateInput === '') {
    return null;
  }

  // Caso seja claramente número (serial Excel ou string numérica)
  if (
    typeof dateInput === 'number' ||
    /^[0-9]+(\.[0-9]+)?$/.test(String(dateInput).trim())
  ) {
    const serial =
      typeof dateInput === 'number'
        ? dateInput
        : parseFloat(String(dateInput).trim());
    const excelDate = excelSerialToDate(serial);
    if (excelDate) return excelDate;
  }

  let str = normalizeDateString(String(dateInput));

  // Tenta DD/MM/YYYY
  let match = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

  // Se não bater, tenta DD/MM/YY
  if (!match) {
    const short = str.match(/^(\d{2})\/(\d{2})\/(\d{2})$/);
    if (!short) return null;

    const day = short[1];
    const month = short[2];
    const yy = parseInt(short[3], 10);
    const fullYear = yy >= 50 ? 1900 + yy : 2000 + yy; // 00–49 => 2000+, 50–99 => 1900+

    match = [str, day, month, String(fullYear)] as any;
  }

  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);

  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  if (year < 2000 || year > 2100) return null;

  const date = new Date(year, month - 1, day);

  return date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
    ? date
    : null;
}

/**
 * Valida se uma data é aceitável (ver parseBRDate acima)
 */
export function isValidBRDate(dateInput: string | number): boolean {
  return parseBRDate(dateInput) !== null;
}

/**
 * Formata Date -> "YYYY-MM-DD" (para salvar no banco)
 */
export function formatDateToISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
