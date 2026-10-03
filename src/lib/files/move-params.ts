export function buildMoveParams(fromParentId: string | null, toParentId: string | null) {
  return {
    addParents: toParentId ?? '',
    removeParents: fromParentId ?? '',
  };
}
