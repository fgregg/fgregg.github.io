# Make {% post_url %} emit extensionless URLs.
#
# Jekyll's built-in `post_url` tag resolves a post by name and returns its URL
# ending in `.html` (Jekyll::Tags::PostUrl#render -> relative_url(document)).
# Cloudflare Pages serves the bare path and 308-redirects the `.html` form, so
# those cross-post links are all pre-redirect (same rationale as the og:url
# comment in _layouts/post.html and _plugins/canonical_feed.rb).
#
# Subclassing keeps every bit of the built-in's behavior -- crucially the
# build-time validation: `super` runs the real lookup, which raises
# PostURLError if the referenced post doesn't exist -- and only strips a
# trailing `.html` from the resolved URL. Re-registering it under the same tag
# name means all existing and future `{% post_url %}` links become canonical
# with no per-link changes.
#
# NOTE: custom plugins require an unsafe Jekyll build (CI), not GitHub Pages'
# default --safe build. See _plugins/reactive.rb.
module CanonicalPostUrl
  class Tag < Jekyll::Tags::PostUrl
    def render(context)
      super.sub(%r!\.html\z!, "")
    end
  end
end

Liquid::Template.register_tag("post_url", CanonicalPostUrl::Tag)
