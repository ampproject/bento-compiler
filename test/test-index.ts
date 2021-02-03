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
import {NodeProto, TreeProto} from '../src/ast.js';
import {getTagId} from '../src/htmltagenum.js';
import {Result, renderAst} from '../src/index.js';

/**
 * Helper for generating a successful Result.
 */
function success(html: TreeProto): Result<TreeProto> {
  return {type: 'success', value: html};
}

/**
 * Helper for generating NodeProtos.
 */
function h(
  tagName: string,
  attributes: Object = {},
  children: Array<NodeProto | string> = []
): NodeProto {
  return {
    tagid: getTagId(tagName),
    value: tagName,
    attributes: Object.entries(attributes).map(([name, value]) => ({
      name,
      value,
    })),
    children: children.map((child) => {
      if (typeof child === 'string') {
        return {value: child, num_terms: child.match(/[\w]+/gm)?.length ?? 0};
      }
      return child;
    }),
  };
}

/**
 * Helper for generating a TreeProto.
 */
function treeProto(
  tree: NodeProto[] | NodeProto = [],
  {quirks_mode, root} = {quirks_mode: false, root: 0}
) {
  return {tree: [].concat(tree), quirks_mode, root};
}

test('should have no effect with empty instructions', (t) => {
  const ast = treeProto();
  const expected = success(ast);
  t.deepEqual(renderAst(ast, {}), expected);
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
  const expected = success(
    treeProto([h('amp-element', {rendered: ''}, ['answer: 42'])])
  );
  t.deepEqual(renderAst(ast, instructions), expected);
});

test('should return the collection of found errors if a single instruction throws', (t) => {
  const instructions = {
    'amp-fail': (_el: Element) => {
      throw new Error('Cannot render <amp-fail>');
    },
  };

  const ast = treeProto(h('amp-fail'));
  const expected: Result<string> = {
    type: 'failure',
    error: new Map([['amp-fail', ['Cannot render <amp-fail>']]]),
  };
  t.deepEqual(renderAst(ast, instructions), expected);
});

test('should return the collection of found errors if an instruction throws', (t) => {
  const instructions = {
    'amp-success': (el: Element) => {
      el.setAttribute('rendered', '');
    },
    'amp-fail1': (_el: Element) => {
      throw new Error('Cannot render <amp-fail1>');
    },
    'amp-fail2': (_el: Element) => {
      throw new Error('Cannot render <amp-fail2>');
    },
  };

  const ast = treeProto(
    h('amp-success', {}, [h('amp-fail1'), h('amp-fail1'), h('amp-fail2')])
  );
  const expected: Result<string> = {
    type: 'failure',
    error: new Map([
      ['amp-fail1', ['Cannot render <amp-fail1>', 'Cannot render <amp-fail1>']],
      ['amp-fail2', ['Cannot render <amp-fail2>']],
    ]),
  };
  t.deepEqual(renderAst(ast, instructions), expected);
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
  const rendered = renderAst(ast, instructions);
  await new Promise((r) => setTimeout(r)); // Waits a macrotask.

  t.deepEqual(rendered, success(ast));
});

test('should not render elements within templates', (t) => {
  const instructions = {
    'amp-element': () => {
      throw new Error('Should not be called');
    },
  };

  const ast = treeProto(h('template', {}, [h('amp-element')]));
  const rendered = renderAst(ast, instructions);

  t.deepEqual(rendered, success(ast));
});

test('should conserve quirks_mode and root', (t) => {
  let ast: TreeProto = {root: 42, quirks_mode: true, tree: []};
  t.deepEqual(renderAst(ast, {})['value'], ast);

  ast = {root: 7, quirks_mode: false, tree: []};
  t.deepEqual(renderAst(ast, {})['value'], ast);
});

test('should set tagids of element nodes', (t) => {
  function buildAmpList(element) {
    const b = element.ownerDocument.createElement('b');
    b.textContent = 'bolded text';
    element.appendChild(b);
  }

  const inputAst: TreeProto = treeProto(h('amp-list'));
  let result = renderAst(inputAst, {'amp-list': buildAmpList});
  if (result.type === 'failure') {
    throw new Error(`Render should have succeeded`);
  }

  t.deepEqual(
    result.value,
    treeProto([h('amp-list', {}, [h('b', {}, ['bolded text'])])])
  );
  t.is(result.value.tree[0]?.['children']?.[0]?.tagid, 7);
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
  let result = renderAst(inputAst, {'amp-list': buildAmpList});

  if (result.type === 'failure') {
    t.fail('Render should succeed');
    return;
  }

  t.deepEqual(
    result.value,
    treeProto([h('amp-list', {}, ['element text', 'hello\ttabby\ttext'])])
  );
  t.is(result.value.tree[0]?.['children']?.[0]?.num_terms, 2);
  t.is(result.value.tree[0]?.['children']?.[1]?.num_terms, 3);
});
