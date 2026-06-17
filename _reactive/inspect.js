// Custom inspector for the reactive Jekyll plugin.
//
// Drop-in replacement for notebook-kit's runtime/inspect.js. display() already
// renders real DOM nodes (Element/Text) as-is; this only changes how *non-DOM*
// cell values are shown:
//   - strings  -> plain text (no surrounding quotes), so display("hi") reads
//                 like prose instead of "hi"
//   - numbers / booleans / bigint -> plain text
//   - everything else (objects, arrays, errors) -> the default rich inspector,
//                 whose expandable tree is genuinely useful for structured data
//
// Mirrors the original module's exported surface (inspect, inspectError,
// getExpanded) so it can be swapped in at bundle time.
import { Inspector } from "@observablehq/inspector";

function isPlain(value) {
  return (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  );
}

export function inspect(value, expanded) {
  if (isPlain(value)) {
    // render as a plain text node, no quotes, no inspector chrome
    return document.createTextNode(String(value));
  }
  const node = document.createElement("div");
  new Inspector(node).fulfilled(value);
  if (expanded) {
    for (const path of expanded) {
      let child = node;
      for (const i of path) child = child?.childNodes[i];
      child?.dispatchEvent(new Event("mouseup")); // restore expanded state
    }
  }
  return node;
}

export function inspectError(value) {
  const node = document.createElement("div");
  new Inspector(node).rejected(value);
  return node;
}

export function getExpanded(node) {
  if (!isInspector(node)) return;
  const expanded = node.querySelectorAll(".observablehq--expanded");
  if (expanded.length) return Array.from(expanded, (e) => getNodePath(node, e));
}

function isElement(node) {
  return node.nodeType === 1;
}

function isInspector(node) {
  return isElement(node) && node.classList.contains("observablehq");
}

function getNodePath(node, descendant) {
  const path = [];
  while (descendant !== node) {
    path.push(getChildIndex(descendant));
    descendant = descendant.parentNode;
  }
  return path.reverse();
}

function getChildIndex(node) {
  return Array.prototype.indexOf.call(node.parentNode.childNodes, node);
}
