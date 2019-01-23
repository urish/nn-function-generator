import { renameArgs } from './rename-args';
import { tsquery } from '@phenomnomnominal/tsquery';
import { FunctionDeclaration } from 'typescript';
import { spaceTokens } from './space-tokens';

export function normalizeSignature(sig: string) {
  const ast = tsquery.ast(sig);
  const fnNode = tsquery.query<FunctionDeclaration>(ast, 'FunctionDeclaration')[0];
  const args = fnNode.parameters;
  return {
    normalizedSignature: spaceTokens(tsquery.ast(renameArgs(ast))).trim(),
    argNames: args.map((n) => n.name.getText()),
  };
}
