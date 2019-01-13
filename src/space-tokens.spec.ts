import { tsquery } from '@phenomnomnominal/tsquery';
import { spaceTokens } from './space-tokens';

describe('space-tokens', () => {
  it('should space the tokens', () => {
    const ast = tsquery.ast(`{ return $arg0$.id0.id1(id2.id3('4'))[$arg1$].id5; }`);
    expect(spaceTokens(ast)).toEqual(` { return $arg0$ . id0 . id1 ( id2 . id3 ( '4' ) ) [ $arg1$ ] . id5 ; } `);
  });
});
