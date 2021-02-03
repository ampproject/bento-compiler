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
import type {TreeProto} from './ast.js';
import * as ast from './ast.js';
import * as dom from './dom.js';

export interface InstructionMap {
  [key: string]: (element: Element) => void;
}

/**
 * A collection of tagName to errors.
 */
type ErrorMultimap = Map<string, string[]>;

export type Result<T> =
  | {type: 'success'; value: T}
  | {type: 'failure'; error: ErrorMultimap};

export function renderAst(
  tree: TreeProto,
  instructions: InstructionMap
): Result<TreeProto> {
  const errors = new Map();
  const doc = dom.fromTreeProto(tree);

  // TODO: Optimization opportunity by writing a custom walk instead of N querySelectorAll.
  for (let [tagName, buildDom] of Object.entries(instructions)) {
    const elements = doc.querySelectorAll(tagName);
    const tagErrors = [];
    for (const element of elements) {
      // Do not render anything inside of templates.
      if (isInTemplate(element)) {
        continue;
      }

      try {
        buildDom(element);
      } catch (e) {
        tagErrors.push(e.message);
      }
    }
    if (tagErrors.length) {
      errors.set(tagName, tagErrors);
    }
  }

  if (errors.size > 0) {
    return {type: 'failure', error: errors};
  }

  const transformedAst = ast.fromDocument(doc);
  transformedAst.root = tree.root;
  transformedAst.quirks_mode = tree.quirks_mode;

  return {type: 'success', value: transformedAst};
}

function isInTemplate(node: Node) {
  while (node.parentNode) {
    if (node.parentNode.nodeName === 'TEMPLATE') {
      return true;
    }
    node = node.parentNode;
  }
  return false;
}
