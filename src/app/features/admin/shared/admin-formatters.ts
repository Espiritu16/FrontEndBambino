export function formatMoney(value: number | null | undefined): string {
  const amount = Number(value ?? 0);
  return `S/ ${amount.toFixed(2)}`;
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(date);
}

export function normalizeText(value: string | number | null | undefined): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function labelFromEnum(value: string | null | undefined): string {
  if (!value) return 'Sin dato';
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function badgeClass(value: string | null | undefined): string {
  const normalized = normalizeText(value).replace(/\s+/g, '-');
  return normalized ? `badge-${normalized}` : 'badge-sin-dato';
}
