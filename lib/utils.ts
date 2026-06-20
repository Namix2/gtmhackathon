import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

export function truncate(text: string | null | undefined, maxLength: number): string {
  if (!text) return "—";
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}…`;
}
