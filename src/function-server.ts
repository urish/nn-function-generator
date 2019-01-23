import { tsquery } from '@phenomnomnominal/tsquery';
import axios from 'axios';
import * as express from 'express';
import { normalizeSignature } from './normalize-signature';
import { renameArgs } from './rename-args';
import { join } from 'path';
import * as prettier from 'prettier';

const app = express();

const port = 3003;

app.use(express.static(join(__dirname, 'web')));

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
    // TODO also restore identifiers
    const result = tryFormat(renameArgs(tsquery.ast(abstractResult), argNames));
    res.send({ result: result });
  } catch (err) {
    console.error(err);
    res.json({ error: err });
  }
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`));
