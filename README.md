# Bento Compiler

Server-render AMP Components with [worker-dom](https://github.com/ampproject/worker-dom).

## Install

```bash
$ npm install --save @ampproject/bento-compiler
```

## Usage

> Visit the [test cases](./test/test-index.ts) for more info.

```js
import {renderAst} from '@ampproject/bento-compiler';

function ampLayoutBuildDom(element) {
  element.setAttribute('i-amphtml-ssr', '');
}

const ast = h('html', {}, [h('body', {}, [h('amp-layout'))])]);
const rendered = renderAst(ast, {'amp-layout': ampLayoutBuildDom});
```

## Analysis

See the [analysis](go/bento-compiler-p1) for details on how we measured expected performance improvement.
