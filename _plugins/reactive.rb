# Reactive-cell Jekyll plugin.
#
# Two modes, chosen by front matter:
#
#   reactive: true      — block mode. Only fenced ```js code blocks become live
#                         Observable reactive cells; the surrounding Markdown is
#                         rendered statically by Jekyll/kramdown as usual.
#
#   reactive: cellular  — cellular mode. The WHOLE body is split into an ordered
#                         sequence of cells: ```js fences become js cells, and
#                         the Markdown between them becomes md cells (compiled
#                         with notebook-kit's transpileTemplate). One Markdown
#                         flavor, `${…}` reactive anywhere in prose, and no
#                         display(md`…`) wrappers. The whole body is then
#                         client-rendered (see issue #20 for the SEO/SSR story).
#
# How: a pre_render hook turns the cells into <div id="cell-N"> mount points,
# sends their sources to a Node sidecar (_reactive/transpile.mjs) that runs
# Observable Notebook Kit's transpiler to infer each cell's reactive
# dependencies, then emits one <script type="module"> that wires the cells via
# the Observable runtime.
#
# NOTE: custom plugins require an unsafe Jekyll build (e.g. GitHub Actions),
# not the default GitHub Pages build.
require "json"
require "open3"

module Reactive
  # Self-hosted, single-file bundle of the notebook-kit runtime + Plot + Inputs,
  # with our DOM-aware inspector swapped in. Built by _reactive/bundle-runtime.mjs.
  # No live third-party dependency at page-load time.
  RUNTIME = "/assets/js/reactive-runtime.js"
  SIDECAR = File.expand_path("../../_reactive/transpile.mjs", __FILE__)

  # match fenced ```js ... ``` blocks
  FENCE = /^```js\s*\n(.*?)\n```$/m

  # Split a whole document body into an ordered list of cells: each ```js fence
  # becomes a {mode: "js"} cell and the Markdown between fences becomes a
  # {mode: "md"} cell. Blank-only Markdown gaps are dropped.
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

  def self.render_script(cells)
    defs = cells.map do |c|
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
    end.join("\n")

    <<~HTML
      <script type="module">
      import {define, main, Plot, Inputs, d3} from "#{RUNTIME}";
      // Register Plot, Inputs, and d3 as reactive variables so cells that
      // reference them resolve through the dependency graph (not runtime builtins).
      main.variable().define("Plot", [], () => Plot);
      main.variable().define("Inputs", [], () => Inputs);
      main.variable().define("d3", [], () => d3);
      #{defs}
      </script>
    HTML
  end
end

module Reactive
  def self.mount_divs(cells)
    cells.map { |c| %(<div id="cell-#{c["id"]}" class="reactive-cell"></div>) }.join("\n\n")
  end

  # Cellular mode: the whole body becomes cells (md + js), in document order.
  def self.render_cellular(doc)
    cells = split_cells(doc.content)
    return if cells.empty?
    transpiled = transpile(cells, doc.relative_path)
    doc.content = mount_divs(transpiled) + "\n\n" + render_script(transpiled)
  end

  # Block mode (legacy): only ```js blocks become cells; prose stays static.
  def self.render_blocks(doc)
    sources = []
    doc.content = doc.content.gsub(FENCE) do
      sources << Regexp.last_match(1)
      %(<div id="cell-#{sources.size - 1}" class="reactive-cell"></div>)
    end
    return if sources.empty?
    cells = transpile(sources, doc.relative_path)
    doc.content += "\n\n" + render_script(cells)
  end
end

Jekyll::Hooks.register [:posts, :documents], :pre_render do |doc|
  next unless doc.data["reactive"]
  # A post triggers this hook under both the :posts and :documents owners, so it
  # fires twice. Block mode is idempotent (no ```js left on the second pass) but
  # cellular mode is not — guard on the already-injected runtime import so we
  # only transform once. (Content is re-read fresh on each rebuild, so this does
  # not wrongly skip in --watch.)
  next if doc.content.include?(Reactive::RUNTIME)

  if doc.data["reactive"].to_s == "cellular"
    Reactive.render_cellular(doc)
  else
    Reactive.render_blocks(doc)
  end
end
