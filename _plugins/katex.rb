# Build-time LaTeX math, rendered with KaTeX.
#
# Math is written with \(...\) (inline) and \[...\] (display) delimiters — NOT
# $...$, to avoid colliding with the ${...} template literals in reactive js
# cells. The whole point is build-time: KaTeX renders to static HTML here, so the
# math needs no client-side JS and shows up in feeds and with JS disabled.
#
# Sequencing: kramdown (markdown -> HTML) strips backslash delimiters and would
# mangle LaTeX underscores/braces. So we PROTECT the math in pre_render by
# replacing each expression with an opaque placeholder kramdown leaves alone,
# then render and substitute it back in post_render (after conversion).
#
# Watch-safe by design: the placeholder *carries its own LaTeX* (base64-encoded),
# so there is no per-document state that can go stale across incremental
# rebuilds. post_render decodes whatever tokens it finds in the output; it does
# not depend on anything stashed in pre_render. Running pre_render twice on the
# same content is a no-op (no \(...\) delimiters remain to match the second time).
#
# NOTE: requires an unsafe Jekyll build (custom plugin), like the reactive plugin.
require "base64"
require "open3"

module Katex
  SIDECAR = File.expand_path("../../_reactive/katex-render.mjs", __FILE__)
  # \[...\] display, \(...\) inline; non-greedy, across newlines
  DISPLAY = /\\\[(.+?)\\\]/m
  INLINE  = /\\\((.+?)\\\)/m
  # token carries the mode (D/I) and the base64 of the LaTeX. The alphabet is
  # url-safe base64 (A-Za-z0-9-_) plus our fixed affixes, so kramdown treats it
  # as a plain word and won't touch it.
  TOKEN = /KMATH([DI])([A-Za-z0-9\-_]+)HTAMK/

  def self.encode(tex, mode)
    "KMATH#{mode}#{Base64.urlsafe_encode64(tex, padding: false)}HTAMK"
  end

  # Render every KMATH token in `html` to static KaTeX HTML, in one sidecar call.
  def self.render_tokens(html)
    matches = html.scan(TOKEN) # [[mode, b64], ...]
    return html if matches.empty?
    items = matches.map do |mode, b64|
      {tex: Base64.urlsafe_decode64(b64), display: mode == "D"}
    end
    rendered = render_all(items)
    i = -1
    html.gsub(TOKEN) { i += 1; rendered[i] }
  end

  def self.render_all(items)
    payload = items.map.with_index do |it, n|
      o, c = it[:display] ? ['\\[', '\\]'] : ['\\(', '\\)']
      "<!--K#{n}-->#{o}#{it[:tex]}#{c}"
    end.join("\n")
    out, err, st = Open3.capture3("node", SIDECAR, stdin_data: payload)
    raise "katex: #{err}" unless st.success?
    out.split(/<!--K\d+-->/).drop(1).map(&:strip)
  end
end

# 1. PROTECT: \(...\) and \[...\] -> self-describing tokens, before kramdown runs.
Jekyll::Hooks.register [:posts, :documents, :pages], :pre_render do |doc|
  next unless doc.content =~ Katex::DISPLAY || doc.content =~ Katex::INLINE
  c = doc.content
  c = c.gsub(Katex::DISPLAY) { Katex.encode(Regexp.last_match(1), "D") }
  c = c.gsub(Katex::INLINE)  { Katex.encode(Regexp.last_match(1), "I") }
  doc.content = c
end

# 2. RENDER: decode whatever tokens survive into the converted HTML. Stateless —
# works no matter what pre_render did, so incremental rebuilds can't leak tokens.
Jekyll::Hooks.register [:posts, :documents, :pages], :post_render do |doc|
  doc.output = Katex.render_tokens(doc.output) if doc.output&.include?("KMATH")
end
