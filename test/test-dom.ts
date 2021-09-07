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
import type {TreeProto} from '../src/ast.js';

import test from 'ava';
import {fromTreeProto} from '../src/dom.js';
import {fromDocument} from '../src/ast.js';
import {parse, print} from './html-utils.js';
import {getTagId} from '../src/htmltagenum.js';

function printDoc(doc: Document) {
  return print(fromDocument(doc));
}

function parseDoc(html: string): Document {
  return fromTreeProto(parse(html));
}

function htmlWithBody(html: string) {
  return `<html><head></head><body>${html}</body></html>`;
}

test('should handle empty ast in quirks mode', (t) => {
  const ast: TreeProto = {quirks_mode: true, tree: [], root: 0};
  const doc = fromTreeProto(ast);

  t.is(printDoc(doc), '');
});

test('should handle tree under ZERO_LENGTH node', (t) => {
  const ast: TreeProto = {
    quirks_mode: true,
    root: 0,
    tree: [
      {
        tagid: getTagId('ZERO_LENGTH'),
        value: undefined,
        attributes: [],
        children: [
          {
            value: 'html',
            tagid: getTagId('html'),
            attributes: [],
            children: [],
          },
        ],
      },
    ],
  };
  const doc = fromTreeProto(ast);

  t.is(printDoc(doc), '<html></html>');
});

test('should handle empty ast in strict mode', (t) => {
  const ast: TreeProto = {quirks_mode: false, tree: [], root: 0};
  const doc = fromTreeProto(ast);

  t.is(printDoc(doc), '<!DOCTYPE html>');
});

test('should handle single node', (t) => {
  const ast: TreeProto = {
    root: 0,
    quirks_mode: true,
    tree: [
      {
        value: 'div',
        tagid: getTagId('div'),
        attributes: [],
        children: [],
      },
    ],
  };
  const doc = fromTreeProto(ast);

  t.is(printDoc(doc), '<div></div>');
});

test('should handle nested nodes', (t) => {
  const html = htmlWithBody('<div><b></b><b></b></div><h1>title</h1>');
  const doc = parseDoc(html);

  t.is(printDoc(doc), html);
});

test('should handle nodes with text', (t) => {
  const html = htmlWithBody('<h1>the answer: <span>42</span></h1>');
  const doc = parseDoc(html);

  t.is(printDoc(doc), html);
});

test('should handle nodes with attributes', (t) => {
  const html =
    '<html><head></head><body data-amp-bind-foo="hello"><h1 style="display:none;">title</h1></body></html>';
  const doc = parseDoc(html);

  t.is(printDoc(doc), html);
});

test('should handle nodes with amp-bind notation', (t) => {
  const html = htmlWithBody('<h1 [text]="state"></h1>');
  const doc = parseDoc(html);

  t.is(printDoc(doc), html);
});

test('should handle <template> and <slot> elements', (t) => {
  const html = htmlWithBody(
    '<host-element><template shadowroot="open"><slot></slot></template><h2>Light content</h2></host-element>'
  );
  const ast = parse(html);
  const doc = fromTreeProto(ast);

  t.is(printDoc(doc), html);
});
