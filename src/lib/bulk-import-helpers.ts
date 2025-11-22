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
 * Helper para parsing de datas em formato brasileiro (DD/MM/YYYY)
 * Aceita também strings vindas do Excel com hora, ex: "04/11/2025 00:00:00"
 */
export function parseBRDate(dateStr: string): Date | null {
  if (!dateStr) return null;

  const trimmed = dateStr.trim();

  // Pega o padrão dd/mm/yyyy em qualquer lugar da string
  const match = trimmed.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!match) return null;

  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);

  // Limites básicos (pode ajustar se quiser)
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
 * Valida se uma data está no formato DD/MM/YYYY (tolerando hora no fim)
 */
export function isValidBRDate(dateStr: string): boolean {
  return parseBRDate(dateStr) !== null;
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
