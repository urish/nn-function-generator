import { tsquery } from '@phenomnomnominal/tsquery';
import { dumpAstTokens } from './dump-ast';
import { FunctionDeclaration } from 'typescript';

describe('dump-ast', () => {
  it('should convert the given source code into a list of AST tokens', () => {
    const ast = tsquery.ast(`
      function f(name, age) {
        console.log(name, age);
      }
    `);
    const fnNode = tsquery.query<FunctionDeclaration>(ast, 'FunctionDeclaration')[0];

    expect(dumpAstTokens(fnNode.body!)).toEqual(
      `Block { .statements [ ExpressionStatement { .expression CallExpression { .expression PropertyAccessExpression { .expression Identifier .name Identifier } .arguments [ Identifier Identifier ] } } ] }`,
    );
  });
});
