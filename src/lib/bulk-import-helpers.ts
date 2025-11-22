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
 * Converte número de série do Excel em Date
 * Excel conta dias a partir de 1899-12-30
 */
function parseExcelSerialDate(serial: number): Date | null {
  if (!isFinite(serial)) return null;
  const excelEpoch = new Date(1899, 11, 30); // 1899-12-30
  const msPerDay = 24 * 60 * 60 * 1000;
  const date = new Date(excelEpoch.getTime() + serial * msPerDay);
  if (isNaN(date.getTime())) return null;
  return date;
}

/**
 * Helper para parsing de datas em formato flexível:
 * - "DD/MM/YYYY" ou "D/M/YYYY"
 * - "YYYY-MM-DD"
 * - número de série do Excel (ex.: 45678)
 * - string numérica com 4–5 dígitos vinda do Excel
 */
export function parseBRDate(value: string | number): Date | null {
  if (value === null || value === undefined) return null;

  // Número direto (serial Excel)
  if (typeof value === 'number') {
    return parseExcelSerialDate(value);
  }

  const dateStr = String(value).trim();

  if (!dateStr) return null;

  // String numérica que aparenta ser serial de Excel
  if (/^\d{4,5}$/.test(dateStr)) {
    const serial = parseInt(dateStr, 10);
    const fromSerial = parseExcelSerialDate(serial);
    if (fromSerial) return fromSerial;
  }

  // Formato DD/MM/YYYY ou D/M/YYYY
  let m = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const day = parseInt(m[1], 10);
    const month = parseInt(m[2], 10);
    const year = parseInt(m[3], 10);

    if (year < 2020 || year > 2100) return null;
    const d = new Date(year, month - 1, day);
    if (
      d.getFullYear() === year &&
      d.getMonth() === month - 1 &&
      d.getDate() === day
    ) {
      return d;
    }
    return null;
  }

  // Formato ISO YYYY-MM-DD
  m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) {
    const year = parseInt(m[1], 10);
    const month = parseInt(m[2], 10);
    const day = parseInt(m[3], 10);

    if (year < 2020 || year > 2100) return null;
    const d = new Date(year, month - 1, day);
    if (
      d.getFullYear() === year &&
      d.getMonth() === month - 1 &&
      d.getDate() === day
    ) {
      return d;
    }
    return null;
  }

  // Não reconheceu
  return null;
}

/**
 * Valida se uma data é válida (aceita os formatos acima)
 */
export function isValidBRDate(value: string | number): boolean {
  return parseBRDate(value) !== null;
}

/**
 * Formata data para ISO string (YYYY-MM-DD)
 */
export function formatDateToISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
