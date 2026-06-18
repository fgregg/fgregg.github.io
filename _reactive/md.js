// Custom `md` for the reactive runtime — swapped in for notebook-kit's
// stdlib/md.js by an esbuild alias in bundle-runtime.mjs.
//
// Identical to notebook-kit's md except the heading anchor: instead of wrapping
// the entire heading text in a link (permalink.headerLink — which renders every
// `##`/`###` as a visible link), we add a small `#` anchor *inside* the heading
// (permalink.linkInsideHeader). The heading text stays plain; the `#` is the
// deep-link affordance, revealed on hover via CSS (.header-anchor in main.scss).
// Headings still get an id, so `#slug` links work and match the static posts.
// Lazy syntax highlighting, reusing notebook-kit's own highlight module. Our
// file lives outside the package dir, so reference it by its node_modules path.
import {highlight} from "./node_modules/@observablehq/notebook-kit/dist/src/runtime/stdlib/highlight.js";
import {createMarkdownIt} from "./markdownit.js";

const mi = createMarkdownIt();
export function MarkdownRenderer({ document = window.document } = {}) {
    return function (template, ...values) {
        let source = template[0];
        let fragment = null;
        let partIndex = -1;
        const parts = [];
        // Concatenate the text using anchors as placeholders.
        for (let i = 0, n = values.length; i < n; ++i) {
            const value = values[i];
            if (value instanceof Node) {
                parts[++partIndex] = value;
                source += `<a id=o:${partIndex}></a>`;
            }
            else if (Array.isArray(value)) {
                for (const node of value) {
                    if (node instanceof Node) {
                        if (fragment === null) {
                            parts[++partIndex] = fragment = document.createDocumentFragment();
                            source += `<a id=o:${partIndex}></a>`;
                        }
                        fragment.appendChild(node);
                    }
                    else {
                        fragment = null;
                        source += node;
                    }
                }
                fragment = null;
            }
            else {
                source += value;
            }
            source += template[i + 1];
        }
        // Render the text.
        const root = document.createElement("div");
        root.innerHTML = mi.render(source);
        // Walk the rendered content to replace anchor placeholders.
        if (++partIndex > 0) {
            const nodes = new Array(partIndex);
            for (const node of root.querySelectorAll("a[id^='o:']")) {
                if (/^o:\d+$/.test(node.id)) {
                    nodes[+node.id.slice(2)] = node;
                }
            }
            for (let i = 0; i < partIndex; ++i) {
                const node = nodes[i];
                node.parentNode?.replaceChild(parts[i], node);
            }
        }
        return root;
    };
}
let renderer;
export const md = (template, ...values) => {
    const root = (renderer ?? (renderer = MarkdownRenderer()))(template, ...values);
    const codes = root.querySelectorAll("code[class^=language-]");
    if (codes.length > 0)
        codes.forEach(highlight);
    return root.childNodes.length === 1 ? root.removeChild(root.firstChild) : root;
};
