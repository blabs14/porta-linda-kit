import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { toast as sonnerToast } from '../components/ui/sonner';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function showError(message: string) {
  sonnerToast.error(message, { duration: 5000 });
}

export function showSuccess(message: string) {
  sonnerToast.success(message, { duration: 4000 });
}
