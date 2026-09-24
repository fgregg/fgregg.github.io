# Standard.Site link-tag plugin.
#
# Sets each post's AT Protocol record key (rkey) so the post layout can emit a
# matching <link rel="site.standard.document"> tag. This MUST equal the rkey
# _atproto/records.js uses when it publishes the record — keep document_rkey
# byte-for-byte in step with documentRkey() there (which carries the rationale):
#
#   * posts dated before TID_CUTOFF keep their filename stem (e.g.
#     "2022-11-24-lm30") — records created before bsky.social began enforcing
#     the lexicon's `key: tid` rule;
#   * later posts get a deterministic TID: midnight-UTC µs timestamp plus a
#     SHA-256(stem)-derived offset within the day, and a hash-derived clock id.
#
# NOTE: custom plugins require an unsafe Jekyll build (CI), not GitHub Pages'
# default --safe build. See _plugins/reactive.rb.
require "digest"

module StandardSite
  TID_CUTOFF = "2026-09-10".freeze
  # Pre-cutoff posts moved onto a TID rkey; keep in step with MIGRATED_STEMS in
  # _atproto/records.js.
  MIGRATED_STEMS = ["2024-10-18-chicago-births-2009-2020"].freeze
  TID_ALPHABET = "234567abcdefghijklmnopqrstuvwxyz".freeze # base32-sortable
  DAY_MICROS = 86_400_000_000

  def self.encode_tid(n)
    out = +""
    13.times do
      out.prepend(TID_ALPHABET[n & 31])
      n >>= 5
    end
    out
  end

  def self.document_rkey(stem)
    return stem if stem[0, 10] < TID_CUTOFF && !MIGRATED_STEMS.include?(stem)

    year, month, day = stem.match(/\A(\d{4})-(\d{1,2})-(\d{1,2})-/).captures.map(&:to_i)
    midnight_micros = Time.utc(year, month, day).to_i * 1_000_000
    h = Digest::SHA256.digest(stem).unpack1("Q>") # first 8 bytes, big-endian
    micros = midnight_micros + (h % DAY_MICROS)
    clock_id = (h >> 40) & 1023
    encode_tid((micros << 10) | clock_id)
  end

  class Generator < Jekyll::Generator
    safe false
    priority :low

    def generate(site)
      site.posts.docs.each do |post|
        post.data["standard_site_rkey"] = StandardSite.document_rkey(File.basename(post.path, ".md"))
      end
    end
  end
end
