import { normalizeSignature } from './normalize-signature';

describe('normalize-signature', () => {
  it('should normalize argument names and return the original names', () => {
    expect(normalizeSignature('function f(a: string, b)')).toEqual({
      normalizedSignature: 'function f ( $arg0$ : string , $arg1$ )',
      argNames: ['a', 'b'],
    });
  });
});
