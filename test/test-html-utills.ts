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
import {parse, print} from './html-utils.js';

test('Empty string parses to a skeleton html file', (t) => {
  const input = '';
  const expected = '<html><head></head><body></body></html>';
  const actual = print(parse(input));

  t.is(actual, expected);
});

test('Missing skeleton parses places input into the <body>', (t) => {
  const input1 = '<h1>hello, world</h1>';
  const expected1 = `<html><head></head><body>${input1}</body></html>`;
  const actual1 = print(parse(input1));

  t.is(actual1, expected1);
});

test('Void elements are closed', (t) => {
  const input =
    '<!DOCTYPE html><html><head></head><body><img src="example.jpg"/><br/></body></html>';
  const expected =
    '<!DOCTYPE html><html><head></head><body><img src="example.jpg"></img><br></br></body></html>';

  t.is(print(parse(input)), expected);
});

test('Valid html files come out unchanged from parse/print', (t) => {
  // Skeleton HTML file.
  const input1 = '<html><head></head><body></body></html>';
  t.is(print(parse(input1)), input1);

  // With regular attributes
  const input2 =
    '<html attr1="100"><head></head><body><h1 class="apples"></h1></body></html>';
  t.is(print(parse(input2)), input2);

  // With boolean attributes
  const input3 =
    '<html amp compiled><head></head><body valid_boolean_attr></body></html>';
  t.is(print(parse(input3)), input3);

  // With text nodes
  const input4 =
    '<html><head></head><body>Hello <span>World!</span> </body></html>';
  t.is(print(parse(input4)), input4);

  // Strict mode
  const input5 = '<!DOCTYPE html><html><head></head><body></body></html>';
  t.is(print(parse(input5)), input5);
});

test('Unquoted attribute values acquire quotes', (t) => {
  const input = '<html height=100><head></head><body></body></html>';
  const expected = '<html height="100"><head></head><body></body></html>';
  const actual = print(parse(input));

  t.is(actual, expected);
});

test('Attributes with empty value become boolean attributes', (t) => {
  const input = '<html amp=""><head></head><body></body></html>';
  const expected = '<html amp><head></head><body></body></html>';
  const actual = print(parse(input));

  t.is(actual, expected);
});

test('Comment nodes are thrown out', (t) => {
  const input = '<html><head><!--Comment--></head><body></body></html>';
  const expected = '<html><head></head><body></body></html>';
  const actual = print(parse(input));

  t.is(actual, expected);
});

test.todo('HTML Entities are kept intact');
