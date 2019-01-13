import { tsquery } from '@phenomnomnominal/tsquery';
import { renameIdentifiers } from './rename-identifiers';

describe('rename-identifiers', () => {
  it('should rename all the identifiers in the given code', () => {
    const ast = tsquery.ast(`
    function f($arg0$, $arg1$) {
      console.log($arg0$, $arg1$);
      console.log(window.location, window.name);
    }
  `);

    expect(renameIdentifiers(ast)).toEqual(`
    function f($arg0$, $arg1$) {
      id0.id1($arg0$, $arg1$);
      id0.id1(id2.id3, id2.id4);
    }
  `);
  });
});
