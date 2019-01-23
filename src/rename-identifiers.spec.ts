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

    expect(renameIdentifiers(ast)).toEqual({
      result: `
      function f($arg0$, $arg1$) {
        id0.id1($arg0$, $arg1$);
        id0.id1(id2.id3, id2.id4);
      }
    `,
      identifiers: ['console', 'log', 'window', 'location', 'name'],
      types: ['identifier', 'identifier', 'identifier', 'identifier', 'identifier'],
    });
  });

  it('should rename all the string literals in the given code', () => {
    const ast = tsquery.ast(`
      function f($arg0$, $arg1$) {
        console.log('hello', 'world', 'hello', 'more', \`hello\`);
      }
    `);

    expect(renameIdentifiers(ast)).toEqual({
      result: `
      function f($arg0$, $arg1$) {
        id0.id1('2', '3', '2', '4', \`2\`);
      }
    `,
      identifiers: ['console', 'log', 'hello', 'world', 'more'],
      types: ['identifier', 'identifier', 'string', 'string', 'string'],
    });
  });

  it('should rename all the numeric literals in the given code', () => {
    const ast = tsquery.ast(`
      function f($arg0$, $arg1$) {
        console.log(10, 0x20, 080, 0b1111, '10');
      }
    `);

    expect(renameIdentifiers(ast)).toEqual({
      result: `
      function f($arg0$, $arg1$) {
        id0.id1(2, 3, 4, 5, '2');
      }
    `,
      identifiers: ['console', 'log', '10', '32', '80', '15'],
      types: ['identifier', 'identifier', 'number', 'number', 'number', 'number'],
    });
  });
});
