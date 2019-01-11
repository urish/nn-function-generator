-- Finds and extracts all JS functions in the bigtsquery dataset

CREATE TEMPORARY FUNCTION getResults(src STRING, query STRING)
RETURNS ARRAY<STRING>
LANGUAGE js AS """ 
  const { tsquery } = this.tsquery;
  function processResult(node) {
    const sourceFile = node.getSourceFile();
    const sourceCode = sourceFile.getFullText();
    const { line, character } = ts.getLineAndCharacterOfPosition(
      sourceFile,
      node.getStart(),
    );
    return JSON.stringify({ line, character, text: node.getText() });
  }
  try {
    const sourceFile = tsquery.ast(src);
    const results = tsquery(sourceFile, query);
    return results.map(processResult);
  } catch (err) {
    return [];
  }
"""
OPTIONS (
  library="gs://bigtsquery/tsquery-2.0.0-beta.4.umd.min.js"
);

SELECT
  id,
  paths,
  JSON_EXTRACT_SCALAR(match, "$.line") as line,
  JSON_EXTRACT_SCALAR(match, "$.character") as character,
  JSON_EXTRACT_SCALAR(match, "$.text") as text
FROM
  typescript.tscontents_fast,
  UNNEST(getResults(content, 'FunctionDeclaration:has(Block>*)')) AS match
