import fs from 'node:fs/promises';
import Ajv2020 from 'ajv/dist/2020.js';

export async function createPostValidator(schemaPath) {
  const schema = JSON.parse(await fs.readFile(schemaPath, 'utf8'));
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  const validate = ajv.compile(schema);

  return (post, sourcePath) => {
    if (validate(post)) return;

    const details = validate.errors
      .map((error) => `${error.instancePath || '/'} ${error.message}`)
      .join('; ');
    throw new Error(`Structured post validation failed for ${sourcePath}: ${details}`);
  };
}
