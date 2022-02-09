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
import test from 'ava';
import {
  DocumentNodeProto,
  ElementNodeProto,
  NodeProto,
  TreeProto,
} from '../src/protos.js';
import {getTagId} from '../src/htmltagenum.js';
import {renderAstDocument, renderAstNodes} from '../src/index.js';

/**
 * Helper for generating NodeProtos.
 */
function h(
  tagName: string,
  attributes: Object = {},
  children: Array<NodeProto | string> = []
): NodeProto {
  const nodeProto: NodeProto = {
    tagid: getTagId(tagName),
    value: tagName,
  };
  if (Object.entries(attributes).length) {
    nodeProto.attributes = Object.entries(attributes).map(([name, value]) => {
      if (value === '') {
        return {name};
      }
      return {
        name,
        value,
      };
    });
  }
  if (children.length) {
    nodeProto.children = children.map((child) => {
      if (typeof child === 'string') {
        return {value: child, num_terms: child.match(/[\w]+/gm)?.length ?? 0};
      }
      return child;
    });
  }
  return nodeProto;
}

/**
 * Helper for generating a TreeProto.
 */
function treeProto(
  tree: NodeProto[] | NodeProto = [],
  {quirks_mode, root} = {quirks_mode: false, root: 0}
): TreeProto {
  return {tree: [{tagid: 92, children: [].concat(tree)}], quirks_mode, root};
}

test('should have no effect with empty instructions', (t) => {
  const ast = treeProto();
  t.deepEqual(renderAstDocument(ast, {}), ast);
});

test('should render provided instruction', (t) => {
  const instructions = {
    'amp-element': (el: Element) => {
      const doc = el.ownerDocument;
      el.setAttribute('rendered', '');
      el.appendChild(doc.createTextNode('answer: 42'));
    },
  };

  const ast = treeProto([h('amp-element')]);
  const expected = treeProto([
    h('amp-element', {rendered: ''}, ['answer: 42']),
  ]);
  t.deepEqual(renderAstDocument(ast, instructions), expected);
});

test('should return the error if a single instruction throws', (t) => {
  const instructions = {
    'amp-fail': (_el: Element) => {
      throw new Error('Something is undefined');
    },
  };

  const ast = treeProto(h('amp-fail'));
  t.throws(() => renderAstDocument(ast, instructions), {message: /amp-fail/});
});

test('should only throw the first error even if multiple would throw', (t) => {
  const instructions = {
    'amp-success': (el: Element) => {
      el.setAttribute('rendered', '');
    },
    'amp-fail1': (_el: Element) => {
      throw new Error('Something is undefined');
    },
    'amp-fail2': (_el: Element) => {
      throw new Error('Something is undefined');
    },
  };

  const nodes = h('amp-success', {}, [h('amp-fail1'), h('amp-fail2')]);
  const ast = treeProto(nodes);
  t.throws(() => renderAstNodes([nodes], instructions), {message: /amp-fail1/});
  t.throws(() => renderAstDocument(ast, instructions), {message: /amp-fail1/});
});

test('should allow a custom error handler', (t) => {
  const instructions = {
    'amp-success': (el: Element) => {
      el.setAttribute('rendered', '');
    },
    'amp-fail1': (_el: Element) => {
      throw new Error('Something is undefined');
    },
    'amp-fail2': (_el: Element) => {
      throw new Error('Something is undefined');
    },
  };

  const ast = treeProto(
    h('amp-success', {}, [h('amp-fail1'), h('amp-fail1'), h('amp-fail2')])
  );

  const errors = [];
  const handleError = (tagName) => errors.push(tagName);
  renderAstDocument(ast, instructions, {handleError});
  t.deepEqual(errors, ['amp-fail1', 'amp-fail1', 'amp-fail2']);
});

test('should be unaffected by async modifications', async (t) => {
  const instructions = {
    'amp-element': (el: Element) => {
      Promise.resolve().then(() => {
        el.innerHTML = 'modified';
      });
    },
  };

  const ast = treeProto([h('amp-element')]);
  const rendered = renderAstDocument(ast, instructions);
  await new Promise((r) => setTimeout(r)); // Waits a macrotask.

  t.deepEqual(rendered, ast);
});

