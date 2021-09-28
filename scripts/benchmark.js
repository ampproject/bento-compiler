import {renderAst} from '../dist/src/index.js';
import {parse} from '../dist/test/html-utils.js';
import Benchmark from 'benchmark';

// Returns an HTML document with N body nodes.
function getDoc(n) {
  const nodes = new Array(n).fill('<bento-node></bento-node>').join('');
  return parse(`<html><head></head><body>${nodes}</body></html>`);
}

const doc1 = getDoc(1);
const doc10 = getDoc(10);
const doc100 = getDoc(100);
const doc1000 = getDoc(1000);
const doc10000 = getDoc(10000);
const doc100000 = getDoc(100000);

var suite = new Benchmark.Suite();
suite
  .add('Document: 1 node', function () {
    renderAst(doc1, {});
  })
  .add('Document: 10 nodes', function () {
    renderAst(doc10, {});
  })
  .add('Document: 100 nodes', function () {
    renderAst(doc100, {});
  })
  .add('Document: 1000 nodes', function () {
    renderAst(doc1000, {});
  })
  .add('Document: 10000 nodes', function () {
    renderAst(doc10000, {});
  })
  .add('Document: 100000 nodes', function () {
    renderAst(doc100000, {});
  })
  .on('complete', function () {
    const results = Array.from(this);
    console.log(results.join('\n'));
  })
  .run();
