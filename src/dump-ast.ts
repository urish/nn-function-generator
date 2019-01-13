import * as ts from 'typescript';

export function dumpAstTokens(source: ts.Node) {
  let result: string[] = [];

  function dump(node: ts.Node) {
    result.push(ts.SyntaxKind[node.kind]);
    result.push('{');
    let hasChildren = false;
    for (const prop of Object.keys(node)) {
      const item = (node as any)[prop];
      if (prop === 'parent') {
        continue;
      }
      if (typeof item === 'object' && item instanceof Array) {
        result.push('.' + prop);
        result.push('[');
        item.forEach(dump);
        result.push(']');
        hasChildren = true;
      }
      if (item && item.kind) {
        result.push('.' + prop);
        dump(item);
        hasChildren = true;
      }
    }
    if (hasChildren) {
      result.push('}');
    } else {
      result.pop();
    }
  }

  dump(source);
  return result.join(' ');
}
