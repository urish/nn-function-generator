import { tsquery } from '@phenomnomnominal/tsquery';
import { stripComments } from './strip-comments';

describe('strip-comments', () => {
  it('should space the tokens', () => {
    const ast = tsquery.ast(`let i = 5 /* magic number */ + 42/* meaning of the universe? */;`);
    expect(stripComments(ast)).toEqual(`let i = 5  + 42;`);
  });
});
