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
import {isElementNode} from './ast.js';
import {TreeProto, NodeProto} from './protos.js';

// TypeScript doesn't understand importing a file with a .mjs extension, but it is perfectly valid once transpiled
// See: https://github.com/microsoft/TypeScript/issues/27957
// @ts-ignore
import {createDocument} from '@ampproject/worker-dom/dist/server-lib.mjs';
import {getTagId} from './htmltagenum.js';

/**
 * @file Provides helpers for converting between Document and TreeProto formats.
 */

export function fromTreeProto(ast: TreeProto) {
  const doc = createDocument();

  // compatMode allows us to preserve the quirks boolean.
  Object.defineProperties(doc, {
    compatMode: {
      value: ast.quirks_mode ? 'BackCompat' : 'CSS1Compat',
    },
  });

  const firstNodeTagId = ast.tree?.[0]?.tagid;
  if (firstNodeTagId !== getTagId('ZERO_LENGTH')) {
    throw new Error(
      `HTML must begin with a #document tag, found: ${firstNodeTagId}`
    );
  }

  fromTreeProtoHelper(ast.tree[0].children, doc, doc);
  return doc;
}

// TODO: research optimization opportunity to reuse the same doc.
export function fromNodeProto(node: NodeProto) {
  const doc = createDocument();
  fromTreeProtoHelper([node], doc, doc);
  return doc.childNodes[0];
}

function fromTreeProtoHelper(nodes: NodeProto[], doc: Document, parent: Node) {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (!isElementNode(node)) {
      parent.appendChild(doc.createTextNode(node.value));
      continue;
    }

    if (node.tagid === getTagId('ZERO_LENGTH')) {
      throw new Error(`Found a #document in a non-root position`);
    }

    const domNode = doc.createElement(node.value);
    for (const {name, value} of node.attributes) {
      domNode.setAttribute(name, value);
    }
    parent.appendChild(domNode);

    fromTreeProtoHelper(node.children, doc, domNode);
  }
}
