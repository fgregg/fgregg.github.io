---
title: Archive
layout: default
---



<div id="tags-list">
{% for tag in site.tags %}
  {% assign tag_name = tag | first %}
  {% assign tag_name_pretty = tag_name | replace: "_", " " | capitalize %}
  <div class="tag-list">
    <div id="#{{ tag_name | slugize }}"></div>
    <h3 class="post-list-heading line-bottom"> In #{{ tag_name }}: </h3>
    <a name="{{ tag_name | slugize }}"></a>
	<p>(<a href="{{site.baseurl}}/feed/by_tag/{{ tag_name | slugize }}.xml">RSS</a>)</p>
    <ul class="post-list post-list-narrow">
     {% for post in site.tags[tag_name] %}
     <li>
       {%- assign date_format = site.minima.date_format | default: "%b %-d, %Y" -%}
         <a href="{{ post.url | relative_url }}">
           {{ post.title | escape }}
         </a>
        - <i>{{ post.date | date: date_format }}</i>
     </li>
     {% endfor %}
    </ul>
  </div>
{% endfor %}
</div>


