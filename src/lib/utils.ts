import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function capitalizeWords(str: string): string {
  if (typeof str !== 'string') {
    console.error('capitalizeWords received non-string:', str);
    return '';
  }
  return str.replace(/\b\w/g, (char) => char.toUpperCase())
}
