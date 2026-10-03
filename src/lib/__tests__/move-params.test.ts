import { describe, expect, it } from 'vitest';
import { buildMoveParams } from '@/lib/files/move-params';

describe('buildMoveParams', () => {
  it('root → folder', () => {
    expect(buildMoveParams(null, 'f1')).toEqual({ addParents: 'f1', removeParents: '' });
  });
  it('antar folder', () => {
    expect(buildMoveParams('f0', 'f1')).toEqual({ addParents: 'f1', removeParents: 'f0' });
  });
  it('tujuan null → ke root', () => {
    expect(buildMoveParams('f0', null)).toEqual({ addParents: '', removeParents: 'f0' });
  });
});
