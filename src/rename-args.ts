import * as ts from 'typescript';
import { tsquery } from '@phenomnomnominal/tsquery';
import { applyEdits, IEditEntry } from './rename-utils';

export function virtualCompilerHost(
  sourceFile: ts.SourceFile,
  filename: string,
  compilerOptions: ts.CompilerOptions = {},
) {
  const host = ts.createCompilerHost(compilerOptions);
  const old = host.getSourceFile;
  host.getSourceFile = (name: string, target: ts.ScriptTarget, ...args: any[]) => {
    if (name === filename) {
      return sourceFile;
    }
    return old.call(host, name, target, ...args);
  };

  return host;
}

// similar to ts.transpile(), but also does type checking and throws in case of error
export function createProgram(sourceFile: ts.SourceFile, filename: string) {
  const compilerOptions = {
    target: ts.ScriptTarget.ES2015,
  };

  const host = virtualCompilerHost(sourceFile, filename, compilerOptions);
  return ts.createProgram([filename], compilerOptions, host);
}

export function renameArgs(ast: ts.SourceFile, argNames: string[] | null = null) {
  const program = createProgram(ast, 'input.ts');
  const typeChecker = program.getTypeChecker();
  const fnNode = tsquery.query<ts.FunctionDeclaration>(ast, 'FunctionDeclaration')[0];
  const identifiers = tsquery.query<ts.Identifier>(ast, 'Identifier');
  const renameList: IEditEntry[] = [];
  const params: ts.NodeArray<ts.Declaration> = fnNode.parameters;
  for (const identifier of identifiers) {
    const symbol = typeChecker.getSymbolAtLocation(identifier);
    if (symbol && symbol.getDeclarations()) {
      const argIndex = symbol
        .getDeclarations()!
        .map((node) => params.indexOf(node))
        .find((idx) => idx >= 0);
      if (argIndex != null) {
        renameList.push({
          start: identifier.getStart(),
          end: identifier.getEnd(),
          newText: argNames ? argNames[argIndex] : `$arg${argIndex}$`,
        });
      }
    }
  }

  return applyEdits(ast.getFullText(), renameList);
}
