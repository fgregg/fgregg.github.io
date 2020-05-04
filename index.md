---
layout: default
title: Bunkum
---

<h1>{{ site.posts.first.title }}</h1>
<p class="text-muted">{{ site.posts.first.date | date: '%B %d, %Y' }} | <a href="{{ site.posts.first.url }}">Permalink</a></p>

{{ site.posts.first.content }}

