import * as ts from 'typescript';

interface IParsedToken {
  kind: string;
  [key: string]: IParsedToken | string | IParsedToken[];
}

function buildAst(node: IParsedToken): ts.Node | ts.Expression {
  const nodeAny = node as any;
  switch (node.kind) {
    case 'Block':
      return ts.createBlock(nodeAny.statements.map(buildAst));
    case 'CallExpression':
      return ts.createCall(buildAst(nodeAny.expression) as any, [], nodeAny.arguments.map(buildAst));
    case 'ExpressionStatement':
      return ts.createExpressionStatement(buildAst(nodeAny.expression) as any);
    case 'Identifier':
      return ts.createIdentifier('identifier');
    case 'PropertyAccessExpression':
      return ts.createPropertyAccess(buildAst(nodeAny.expression) as any, buildAst(nodeAny.name) as any);
    default:
      throw new Error(`Invalid node kind: ${node.kind}`);
  }
}

export function loadAstTokens(tokens: string) {
  const tokensJson = tokens
    .replace(/ {/g, '{')
    .replace(/\.[a-z][A-Za-z]+/g, (n) => `"${n.substr(1)}":`)
    .replace(/([A-Z][A-Za-z]+) /g, (_, n) => `{"kind": "${n}"},`)
    .replace(/([A-Z][A-Za-z]+)\{/g, (_, n) => `{"kind": "${n}", `)
    .replace(/}/g, '},')
    .replace(/ }/g, '}')
    .replace(/ ]/g, ']')
    .replace(/,+/g, ',')
    .replace(/,\}/g, '}')
    .replace(/,\]/g, ']')
    .replace(/,+$/g, '');
  const tokenTree = JSON.parse(tokensJson) as IParsedToken;

  const ast = buildAst(tokenTree);
  const src = ts.createSourceFile('test.ts', '', ts.ScriptTarget.ES2018, false);
  return ts.createPrinter().printNode(ts.EmitHint.Unspecified, ast, src);
}
