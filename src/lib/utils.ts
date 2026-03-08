import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs: ClassValue[]): string => twMerge(clsx(inputs));

export const nowIso = (): string => new Date().toISOString();

export const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

export const decimalToNumber = (value: unknown): number => Number(value ?? 0);
