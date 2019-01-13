import { Node } from 'typescript';

function isWhitespace(c: string) {
  return c === ' ' || c === '\t' || c === '\r' || c === '\n';
}

export function spaceTokens(ast: Node) {
  let spacePoints = new Set<number>();
  function visit(node: Node) {
    spacePoints.add(node.getStart());
    spacePoints.add(node.getEnd());
    node.forEachChild(visit);
  }
  ast.forEachChild(visit);
  const spacePointList = Array.from(spacePoints);
  spacePointList.sort((x, y) => y - x);
  let src = ast.getFullText();
  for (const point of spacePointList) {
    if (!isWhitespace(src[point - 1]) && !isWhitespace(src[point])) {
      src = src.substr(0, point) + ' ' + src.substr(point);
    }
  }
  return src;
}
