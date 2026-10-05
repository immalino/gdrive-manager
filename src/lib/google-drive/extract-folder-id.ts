/**
 * Ekstrak folder ID dari string input, baik berupa Folder ID langsung maupun URL Google Drive.
 * Contoh yang didukung:
 * - 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptnyt
 * - https://drive.google.com/drive/folders/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptnyt
 * - https://drive.google.com/drive/u/0/folders/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptnyt?usp=sharing
 */
export function extractFolderId(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';

  // Pola URL Google Drive: .../folders/<id>
  const urlMatch = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (urlMatch && urlMatch[1]) {
    return urlMatch[1];
  }

  // Jika berupa ID langsung dengan query params (misal di-copy aneh)
  const cleanId = trimmed.split('?')[0].split('&')[0];
  return cleanId;
}
