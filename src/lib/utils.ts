import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMiles(value: number): string {
  return value.toLocaleString('pt-BR');
}

export function formatNumber(value: string | number): string {
  const num = typeof value === 'string' ? parseInt(value.replace(/\D/g, ''), 10) : value;
  if (isNaN(num)) return '0';
  return num.toLocaleString('pt-BR');
}
