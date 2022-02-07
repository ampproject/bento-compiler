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
import * as ast from './ast.js';
import * as dom from './dom.js';
import {TreeProto, NodeProto} from './protos.js';

export * from './protos.js';

export interface InstructionMap {
  [key: string]: (element: Element) => void;
}

function defaultHandleError(tagName, e: Error) {
  throw new Error(`[${tagName}]: ${e.stack}`);
}

export function renderAstDocument(
  tree: TreeProto,
  instructions: InstructionMap,
  {handleError = defaultHandleError} = {}
): TreeProto {
  const doc = dom.fromTreeProto(tree);
  renderNodeDeep(doc, instructions, {handleError});
  return {
    ...ast.fromDocument(doc),
    // these two don't have clear equivalents in worker-dom,
    // so we retain them here.
    root: tree.root,
    quirks_mode: tree.quirks_mode,
  };
}

export function renderAstNodes(
  nodes: NodeProto[],
  instructions: InstructionMap,
  {handleError = defaultHandleError} = {}
): NodeProto[] {
  return nodes.map((astNode: NodeProto) => {
    const domNode = dom.fromNodeProto(astNode);
    renderNodeDeep(domNode, instructions, {handleError});
    return ast.fromNode(domNode);
  });
}

function renderNodeDeep(
  node: Element,
  instructions: InstructionMap,
  {handleError = defaultHandleError} = {}
): void {
  // First render given node if applicable
  if (node.tagName.toLowerCase() in instructions) {
    const buildDom = instructions[node.tagName.toLowerCase()];
    buildDom(node);
  }

  // Then deeply render all children.
  // TODO: Optimization opportunity by writing a custom walk instead of N querySelectorAll.
  for (let [tagName, buildDom] of Object.entries(instructions)) {
    const elements = Array.from(node.querySelectorAll(tagName));
    for (const element of elements) {
      // Do not render anything inside of templates.
      if (isInTemplateOrScript(element)) {
        continue;
      }

      try {
        buildDom(element);
      } catch (e) {
        handleError(tagName, e);
      }
    }
  }
}

function isInTemplateOrScript(node: Node) {
  while (node.parentNode) {
    if (
      node.parentNode.nodeName === 'TEMPLATE' ||
      node.parentNode.nodeName === 'SCRIPT'
    ) {
      return true;
    }
    node = node.parentNode;
  }
  return false;
}
