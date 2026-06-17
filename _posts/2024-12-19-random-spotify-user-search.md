---
title: Random Spotify User Search
author: Forest Gregg
layout: post
date: 2024-12-19
description: A trick for finding random Spotify users by searching short prefixes of their user IDs.
reactive: true
---

I like to listen to random playlists as way to get a flavor of strangers' personalities and encounter new music and genre.

I haven't found a way to get a random playlist, but here's a method for finding a random user. 

Spotify users can be identified with a 25 character string of lowercase English letters and the digits 0-9 (base 36?). If you search for short string of characters, it will search for user identifiers that start with string.

A five character prefix usually returns between one and five users, and then you can choose a user and see if they have playlists.

```js
const updateButton = view(Inputs.button("Update"));
```

```js
display(md`App friendly:  <a href="https://play.spotify.com/search/${user_hash_prefix}" target="_blank">https://play.spotify.com/search/${user_hash_prefix}</a>

More specific search for desktop:  <a href="https://play.spotify.com/search/${user_hash_prefix}/users" target="_blank">https://play.spotify.com/search/${user_hash_prefix}/users</a>`);
```

```js
const user_hash_prefix = (() => {
  updateButton;
  
  return choices("abcdefghijklmnopqrstuvwxyz1234567890", 5).join("");
})();
```

```js
const choices = (arr, k) => {
  return [...Array(k)].map((x) => choice(arr));
};
```

```js
const choice = (arr) => {
  return arr[Math.floor(Math.random() * arr.length)];
};
```

