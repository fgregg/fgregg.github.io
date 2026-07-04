# Canonicalize feed entry URLs.
#
# jekyll-feed builds each entry's <link rel="alternate"> and <content xml:base>
# from `post.url`, which ends in `.html`. Cloudflare Pages serves the bare,
# extensionless path and 308-redirects the `.html` form to it, so the `.html`
# URLs in the feed are all pre-redirect. This strips the extension so feed
# readers land on the canonical URL directly (same rationale as the og:url
# comment in _layouts/post.html).
#
# We post-process the rendered feed rather than vendoring jekyll-feed's
# template because `feed.tags: true` produces several feeds (the main
# /feed.xml plus one per tag under /feed/by_tag/); a hook covers them all,
# whereas a vendored template only overrides the one path it lives at.
#
# The two regexes are anchored to the specific attributes so the CDATA post
# bodies — which legitimately contain `.html` links — are left untouched.
#
# NOTE: custom plugins require an unsafe Jekyll build (CI), not GitHub Pages'
# default --safe build. See _plugins/reactive.rb.
Jekyll::Hooks.register :pages, :post_render do |page|
  next unless page.output_ext == ".xml"
  next unless page.output.include?("http://www.w3.org/2005/Atom")

  page.output = page.output
    .gsub(%r{(<link href="[^"]+?)\.html(" rel="alternate")}, '\1\2')
    .gsub(%r{(<content type="html" xml:base="[^"]+?)\.html(">)}, '\1\2')
end
