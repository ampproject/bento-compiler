/**
 * Copyright 2021 The AMP HTML Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import url from 'url';
import path from 'path';
import esbuild from 'esbuild';
import {globbySync} from 'globby';

const root = path.join(url.fileURLToPath(import.meta.url), '..', '..');

// Build the main binary
const mainBinaryPromise = esbuild.buildSync({
  entryPoints: [path.join(root, 'src', 'index.ts')],
  format: 'esm',
  bundle: true,
  outfile: path.join(root, 'dist', 'index.js'),
});

// Transpile everything to be able to run tests
const transpilePromise = esbuild.build({
  entryPoints: globbySync([
    path.join(root, 'src/**/*.ts'),
    path.join(root, 'test/**/*.ts'),
  ]),
  format: 'esm',
  outdir: path.join(root, 'dist'),
});

await Promise.all([mainBinaryPromise, transpilePromise]);
