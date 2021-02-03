// results[urlPattern][variantName][i][metric]
const Table = require('easy-table');
const {green, cyan, red} = require('ansi-colors');

// const results = require('./results');
// alpha = 0.05; significance level = 5%
const T_VALUE = 2.042

// read metrics values, analyze, and display results
function runAnalysisAndSummary() {
  const analysis = analyzeResults(require('../results'));
  const summary = displayFullAnalysis(analysis)

  console.log('******************************');
  console.log(`Summary of Results`);
  console.log('******************************');
  const t = new Table();

  // This is disgusting
  summary.forEach((row, i, arr) => {
    const hasChange = (col) => i === 0 || row[col] != arr[i-1][col];

    if (i && hasChange(0) && hasChange(1)) {
      t.cell('Page', '------');
      t.cell('Comparison', '------');
      t.cell('LCP', '------');
      t.cell('TBT', '------');
      t.newRow();
    }

    hasChange(0) && t.cell('Page', row[0]);
    hasChange(1) && t.cell('Comparison', row[1]);
    t.cell('LCP', row[2]);
    t.cell('TBT', row[3]);
    t.newRow();
  });
  console.log(t.toString());
}

// display the analysis results of all pages, returning summary results
function displayFullAnalysis(analysis) {
  const summary = [];

  Object.entries(analysis).forEach(([pageName, pageAnalysis]) => {
    console.log('==============================');
    console.log('==============================');
    console.log(`Results for page "${pageName}"`);
    console.log('==============================');
    console.log('==============================');
    console.log('');
    displayPageAnalysis(pageAnalysis).forEach(pageSummary => {
      summary.push([pageName, ...pageSummary]);
    });
    console.log('');
  });

  return summary;
}

// display the analysis results of one page, returning summary results
function displayPageAnalysis(pageAnalysis) {
  const summary = [];

  Object.entries(pageAnalysis).forEach(([variantName, variantAnalysis]) => {
    console.log('------------------------------');
    console.log(`Comparison: "${variantName.toUpperCase()}"`);
    console.log('------------------------------');
    console.log('');
    const changes = displayVariantAnalysis(variantAnalysis)
    summary.push([variantName, ...changes]);
    console.log('');
  });

  return summary;
}

// display the analysis results of one page variant, returning summary results
function displayVariantAnalysis(variantAnalysis) {
  const changes = [];

  const t = new Table();
  const betterOrWorse = (significant, improvement) => {
    if (!significant) {
      return cyan('Same');
    }
    const percentChange = Math.round(improvement * 100);
    if (significant === 1) {
      return green(`~${percentChange}% better`);
    }
    return red(`~${-percentChange}% worse`);
  }

  Object.entries(variantAnalysis).forEach(([metricName, metricAnalysis]) => {
    t.cell('Metric', metricName);
    t.cell('X_control', metricAnalysis.control.mean, Table.number(2));
    t.cell('S_control', metricAnalysis.control.stddev, Table.number(2));
    t.cell('X', metricAnalysis.exp.mean, Table.number(2));
    t.cell('S', metricAnalysis.exp.stddev, Table.number(2));
    t.cell('T', metricAnalysis.t, Table.number(2));


    const change = betterOrWorse(
      metricAnalysis.significant,
      metricAnalysis.improvement,
    );
    t.cell('X < X_control', change);

    t.newRow();
    changes.push(change)
  });
  console.log(t.toString());

  return changes;
}

// compute stats and ttest results from metric values
function analyzeResults(results) {
  const analysis = {};
  Object.entries(results).forEach(([urlPattern, pageResults]) => {
    const [, pageName] = urlPattern.match(/:8000\/(\w+)\//);
    analysis[pageName] = testPage(collatedPageResults(pageResults));
  });

  return analysis;
}

// Organizes metric results into columns
function collatedPageResults(pageResults) {
  const variations = {};
  let lcp = 0;
  let tbt = 0;
  let cls = 0;
  let maxFid = 0;

  Object.entries(pageResults).forEach(([variantName, metricData]) => {
    // Use previous row's value when result is 0
    lcp = metricData.map(({largestContentfulPaint}) => largestContentfulPaint) || lcp;
    tbt = metricData.map(({totalBlockingTime}) => totalBlockingTime) || tbt;
    cls = metricData.map(({cumulativeLayoutShift}) => cumulativeLayoutShift) || cls;
    maxFid = metricData.map(({maxPotentialFid}) => maxPotentialFid) || maxFid;

    variations[variantName] = {lcp, tbt, cls, maxFid}
  });

  return variations;
}


const sum = (numList) => numList.reduce((a, b) => a + b, 0);
const mean = (numList) => sum(numList) / numList.length;
const stddev = (numList, avg) => Math.sqrt(mean(numList.map(x => Math.pow(avg - x, 2))));
function basicStats(numList) {
  const avg = mean(numList);
  const s = stddev(numList, avg);
  return {mean: avg, stddev: s};
}

// paired t test comparing one variant against controll
function testVariant(variantName, controlName, pageResults) { 
  const controlGroup = pageResults[controlName];
  const experimentGroup = pageResults[variantName];

  const stats = {};
  Object.keys(controlGroup).forEach(metricName => {
    if (metricName == 'cls') return;
    const control = controlGroup[metricName];
    const exp = experimentGroup[metricName];
    const controlStats = basicStats(control);
    const expStats = basicStats(exp);

    const x_0 = controlStats.mean;
    const x_1 = expStats.mean;
    const s_0 = controlStats.stddev;
    const s_1 = expStats.stddev;
    const n_0 = control.length;
    const n_1 = exp.length;
    const t = (x_0 - x_1) / Math.sqrt((s_0*s_0/n_0) + (s_1*s_1/n_1))

    let significant = 0;
    if (t > T_VALUE) {
      significant = 1;
    } else if (t < -T_VALUE) {
      significant = -1;
    }

    stats[metricName] = {
      control: controlStats,
      exp: expStats,
      t,
      improvement: (x_0 - x_1) / x_0,
      significant,
    }
  });

  return stats;
}

// runs ttests for each variant of a page
function testPage(pageResults) {
  return {
    'SSR vs Default': testVariant('ssr', 'default', pageResults),
    'NoJS vs Default': testVariant('nojs', 'default', pageResults),
    'NoJS vs SSR': testVariant('nojs', 'ssr', pageResults),
  }
}

runAnalysisAndSummary();
