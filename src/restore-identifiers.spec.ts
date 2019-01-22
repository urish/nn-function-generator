import { tsquery } from '@phenomnomnominal/tsquery';
import { restoreIdentifiers } from './restore-identifiers';

describe('restore-identifiers', () => {
  it('should do the inverse transform of rename-identifiers', () => {
    const input = `
      function f($arg0$, $arg1$) {
        id0.id1(2, 2, '0', '3', \`2\`);
      }
    `;
    const identifiers = ['console', 'log', '50', 'hello world!'];
    expect(restoreIdentifiers(tsquery.ast(input), identifiers)).toEqual(`
      function f($arg0$, $arg1$) {
        console.log(50, 50, 'console', 'hello world!', \`50\`);
      }
    `);
  });

  it('should not change unknown literals / tokens', () => {
    const input = `
      function f($arg0$, $arg1$) {
        id0.id1(id3, 'hello', 'world', 155);
      }
    `;
    const identifiers = ['console', 'log'];
    expect(restoreIdentifiers(tsquery.ast(input), identifiers)).toEqual(`
      function f($arg0$, $arg1$) {
        console.log(id3, 'hello', 'world', 155);
      }
    `);
  });
});
