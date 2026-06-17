import { buildMovePreview } from './gameClientStore';

const BOARD = {
  targetNumber: 7,
  version: 1,
  innerTokens: [
    { id: 'i1', value: 3, zone: 'inner' },
    { id: 'i2', value: 4, zone: 'inner' },
  ],
  outerTokens: [
    { id: 'o1', value: 7, zone: 'outer' },
    { id: 'o2', value: 3, zone: 'outer' },
    { id: 'o3', value: 4, zone: 'outer' },
  ],
};

describe('buildMovePreview', () => {
  test('empty selection returns correct defaults for target', () => {
    const result = buildMovePreview(BOARD, []);
    expect(result.sum).toBe(0);
    expect(result.isValid).toBe(false);
    expect(result.includesInner).toBe(false);
    expect(result.achievedMultiple).toBeNull();
    // nextMultiples should list first 4 multiples of target
    expect(result.nextMultiples).toEqual([7, 14, 21, 28]);
  });

  test('null board returns safe defaults', () => {
    const result = buildMovePreview(null, []);
    expect(result.sum).toBe(0);
    expect(result.isValid).toBe(false);
    expect(result.nextMultiples).toEqual([]);
  });

  test('single inner token matching target is a valid break', () => {
    // i1(3)+o3(4)=7 → valid, achievedMultiple=1
    const result = buildMovePreview(BOARD, ['i1', 'o3']);
    expect(result.sum).toBe(7);
    expect(result.isValid).toBe(true);
    expect(result.includesInner).toBe(true);
    expect(result.achievedMultiple).toBe(1);
    // next multiples after sum=7 (1x): 14, 21, 28, 35
    expect(result.nextMultiples).toEqual([14, 21, 28, 35]);
  });

  test('double-target sum returns achievedMultiple=2 and correct nextMultiples', () => {
    // i2(4)+o1(7)+o2(3)=14 → valid, achievedMultiple=2
    const result = buildMovePreview(BOARD, ['i2', 'o1', 'o2']);
    expect(result.sum).toBe(14);
    expect(result.isValid).toBe(true);
    expect(result.achievedMultiple).toBe(2);
    expect(result.nextMultiples).toEqual([21, 28, 35, 42]);
  });

  test('outer-only selection is invalid and has no achievedMultiple', () => {
    const result = buildMovePreview(BOARD, ['o1', 'o2']);
    expect(result.sum).toBe(10);
    expect(result.isValid).toBe(false);
    expect(result.includesInner).toBe(false);
    expect(result.achievedMultiple).toBeNull();
  });

  test('non-multiple sum with inner token is invalid', () => {
    // i1(3) alone: sum=3, not multiple of 7
    const result = buildMovePreview(BOARD, ['i1']);
    expect(result.sum).toBe(3);
    expect(result.isValid).toBe(false);
    expect(result.achievedMultiple).toBeNull();
    expect(result.nearestMultiple).toBe(7);
    // nextMultiples should start from nearest multiple (7)
    expect(result.nextMultiples).toEqual([7, 14, 21, 28]);
  });

  test('target 1 produces multiples 1, 2, 3, 4 from empty selection', () => {
    const board1 = {
      targetNumber: 1,
      version: 1,
      innerTokens: [{ id: 'i', value: 1, zone: 'inner' }],
      outerTokens: [],
    };
    const result = buildMovePreview(board1, []);
    expect(result.nextMultiples).toEqual([1, 2, 3, 4]);
  });

  test('target 9 produces multiples 9, 18, 27, 36 from empty selection', () => {
    const board9 = {
      targetNumber: 9,
      version: 1,
      innerTokens: [{ id: 'i', value: 9, zone: 'inner' }],
      outerTokens: [],
    };
    const result = buildMovePreview(board9, []);
    expect(result.nextMultiples).toEqual([9, 18, 27, 36]);
  });

  test('unknown token ids in selection are safely skipped', () => {
    const result = buildMovePreview(BOARD, ['unknown-id', 'i1']);
    expect(result.sum).toBe(3); // only i1 counted
    expect(result.includesInner).toBe(true);
  });
});
