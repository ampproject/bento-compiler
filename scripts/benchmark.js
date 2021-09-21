import {renderAst} from '../dist/src/index.js';
import {parse} from '../dist/test/html-utils.js';

const sum = (numList) => numList.reduce((a, b) => a + b, 0);
const mean = (numList) => sum(numList) / numList.length;

function getHtmlNodes(n) {
  let nodes = '';
  for (let i = 0; i < n; i++) {
    nodes += `<bento-node></bento-node>`;
  }
  return nodes;
}

function measureRender(name, doc) {
  const fakeBuildDom = (el) => el.setAttribute('rendered');
  // First do baseline iteration measure
  let measures = [];
  for (let i = 0; i < 100; i++) {
    let startTime = Date.now();
    renderAst(doc, {});
    measures.push(Date.now() - startTime);
  }
  console.log(`${name} noop avg: ${mean(measures)}`);

  // Then do a worst-case scenario every node must be measured
  measures = [];
  for (let i = 0; i < 1000; i++) {
    let startTime = Date.now();
    renderAst(doc, {'bento-component': fakeBuildDom});
    measures.push(Date.now() - startTime);
  }
  console.log(`${name} render avg: ${mean(measures)}ms`);
}

for (let i = 1; i <= 10000; i *= 10) {
  const doc = parse(
    `<html><head></head><body>${getHtmlNodes(i)}</body></html>`
  );
  measureRender(`Document: ${i} nodes`, doc);
}
