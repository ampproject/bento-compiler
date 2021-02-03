# Corpus gathering steps:

1. use view-source and copy/paste to generate the `index.default.html`
2. use Chrome and load the same page. Modify all iframes to have loading=lazy. `copy(document.innerHTML)` to generate `index.ssr.html`. Rename significant amp-carousel components to amp-carousel2.
3. remove all extension script tags from the `ssr.html` file to generate `index.nojs.html`

# Appendix

```javascript
// For SSR.
document.querySelectorAll('iframe,img').forEach(node => {
  node.setAttribute('loading', 'lazy')
})
copy(document.documentElement.innerHTML)
// --> manually replace amp-carousel --> amp-carousel2 so it doesn't hide itself immediately during build.

// For nojs
document.querySelectorAll('script[src],script[custom-element]').forEach(node => node.remove())
copy(document.documentElement.innerHTML)
```