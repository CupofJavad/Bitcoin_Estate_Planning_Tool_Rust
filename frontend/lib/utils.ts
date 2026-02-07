import { type ClassValue, clsx } from 'clsx'
import { format } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function formatDate(dateString: string): string {
  try {
    return format(new Date(dateString), 'MMM d, yyyy')
  } catch {
    return dateString
  }
}

export function formatDateTime(dateString: string): string {
  try {
    return format(new Date(dateString), 'MMM d, yyyy h:mm a')
  } catch {
    return dateString
  }
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text)
}

