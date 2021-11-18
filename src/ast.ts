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
import {getTagId} from './htmltagenum.js';
import {NodeProto, ElementNodeProto, TreeProto} from './protos.js';

export function isElementNode(node: NodeProto): node is ElementNodeProto {
  return (node as any).tagid !== undefined;
}

export function fromDocument(doc: Document): TreeProto {
  const children = Array.from(doc.childNodes).map(fromNode);
  return {
    quirks_mode: doc.compatMode === 'BackCompat',
    tree: [{tagid: 92, children}],
    root: 0,
  };
}

enum NodeType {
  Element = 1,
  Text = 3,
}

export function fromNode(node: Node): NodeProto {
  if (node.nodeType !== NodeType.Element && node.nodeType !== NodeType.Text) {
    throw new Error(`Unsupported nodeType: ${node.nodeType}`);
  }

  if (node.nodeType === NodeType.Text) {
    const value = node.textContent;
    return {value, num_terms: getNumTerms(value)};
  }

  const elementNode = node as Element;
  const attributes = Array.from(elementNode.attributes).map(
    ({name, value}) => ({name, value})
  );
  return {
    tagid: getTagId(elementNode.tagName),
    value: elementNode.tagName.toLowerCase(),
    attributes,
    children: Array.from(node.childNodes).map(fromNode),
  };
}

const termRegex = /[\w-]+/gm;
export function getNumTerms(str: string): number {
  if (!str) {
    return 0;
  }
  return str.match(termRegex)?.length ?? 0;
}
