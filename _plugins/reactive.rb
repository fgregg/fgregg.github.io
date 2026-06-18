# Reactive-cell Jekyll plugin.
#
# For any post with `reactive: true` in its front matter, the WHOLE body is split
# into an ordered sequence of cells: ```js fences become js cells, and the
# Markdown between them becomes md cells. One Markdown flavor, `${…}` reactive
# anywhere in prose, no display(md`…`) wrappers.
#
# Server-side rendering (issue #20): the Node sidecar (_reactive/transpile.mjs)
# renders each md cell's Markdown to STATIC HTML at build time (same markdown-it
# config as the client `md`), so prose is in the page for crawlers / no-JS. Each
# inline `${…}` becomes a <span> placeholder hydrated client-side — only the span
# updates, the surrounding prose is never re-rendered (true hydration, no flash).
# Cells classified by the sidecar:
#   static   → fully static HTML, no JS at all
#   hydrate  → static HTML + <span data-reactive> placeholders + one reactive var per ${…}
#   cell     → a js cell, OR an md cell with a block-level ${…} (whole-cell md`` render,
#              with a static SSR fallback pre-filled into the mount div)
#
# NOTE: custom plugins require an unsafe Jekyll build (e.g. GitHub Actions),
# not the default GitHub Pages build.
require "json"
require "open3"

module Reactive
  # Self-hosted bundle of the notebook-kit runtime + Plot + Inputs (+ our md/
  # inspector swaps), built by _reactive/bundle-runtime.mjs.
  RUNTIME = "/assets/js/reactive-runtime.js"
  SIDECAR = File.expand_path("../../_reactive/transpile.mjs", __FILE__)

  # match fenced ```js ... ``` blocks
  FENCE = /^```js\s*\n(.*?)\n```$/m

  # Split a whole document body into an ordered list of cells: each ```js fence
  # becomes a {mode: "js"} cell and the Markdown between fences a {mode: "md"} cell.
  def self.split_cells(content)
    cells = []
    last = 0
    content.scan(FENCE) do
      m = Regexp.last_match
      pre = content[last...m.begin(0)]
      cells << {mode: "md", source: pre} unless pre.strip.empty?
      cells << {mode: "js", source: m[1]}
      last = m.end(0)
    end
    tail = content[last..] || ""
    cells << {mode: "md", source: tail} unless tail.strip.empty?
    cells
  end

  def self.transpile(cells, path = nil)
    payload = {cells: cells}
    payload[:path] = path if path
    out, err, status = Open3.capture3("node", SIDECAR, stdin_data: payload.to_json)
    # The sidecar emits a human-readable message (doc, cell, location, snippet)
    # on stderr; surface that directly rather than a raw acorn stack trace.
    raise(err.strip.empty? ? "reactive: transpile failed#{path && " in #{path}"}" : err.strip) unless status.success?
    JSON.parse(out)["cells"]
  end

  # In-page HTML for a cell: static/hydrate prose goes inline; js + md-fallback
  # cells get a mount div (pre-filled with their static SSR fallback, if any).
  def self.node_html(c)
    case c["kind"]
    when "static", "hydrate"
      c["html"]
    else
      %(<div id="cell-#{c["id"]}" class="reactive-cell">#{c["fallbackHtml"]}</div>)
    end
  end

  # JS wiring for a cell: nothing for static; one hydrate() per ${…} for hydrate;
  # one whole-cell define() for cell.
  def self.cell_defs(c)
    case c["kind"]
    when "static"
      []
    when "hydrate"
      c["exprs"].map { |e| %(hydrate(#{e["ref"].to_json}, #{e["inputs"].to_json}, #{e["body"]});) }
    else
      [whole_cell_def(c)]
    end
  end

  def self.whole_cell_def(c)
    <<~JS
      define(
        {root: document.getElementById(`cell-#{c["id"]}`), expanded: [], variables: []},
        {
          id: #{c["id"]},
          body: #{c["body"]},
          inputs: #{c["inputs"].to_json},
          outputs: #{c["outputs"].to_json},
          output: #{c["output"].to_json},
          autodisplay: #{c["autodisplay"]},
          autoview: #{c["autoview"]},
          automutable: #{c["automutable"]}
        }
      );
    JS
  end

  def self.render_script(cells)
    defs = cells.flat_map { |c| cell_defs(c) }.join("\n")
    <<~HTML
      <script type="module">
      import {define, main, Plot, Inputs, d3} from "#{RUNTIME}";
      // Register Plot, Inputs, and d3 as reactive variables so cells that
      // reference them resolve through the dependency graph (not runtime builtins).
      main.variable().define("Plot", [], () => Plot);
      main.variable().define("Inputs", [], () => Inputs);
      main.variable().define("d3", [], () => d3);
      // Hydrate an inline ${…}: bind its reactive value to its placeholder span,
      // updating only that span — never re-render the surrounding (static) prose.
      function hydrate(ref, inputs, body) {
        const el = document.querySelector(`[data-reactive="${ref}"]`);
        if (!el) return;
        main.variable({
          pending() {},
          rejected(error) { console.error(error); },
          fulfilled(value) {
            el.replaceChildren(value instanceof Node ? value : document.createTextNode(value == null ? "" : String(value)));
          }
        }).define(null, inputs, body);
      }
      #{defs}
      </script>
    HTML
  end

  # Resolve Liquid ({% post_url %}, {{ … }}) in the source BEFORE we render
  # Markdown. markdown-it can't parse a link destination containing the spaces in
  # a raw `{% … %}` tag, so it would emit a literal `[text](…)`; and Jekyll's own
  # Liquid pass runs only AFTER this pre_render hook. (Jekyll re-runs Liquid on
  # our HTML output afterward — harmless, nothing left to resolve.)
  def self.resolve_liquid(doc, payload)
    opts = doc.site.config["liquid"] || {}
    info = {
      registers: {site: doc.site, page: payload["page"]},
      strict_filters: opts["strict_filters"],
      strict_variables: opts["strict_variables"],
    }
    template = doc.site.liquid_renderer.file(doc.relative_path).parse(doc.content)
    doc.content = template.render!(payload, info)
  end

  def self.render(doc, payload)
    resolve_liquid(doc, payload)
    cells = split_cells(doc.content)
    return if cells.empty?
    transpiled = transpile(cells, doc.relative_path)
    body = transpiled.map { |c| node_html(c) }.join("\n\n")
    doc.content = body + "\n\n" + render_script(transpiled)
  end
end

Jekyll::Hooks.register [:posts, :documents], :pre_render do |doc, payload|
  next unless doc.data["reactive"]
  # A post triggers this hook under both the :posts and :documents owners, so it
  # fires twice; guard on the already-injected runtime import so we only transform
  # once. (Content is re-read fresh on each rebuild, so this does not wrongly skip
  # in --watch.)
  next if doc.content.include?(Reactive::RUNTIME)

  Reactive.render(doc, payload)
end
