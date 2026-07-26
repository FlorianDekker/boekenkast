// Deterministische covertint (cover--c1 … cover--c6) op basis van een seed
// (ISBN of id), zodat een boek zonder afbeelding altijd dezelfde rugkleur houdt.
export function coverTint(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return `cover--c${(Math.abs(hash) % 6) + 1}`;
}

// Google's "geen afbeelding beschikbaar"-placeholder is exact 128×170px.
// Behandel dat (en 1×1-pixels) als een ongeldige cover.
export function isPlaceholderImage(img: HTMLImageElement): boolean {
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  if (w <= 1 || h <= 1) return true;
  return w === 128 && h === 170;
}

// Achternaam in kapitalen voor het label op de fallback-cover.
export function lastNameOf(author?: string): string {
  if (!author) return '';
  const parts = author.trim().split(/\s+/);
  return (parts[parts.length - 1] || '').toUpperCase();
}
