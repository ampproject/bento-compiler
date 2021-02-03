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

/**
 * @file Provides interfaces and helper functions for handling a JSON representation of HTML.
 */

export interface TreeProto {
  tree: Array<NodeProto>;
  quirks_mode: undefined | boolean;
  root: number;
}

export interface TextNodeProto {
  value: string;
  num_terms: number;
}
export interface ElementNodeProto {
  tagid: number;
  value: string;
  attributes: Array<AttributeProto>;
  children: Array<NodeProto>;
}

export type NodeProto = TextNodeProto | ElementNodeProto;
export interface AttributeProto {
  name: string;
  value?: string;
}

export function isElementNode(node: NodeProto): node is ElementNodeProto {
  return 'tagid' in node;
}

export function fromDocument(doc: Document): TreeProto {
  return {
    quirks_mode: doc.compatMode === 'BackCompat',
    tree: Array.from(doc.childNodes).map(mapDomNodeToNodeProto),
    root: 0,
  };
}

enum NodeType {
  Element = 1,
  Text = 3,
}

function mapDomNodeToNodeProto(node: Node): NodeProto {
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
    children: Array.from(node.childNodes).map(mapDomNodeToNodeProto),
  };
}

const termRegex = /[\w-]+/gm;
export function getNumTerms(str: string): number {
  return str.match(termRegex)?.length ?? 0;
}