test('should not render elements within templates', (t) => {
  const instructions = {
    'amp-element': () => {
      throw new Error('Should not be called');
    },
  };

  const ast = treeProto(h('template', {}, [h('amp-element')]));
  const rendered = renderAstDocument(ast, instructions);

  t.deepEqual(rendered, ast);
});

test('should conserve quirks_mode and root', (t) => {
  const tree: [DocumentNodeProto] = [{tagid: 92, children: []}];
  let ast: TreeProto = {root: 42, quirks_mode: true, tree};
  t.deepEqual(renderAstDocument(ast, {}), ast);

  ast = {root: 7, quirks_mode: false, tree};
  t.deepEqual(renderAstDocument(ast, {}), ast);
});

test('should conserve boolean attributes', (t) => {
  const tree: [DocumentNodeProto] = [
    {
      tagid: 92,
      children: [{tagid: 43, value: 'html', attributes: [{name: 'amp'}]}],
    },
  ];
  const ast: TreeProto = {root: 42, quirks_mode: true, tree};
  t.deepEqual(renderAstDocument(ast, {}), ast);
});

test('should conserve lack of children/attrs for efficiency', (t) => {
  const tree: [DocumentNodeProto] = [
    {
      tagid: 92,
      children: [{tagid: 43, value: 'html'}],
    },
  ];
  const ast: TreeProto = {root: 42, quirks_mode: true, tree};
  t.deepEqual(renderAstDocument(ast, {}), ast);
});

test('should set tagids of element nodes', (t) => {
  function buildAmpList(element) {
    const b = element.ownerDocument.createElement('b');
    b.textContent = 'bolded text';
    element.appendChild(b);
  }

  const inputAst: TreeProto = treeProto(h('amp-list'));
  let renderedAst = renderAstDocument(inputAst, {'amp-list': buildAmpList});

  t.deepEqual(
    renderedAst,
    treeProto([h('amp-list', {}, [h('b', {}, ['bolded text'])])])
  );
  t.is(renderedAst.tree[0].children[0]['children']?.[0]?.tagid, getTagId('b'));
});

// TODO: ensure it is ok for our num_terms to be inaccurate.
// We currently don't differentiate between a "term" and punctuation, etc.
test('should set num_terms of text nodes', (t) => {
  function buildAmpList(element) {
    const doc = element.ownerDocument;
    element.appendChild(doc.createTextNode('element text'));
    element.appendChild(doc.createTextNode('hello\ttabby\ttext'));
  }

  const inputAst: TreeProto = treeProto([h('amp-list')]);
  let result = renderAstDocument(inputAst, {'amp-list': buildAmpList});

  t.deepEqual(
    result,
    treeProto([h('amp-list', {}, ['element text', 'hello\ttabby\ttext'])])
  );
  t.is(result.tree[0].children[0]?.['children']?.[0]?.num_terms, 2);
  t.is(result.tree[0].children[0]?.['children']?.[1]?.num_terms, 3);
});

test('should render node partials', (t) => {
  function buildAmpList(element) {
    const doc = element.ownerDocument;
    element.appendChild(doc.createTextNode('element text'));
  }

  const inputNode: NodeProto = h('amp-list');
  const renderedNode: NodeProto = h('amp-list', {}, ['element text']);

  let resultSingle = renderAstNodes([inputNode], {'amp-list': buildAmpList});
  t.deepEqual(resultSingle, [renderedNode]);

  let resultDouble = renderAstNodes([inputNode, inputNode], {
    'amp-list': buildAmpList,
  });
  t.deepEqual(resultDouble, [renderedNode, renderedNode]);
});

test('should deeply render node partials', (t) => {
  function buildAmpEl(element: Element) {
    element.setAttribute('rendered', '');
  }

  const inputAst: NodeProto = h('amp-el', {}, [h('amp-el')]);
  let result = renderAstNodes([inputAst], {'amp-el': buildAmpEl});
  t.deepEqual(result, [
    h('amp-el', {rendered: ''}, [h('amp-el', {rendered: ''})]),
  ]);
});
