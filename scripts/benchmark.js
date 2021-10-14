import {renderAstDocument, renderAstNodes} from '../dist/src/index.js';
import {parse} from '../dist/test/html-utils.js';
import Benchmark from 'benchmark';

// Returns an HTML document with N body nodes.
function getDoc(n) {
  const nodes = new Array(n).fill('<bento-node></bento-node>').join('');
  return parse(`<html><head></head><body>${nodes}</body></html>`);
}

// Returns N-lenth array where each element is a NodeProto
function getNodes(n) {
  return new Array(n).fill({
    tagid: 0,
    value: 'bento-component',
    children: [],
    attributes: [],
  });
}

const doc1 = getDoc(1);
const doc10 = getDoc(10);
const doc100 = getDoc(100);
const doc1000 = getDoc(1000);
const doc10000 = getDoc(10000);
const doc100000 = getDoc(100000);

const nodes1 = getNodes(1);
const nodes10 = getNodes(10);
const nodes100 = getNodes(100);
const nodes1000 = getNodes(1000);

var suite = new Benchmark.Suite();
suite
  .add('Document: 1 node', function () {
    renderAstDocument(doc1, {});
  })
  .add('Document: 10 nodes', function () {
    renderAstDocument(doc10, {});
  })
  .add('Document: 100 nodes', function () {
    renderAstDocument(doc100, {});
  })
  .add('Document: 1000 nodes', function () {
    renderAstDocument(doc1000, {});
  })
  .add('Document: 10000 nodes', function () {
    renderAstDocument(doc10000, {});
  })
  .add('Document: 100000 nodes', function () {
    renderAstDocument(doc100000, {});
  })
  .add('Nodes: 1', function () {
    renderAstNodes(nodes1, {});
  })
  .add('Nodes: 10', function () {
    renderAstNodes(nodes10, {});
  })
  .add('Nodes: 100', function () {
    renderAstNodes(nodes100, {});
  })
  .add('Nodes: 1000', function () {
    renderAstNodes(nodes1000, {});
  })
  .on('complete', function () {
    const results = Array.from(this);
    console.log(results.join('\n'));
  })
  .run();
