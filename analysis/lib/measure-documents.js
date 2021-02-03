/**
 * Copyright 2019 The AMP HTML Authors. All Rights Reserved.
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
const fs = require('fs');
const { cyan, green } = require('ansi-colors');
const chromeLauncher = require('chrome-launcher');
const lighthouse = require('lighthouse');

const PAGE_VERSIONS = {
  CONTROL: 'default',
  SSR: 'ssr',
  NO_JS: 'nojs',
};

const RESULTS_PATH = path.resolve(__dirname, '..', 'results.json');

function readResults() {
  if (fs.existsSync(RESULTS_PATH)) {
    return JSON.parse(fs.readFileSync(RESULTS_PATH));
  }
  return {};
}

function getCompletedRuns(url, version) {
  return readResults()?.[url]?.[version]?.length ?? 0;
}

/**
 * Writes measurements to ./results.json
 *
 * @param {string} url
 * @param {string} version
 * @param {*} metrics
 */
function writeMetrics(url, version, metrics) {
  let results = readResults();
  results[url] = results[url] ?? {};
  results[url][version] = results[url][version] ?? [];

  results[url][version].push(metrics);
  fs.writeFileSync(RESULTS_PATH, JSON.stringify(results));
}

/**
 * Opens Chrome, loads the URL from local file cache, and collects
 * metrics for the specified URL and version
 *
 * @param {string} url
 * @param {string} version "control" or "experiment"
 * @return {Promise}
 */
async function measureDocument(url, version) {
  const chrome = await chromeLauncher.launch({
    chromeFlags: [
      // "--headless"
    ],
  }); // Cannot make headless or else tbt becomes nonsenical in some cases.
  const options = {
    logLevel: 'error',
    output: 'json',
    onlyCategories: ['performance'],
    port: chrome.port,
  };
  const actualUrl = url.replace('$version', version);

  try {
    const lhr = (await lighthouse(actualUrl, options)).lhr;
    const metrics = {
      totalBlockingTime: lhr.audits['total-blocking-time'].numericValue,
      maxPotentialFid: lhr.audits['max-potential-fid'].numericValue,
      largestContentfulPaint:
        lhr.audits['largest-contentful-paint'].numericValue,
      cumulativeLayoutShift: lhr.audits['cumulative-layout-shift'].numericValue,
    };
    writeMetrics(url, version, metrics);
    chrome.kill();
  } catch (e) {
    chrome.kill();
    throw new Error(`Error loading ${actualUrl}: ${e.message}`);
  }
}

async function measureDocuments({ urls, runs }) {
  // Make an array of tasks to be executed. Picks up where the last run left off.
  let tasks = [];
  for (const version of Object.values(PAGE_VERSIONS)) {
    for (const url of urls) {
      const completed = getCompletedRuns(url, version);
      tasks = tasks.concat(
        Array.from({ length: runs - completed }).map(() => () =>
          measureDocument(url, version)
        )
      );
    }
  }

  const startTime = Date.now();
  function getRunningStats() {
    const elapsed = (Date.now() - startTime) / 1000;
    const secondsPerTask = elapsed / i;
    return {
      timeLeft: Math.floor(secondsPerTask * (tasks.length - i)),
      secondsPerTask,
    };
  }

  console.log(
    green('Taking performance measurements. Running '),
    cyan(
      `${tasks.length} / ${
        runs * urls.length * Object.values(PAGE_VERSIONS).length
      }`
    ),
    green('times...')
  );

  // Excecute the tasks serially
  let i = 1;
  for (const task of tasks) {
    const { timeLeft, secondsPerTask } = getRunningStats();
    console.log(
      `Progress: ${i++}/${
        tasks.length
      }. ${timeLeft} seconds left. ${secondsPerTask.toFixed(2)}s per task.`
    );

    // Repeat each task until successful
    let success = false;
    while (!success) {
      try {
        await task();
        success = true;
      } catch (err) {
        console.log('Retrying...', err);
      }
    }
  }
}

module.exports = measureDocuments;
