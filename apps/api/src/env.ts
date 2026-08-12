import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';

// Loads the local `.env` (e.g. PORT) into process.env at startup. No-op when
// the file is absent so the server still runs with defaults.
if (existsSync('.env')) {
  loadEnvFile('.env');
}
