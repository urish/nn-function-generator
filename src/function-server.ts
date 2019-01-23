import { tsquery } from '@phenomnomnominal/tsquery';
import axios from 'axios';
import * as express from 'express';
import { normalizeSignature } from './normalize-signature';
import { renameArgs } from './rename-args';
import { join } from 'path';
import * as prettier from 'prettier';
import { renameIdentifiers, IdentifierType } from './rename-identifiers';
import { restoreIdentifiers } from './restore-identifiers';

const app = express();

const port = 3003;

app.use(express.static(join(__dirname, 'web')));

const identifierDataset = require('../data/identifiers.json') as string[];
const allStrings = identifierDataset;
const allNumbers = identifierDataset.filter((x) => !isNaN(x as any));
const allIdentifiers = identifierDataset.filter((x) => /^[$A-Z_][0-9A-Z_$]*$/i.test(x));

function pick<T>(arr: Array<T>) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickIdentifier(type: IdentifierType) {
  switch (type) {
    case 'string':
      return pick(allStrings);
    case 'number':
      return pick(allNumbers);
    case 'identifier':
      return pick(allIdentifiers);
  }
}

function tryFormat(src: string) {
  try {
    return prettier.format(src, {
      singleQuote: true,
      parser: 'typescript',
    });
  } catch (err) {
    return src;
  }
}

app.get('/predict', async (req, res) => {
  const signature = req.query.signature as string;
  try {
    const { normalizedSignature, argNames } = normalizeSignature(signature);
    const resp = await axios.get('http://localhost:5000/', { params: { signature: normalizedSignature } });
    const abstractResult = resp.data.replace(/^START /, normalizedSignature).replace(/ END$/, '');
    const { types, result: renameIdentifiersResult } = renameIdentifiers(tsquery.ast(abstractResult));
    const identifiers = types.map(pickIdentifier);
    const result = tryFormat(
      renameArgs(tsquery.ast(restoreIdentifiers(tsquery.ast(renameIdentifiersResult), identifiers)), argNames),
    );
    res.send({ result: result });
  } catch (err) {
    console.error(err);
    res.json({ error: err });
  }
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`));
