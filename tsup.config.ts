import { copyFile } from 'node:fs/promises';
import { join } from 'node:path';
import { defineConfig } from 'tsup';

import { copyFile } from 'node:fs/promises';
import { join } from 'node:path';
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['checkFees.ts', 'generateSafeDeploymentTx.ts', 'script.js'],
});
