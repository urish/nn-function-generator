import { loadAstTokens } from './load-ast';

describe('load-ast', () => {
  it('should correctly parse a PropertyAccessExpression token', () => {
    expect(loadAstTokens('PropertyAccessExpression { .expression Identifier .name Identifier }')).toEqual(
      'identifier.identifier',
    );
  });

  it('should correctly parse a CallExpression token', () => {
    expect(loadAstTokens('CallExpression { .expression Identifier .arguments [ Identifier ] }')).toEqual(
      'identifier(identifier)',
    );
  });

  it('should correctly parse a function body block', () => {
    expect(
      loadAstTokens(
        'Block { .statements [ ExpressionStatement { .expression CallExpression { .expression PropertyAccessExpression { .expression Identifier .name Identifier } .arguments [ Identifier Identifier ] } } ] }',
      ).replace(/\s+/g, ' '),
    ).toEqual(`{ identifier.identifier(identifier, identifier); }`);
  });
});
