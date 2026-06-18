---
title: Cocktail Ingredients Optimizer
author: Forest Gregg
layout: post
date: 2026-06-02
description: A branch-and-bound search for the set of N bar ingredients that lets you make the most distinct cocktails.
reactive: true
---

For a fixed number of ingredients, which ingredients will let you make the most different cocktails?

This notebook uses a branch and bound algorithm, in a web worker, to try to find the best ingredient list for you. 

Code ported from https://github.com/fgregg/cocktails.

```js
const num_ingredients = view(Inputs.range([2, 129], {
  label: "Number of Ingredients",
  step: 1,
  value: 30
}));
```

With ${num_ingredients} ingredients, you can make ${search_results.length} cocktail(s).

| Cocktail | Ingredients |
|----------|-------------|
${search_results.map((cocktail) => `| ${cocktails.get(cocktail)} | ${cocktail.join(', ')} |`).join("\n")}

Here's the shopping list:

| Ingredient | Number of Cocktails |
|------------|---------------------|
${ingredients.map(details => `| ${details.join(' | ')} |`).join("\n")}

```js
const ingredients = Array.from(
  search_results
    .flat()
    .reduce(
      (accumulator, ingredient) => (
        accumulator.set(ingredient, (accumulator.get(ingredient) ?? 0) + 1),
        accumulator
      ),
      new Map()
    )
    .entries()
).sort((a, b) => b[1] - a[1]);
```

```js
// The original ran this in a Web Worker via @fil/worker. Same idea, written
// directly: serialize the helper functions into a worker (so the long search
// doesn't block the page) and stream the best-so-far via Generators.observe.
const search_results = Generators.observe((notify) => {
  const code = `
heuristicScoring = ${heuristicScoring.toString()};
keepExploring = ${keepExploring.toString()};
totalBound = ${totalBound.toString()};
singletonBound = ${singletonBound.toString()};
isSubsetOf = ${isSubsetOf.toString()};
difference = ${difference.toString()};
union = ${union.toString()};
const search = ${search.toString()};
self.onmessage = (e) => {
  for (const best of search(e.data)) self.postMessage(best);
  self.close();
};
`;
  const url = URL.createObjectURL(new Blob([code], { type: "text/javascript" }));
  const w = new Worker(url);
  w.onmessage = (ev) => notify(ev.data);
  w.postMessage({
    calls: 10000000,
    maxSize: num_ingredients,
    candidates: Array.from(cocktails.keys()),
  });
  return () => {
    w.terminate();
    URL.revokeObjectURL(url);
  };
});
```

```js
function* search(options) {
  const maxSize = options.maxSize;
  let remainingCalls = options.calls;
  let highestScore = 0;
  let highest = [];

  const original_candidates = options.candidates.filter(
    (cocktail) => cocktail.length <= maxSize
  );

  heuristicScoring(original_candidates);
  original_candidates.sort((a, b) => a.cost - b.cost);

  const toExplore = [
    [original_candidates, options.partial ?? [], options.forbidden ?? []]
  ];

  while (toExplore.length > 0 && remainingCalls--) {
    const [candidates, partial, forbidden] = toExplore.pop();
    const score = partial.length;

    if (score > highestScore) {
      highest = [...partial];
      highestScore = score;

      yield highest;
    }

    const partialIngredients = new Set(partial.flat());

    const shouldContinue = keepExploring(
      candidates,
      partial,
      partialIngredients,
      highestScore,
      maxSize,
      forbidden
    );

    if (shouldContinue) {
      const best = candidates[0];

      const newPartialIngredients = union(best, partialIngredients);
      const coveredCandidates = new Set(
        candidates.filter((cocktail) =>
          isSubsetOf(cocktail, newPartialIngredients)
        )
      );

      const permittedCandidates = difference(
        candidates,
        coveredCandidates
      ).filter(
        (cocktail) => union(cocktail, newPartialIngredients).size <= maxSize
      );

      const remaining = candidates.filter(
        (cocktail) =>
          !isSubsetOf(
            best.filter((ingredient) => !cocktail.includes(ingredient)),
            partialIngredients
          )
      );

      toExplore.push([remaining, partial, [...forbidden, best]]);

      toExplore.push([
        permittedCandidates,
        [...partial, ...coveredCandidates],
        forbidden
      ]);
    }
  }
}
```

```js
const heuristicScoring = (candidates) => {
  const cardinality = candidates
    .flat()
    .reduce(
      (acc, ingredient) => (
        acc.set(ingredient, (acc.get(ingredient) ?? 0) + 1), acc
      ),
      new Map()
    );

  candidates.forEach((cocktail) => {
    const cost = cocktail.reduce(
      (sum, ingredient) => sum + 1 / cardinality.get(ingredient),
      0
    );
    cocktail.cost = cost;

    if (cocktail.some((ingredient) => cardinality.get(ingredient) === 1)) {
      cocktail.singular = true;
    } else {
      cocktail.singular = false;
    }
  });
};
```

```js
const keepExploring = (
  candidates,
  partial,
  partialIngredients,
  highestScore,
  maxSize,
  forbidden
) => {
  const threshold = highestScore - partial.length;

  return (
    [totalBound, singletonBound].every(
      (bound) => bound(candidates, partialIngredients, maxSize) > threshold
    ) &&
    !forbidden.some((forbiddenCocktail) =>
      isSubsetOf(forbiddenCocktail, partialIngredients)
    )
  );
};
```

```js
const totalBound = (candidates) => candidates.length;
```

```js
const singletonBound = (candidates, partialIngredients, maxSize) => {
  /**
   * There are many cocktails that have an unique ingredient.
   *
   * Each cocktail with a unique ingredient will cost at least
   * one ingredient from our ingredient budget and the total
   * possible increase due to these unique cocktails is bounded
   * by the ingredient budget
   */

  const nUniqueCocktails = candidates.filter(
    (cocktail) => cocktail.singular
  ).length;

  const ingredientBudget = maxSize - partialIngredients.size;

  const upperIncrement =
    candidates.length -
    nUniqueCocktails +
    Math.min(nUniqueCocktails, ingredientBudget);

  return upperIncrement;
};
```

```js
const cocktails = new ArrayKeyedMap(
  Object.entries(data).map(([name, ingredients]) => [ingredients.sort(), name])
);
```

```js
const isSubsetOf = (A, B) =>
  A.length <= B.size && A.every((element) => B.has(element));
```

```js
const difference = (A, B) => A.filter((element) => !B.has(element));
```

```js
const union = (A, B) => {
  return new Set([...A, ...B]);
};
```

```js
const data = await fetch("/assets/data/cocktail-ingredients-optimizer/ingredients.json").then((r) => r.json());
```

```js
const ArrayKeyedMap = (
  await import("https://esm.sh/array-keyed-map@2.1.3")
).default;
```

