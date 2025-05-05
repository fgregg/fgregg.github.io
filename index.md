---
layout: default
title: Bunkum
---

<h1>{{ site.posts.first.title }}</h1>
<p class="text-muted">{{ site.posts.first.date | date: '%B %d, %Y' }} | <a href="{{ site.posts.first.url }}">Permalink</a></p>
  {%- if site.posts.first.tags -%}
  <p>
    {% for tag in site.posts.first.tags %}
        <a href="{{site.baseurl}}/archive.html#{{tag | slugize}}">
            #{{ tag }}
        </a>
    {% endfor %}
		</p>

  {%- endif -%}


{{ site.posts.first.content }}

