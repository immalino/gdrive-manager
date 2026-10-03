export function buildContentRangeHeader(start: number, end: number, total: number): string {
  return `bytes ${start}-${end}/${total}`;
}

export function parseResumeOffset(rangeHeader: string | null): number {
  if (!rangeHeader) return 0;
  const match = rangeHeader.match(/bytes=0-(\d+)/);
  if (!match) return 0;
  return Number(match[1]) + 1;
}
