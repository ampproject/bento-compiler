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
const path = require('path');
const express = require('express');
const getMetrics = require('../lib/measure-documents');

const runs = 30;
const urls = [
  'foxnews',
  'msnbc',
  'pinterest',
  'bedbath',
  'bh',
  'chefkoch',
  'dailymail',
  'ampdev',
].map((pageName) => `http://localhost:8000/${pageName}/index.$version.html`);

async function run() {
  const corpusDir = path.resolve(__dirname, '..', 'corpus');
  const server = express().use(express.static(corpusDir)).listen(8000);
  await getMetrics({ runs, urls });
  server.close();
}

run();
