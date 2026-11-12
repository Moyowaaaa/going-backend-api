import { randomUUID } from 'crypto';

export function generateEventSlug(
  title: string,
  startDate: Date,
): string {
  const year = startDate.getFullYear();

  const slug = title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const uniqueSuffix = randomUUID().replace(/-/g, '').slice(0, 6);

  return `${slug}-${year}-${uniqueSuffix}`;
}