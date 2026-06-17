# Reactive-cell Jekyll plugin.
#
# For any post with `reactive: true` in its front matter, this turns fenced
# ```js code blocks into live Observable reactive cells — the literate-notebook
# experience (cells re-run when their inputs change, display()/view()/Inputs/
# Plot all available) inside an ordinary _posts/ Markdown file.
#
# How: a pre_render hook pulls the ```js blocks out of the raw Markdown, sends
# their sources to a Node sidecar (_reactive/transpile.mjs) that runs Observable
# Notebook Kit's transpiler to infer each cell's reactive dependencies, then
# replaces the blocks with <div id="cell-N"> mount points and emits one
# <script type="module"> that wires the cells via the Observable runtime.
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

  def self.transpile(sources)
    out, err, status = Open3.capture3("node", SIDECAR, stdin_data: {cells: sources}.to_json)
    raise "reactive: transpile failed: #{err}" unless status.success?
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

Jekyll::Hooks.register [:posts, :documents], :pre_render do |doc|
  next unless doc.data["reactive"]

  sources = []
  # replace each ```js block with a mount div, collecting sources in order
  doc.content = doc.content.gsub(Reactive::FENCE) do
    sources << Regexp.last_match(1)
    %(<div id="cell-#{sources.size - 1}" class="reactive-cell"></div>)
  end

  next if sources.empty?

  cells = Reactive.transpile(sources)
  # append the wiring script to the end of the post body
  doc.content += "\n\n" + Reactive.render_script(cells)
end
