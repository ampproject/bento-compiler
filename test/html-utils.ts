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
import * as parse5 from 'parse5';
import {
  DocumentNodeProto,
  getNumTerms,
  isElementNode,
  NodeProto,
  TreeProto,
} from '../src/ast.js';
import {getTagId} from '../src/htmltagenum.js';
import {renderAst, InstructionMap} from '../src/index.js';

export function renderHtml(html: string, instructions: InstructionMap): string {
  const tree = parse(html);
  const renderedAst = renderAst(tree, instructions);
  return print(renderedAst);
}

export function parse(html: string): TreeProto {
  return fromParse5Document(parse5.parse(html));
}

/**
 * @See the parse5 documentation for object shapes: https://github.com/inikulin/parse5/blob/master/packages/parse5/docs/tree-adapter/default/interface-list.md
 */
function fromParse5Document(doc: parse5.Document): TreeProto {
  const quirksMode = doc.mode === 'quirks';
  const children = (doc.childNodes ?? [])
    .filter(isInParseTree)
    .map(mapParse5NodeToNodeProto);
  const tree: [DocumentNodeProto] = [{tagid: 92, children}];

  return {quirks_mode: quirksMode, tree, root: 0};

  /**
   * Some nodes do not appear in the C++ Parse Tree:
   * -  Comment Nodes are stripped, since untrused input in comments are a security vulnerabilty.
   * -  DocumentType is stripped since it is captured by the quirks_mode boolean
   */
  function isInParseTree(node: parse5.Node) {
    return node.nodeName !== '#comment' && node.nodeName !== '#documentType';
  }

  function mapParse5NodeToNodeProto(node: parse5.ChildNode): NodeProto {
    if (node.nodeName === '#text') {
      const value = (node as parse5.TextNode).value;
      return {value, num_terms: getNumTerms(value)};
    }

    const elementNode = node as parse5.Element;
    return {
      tagid: getTagId(elementNode.nodeName),
      value: elementNode.nodeName,
      children: (
        (elementNode as any).content?.childNodes ?? // Template node
        elementNode.childNodes ??
        []
      )
        .filter(isInParseTree)
        .map(mapParse5NodeToNodeProto),

      // Omit some of the keys in the parse5 attribute representation.
      attributes: elementNode.attrs.map(({name, value}) => ({name, value})),
    };
  }
}

export function print(ast: TreeProto): string {
  const doctypePrefix = ast.quirks_mode ? '' : '<!DOCTYPE html>';
  const printedTree = ast.tree[0].children.map(printNode).join('');
  return doctypePrefix + printedTree;
}

function printNode(node: NodeProto) {
  if (!isElementNode(node)) {
    return node.value;
  }

  const attrs = (node.attributes ?? [])
    .map(({name, value}) => {
      if (value === '') {
        return name;
      }

      return `${name}="${value}"`;
    })
    .join(' ');
  const attrSpace = attrs.length > 0 ? ' ' : '';
  const children: string = (node.children ?? []).map(printNode).join('');
  return `<${node.value}${attrSpace}${attrs}>${children}</${node.value}>`;
}
