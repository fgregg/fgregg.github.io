# Standard.Site link-tag plugin.
#
# Sets each post's AT Protocol record key (rkey) to its source filename stem
# (e.g. "2022-11-24-lm30") so the post layout can emit a matching
# <link rel="site.standard.document"> tag. This MUST equal the rkey used by
# _atproto/records.js when it publishes the record (which also uses the stem).
#
# NOTE: custom plugins require an unsafe Jekyll build (CI), not GitHub Pages'
# default --safe build. See _plugins/reactive.rb.
module StandardSite
  class Generator < Jekyll::Generator
    safe false
    priority :low

    def generate(site)
      site.posts.docs.each do |post|
        post.data["standard_site_rkey"] = File.basename(post.path, ".md")
      end
    end
  end
end
