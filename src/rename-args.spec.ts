import { tsquery } from "@phenomnomnominal/tsquery";
import { renameArgs } from "./rename-args";

describe('renameArgs', () => {
  it('should rename all function arguments and their references to $arg0$, $arg1$, etc.', () => {
    const ast = tsquery.ast(`
      function f(name, age) {
        console.log(name, age);
      }
    `);

    expect(renameArgs(ast)).toEqual(`
      function f($arg0$, $arg1$) {
        console.log($arg0$, $arg1$);
      }
    `)
  });
});
