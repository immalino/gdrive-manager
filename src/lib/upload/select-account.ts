export interface AccountCandidate {
  id: string;
  email?: string;
  freeBytes: number | null;
  isUploadEnabled?: boolean;
}

export function selectAccount<T extends AccountCandidate>(
  fileSize: number,
  accounts: T[],
): T | null {
  return (
    accounts
      .filter((a) => a.isUploadEnabled !== false && a.freeBytes != null && a.freeBytes >= fileSize)
      .sort((a, b) => (b.freeBytes ?? 0) - (a.freeBytes ?? 0))
      .at(0) ?? null
  );
}
