---
title: Cocktail Optimization, an Integer Programming Problem  
author: Forest Gregg
layout: post
date: 2026-06-18
description: Stocking your bar is an instance of the Densest k-Subhypergraph problem
reactive: true
---
I've been interested in [integer programming](https://en.wikipedia.org/wiki/Integer_programming)
problems for a long time (they the most interesting problems in [dedupe](https://github.com/dedupeio/dedupe/)). 
In the past, I approached them by writing custom [branch-and-bound algorithms](https://en.wikipedia.org/wiki/Branch_and_bound).

I have been using [Google's OR Tools](https://developers.google.com/optimization) for
a project that involves a lot of vehicle routing, and I started to wonder how these mixed integer
linear programming solvers would do against my lovingly crafted algorithms.

They utterly surpass them. These solvers are technical marvels, containing the congealed 
knowledge of thousands of hours of research and engineering. Of course my code wasn't 
really going to compete.

A few years ago, I wrote [a branch-and-bound solver for the problem of maximizing the number
of cocktails you can make with certain number of ingredients on your cocktail tray]({% post_url 2025-01-21-cocktail-ingredients-optimizer %}). 
I was pretty proud of it, but if you set your ingredient budget to 30, it will take many minutes to find
the optimum solution, and it would basically never stop looking for a better one. 

As you can
see below, with [glpk.js](https://github.com/jvail/glpk.js/), it takes milliseconds to find 
a final optimum. 


```js
const num_ingredients = view(
  Inputs.range([2, 129], {
    label: "Number of Ingredients",
    step: 1,
    value: 30,
  }),
);
```

With ${num_ingredients} ingredients, you can make ${solution.covered.length} cocktail(s).

```js
display(
  Plot.plot({
    x: { label: "Ingredients on your tray →", domain: [2, 129] },
    y: { label: "↑ Cocktails you can make", domain: [0, 104], grid: true },
    marks: [
      Plot.line(curve, {
        x: "ingredients",
        y: "cocktails",
        stroke: "#552222",
      }),
      // Mark where the slider currently sits on the curve.
      Plot.ruleX([num_ingredients], { stroke: "#552222", strokeOpacity: 0.4 }),
      Plot.dot(
        curve.filter((d) => d.ingredients === num_ingredients),
        { x: "ingredients", y: "cocktails", fill: "#552222", r: 4 },
      ),
      Plot.text(
        curve.filter((d) => d.ingredients === num_ingredients),
        {
          x: "ingredients",
          y: "cocktails",
          text: (d) => d.cocktails,
          dy: -10,
          fill: "#552222",
          fontWeight: "bold",
        },
      ),
    ],
  }),
);
```

| Cocktail | Ingredients |
|----------|-------------|
${orderedCovered.map((c) => `| ${c.name} | ${c.ingredients.join(", ")} |`).join("\n")}

Here's the shopping list:

| Ingredient | Number of Cocktails |
|------------|---------------------|
${shoppingList.map((row) => `| ${row.join(" | ")} |`).join("\n")}

```js
const shoppingList = (() => {
  const counts = d3.rollups(
    solution.covered.flatMap((cocktail) => cocktail.ingredients),
    (uses) => uses.length, // how many chosen cocktails use this ingredient
    (ingredient) => ingredient,
  );
  // Order by each ingredient's current run (consecutive budgets it's been bought,
  // counting down from the slider); ties broken alphabetically.
  return counts.sort(
    (a, b) =>
      currentRun(presence.ingredientPresence, b[0], num_ingredients) -
        currentRun(presence.ingredientPresence, a[0], num_ingredients) ||
      a[0].localeCompare(b[0]),
  );
})();
```


```js
const solution = await (async () => {
  const res = await glpk.solve(
    {
      name: "cocktails",
      objective: problem.objective,
      subjectTo: [...problem.coverage, budget],
      binaries: problem.binaries,
    },
    { msglev: glpk.GLP_MSG_OFF },
  );

  const covered = problem.recipes
    .filter(([name]) => res.result.vars[`make ${name}`] > 0.5)
    .map(([name, ingredients]) => ({ name, ingredients }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return { covered, objective: Math.round(res.result.z) };
})();
```

```js
// Cocktails ordered by their current run — how many budgets in a row (counting
// down from the slider) they've stayed in the solution — longest first. A
// cocktail on the list across many budgets sits at the top; one that just
// (re)appeared drops to the bottom. (Alphabetical until the sweep lands.)
const orderedCovered = [...solution.covered].sort(
  (a, b) =>
    currentRun(presence.cocktailPresence, b.name, num_ingredients) -
      currentRun(presence.cocktailPresence, a.name, num_ingredients) ||
    a.name.localeCompare(b.name),
);
```

```js
// How many budgets in a row — counting DOWN from K — this key has stayed in the
// solution: its current run length. A single gap resets it to 0, so something
// that dropped off and came back starts its run over.
function currentRun(presence, key, K) {
  const seen = presence.get(key);
  if (!seen) return 0;
  let run = 0;
  for (let k = K; k >= 2 && seen.has(k); k--) run++;
  return run;
}
```

```js
const budget = {
  name: "budget",
  vars: problem.ingredients.map((ingredient) => ({
    name: `buy ${ingredient}`,
    coef: 1,
  })),
  bnds: { type: glpk.GLP_UP, ub: num_ingredients }, // Σ buy[i] ≤ K
};
```

```js
// Solve the integer program for every budget from 2 to 129 once, up front. This
// gives the chart's curve and, as a byproduct, a record of which budgets each
// cocktail / ingredient is chosen at (its "presence"). The tables use that to
// measure each item's current run — how long it's been continuously on the list.
// We notify twice — empty, then the finished result — so the page renders
// immediately and fills in once the (few-second) sweep lands.
// Shared store the sweep fills, created once: the presence maps (which budgets
// each cocktail / ingredient is chosen at) plus a promise that resolves when the
// sweep finishes — so the chart can stream while the tables wait for the
// completed maps.
const sweepState = (() => {
  let finish;
  const done = new Promise((resolve) => (finish = resolve));
  return {
    cocktailPresence: new Map(), // name -> Set of budgets K where it's chosen
    ingredientPresence: new Map(),
    done,
    finish,
  };
})();
```

```js
// Solve the integer program for every budget 2..129 once. Streams the running
// curve so the chart draws itself in, recording presence into `sweepState` as it
// goes; when the sweep finishes it resolves `sweepState.done`.
const curve = Generators.observe((notify) => {
  let cancelled = false;
  const points = [];
  notify(points);
  (async () => {
    for (let n = 2; n <= 129 && !cancelled; n++) {
      const res = await glpk.solve(
        {
          name: "cocktails",
          objective: problem.objective,
          subjectTo: [
            ...problem.coverage,
            {
              name: "budget",
              vars: problem.ingredients.map((ingredient) => ({
                name: `buy ${ingredient}`,
                coef: 1,
              })),
              bnds: { type: glpk.GLP_UP, ub: n },
            },
          ],
          binaries: problem.binaries,
        },
        { msglev: glpk.GLP_MSG_OFF },
      );
      const covered = problem.recipes.filter(
        ([name]) => res.result.vars[`make ${name}`] > 0.5,
      );
      points.push({ ingredients: n, cocktails: covered.length });
      for (const [name, ingredients] of covered) {
        if (!sweepState.cocktailPresence.has(name)) {
          sweepState.cocktailPresence.set(name, new Set());
        }
        sweepState.cocktailPresence.get(name).add(n);
        for (const ingredient of ingredients) {
          if (!sweepState.ingredientPresence.has(ingredient)) {
            sweepState.ingredientPresence.set(ingredient, new Set());
          }
          sweepState.ingredientPresence.get(ingredient).add(n);
        }
      }
      notify(points.slice());
    }
    if (!cancelled) sweepState.finish();
  })();
  return () => {
    cancelled = true;
  };
});
```

```js
// Hand the tables the presence maps exactly twice: empty up front (so they
// render immediately), then the finished maps once the sweep lands — so they
// snap into run order without re-sorting on every streamed step.
const presence = Generators.observe((notify) => {
  notify({ cocktailPresence: new Map(), ingredientPresence: new Map() });
  sweepState.done.then(() =>
    notify({
      cocktailPresence: sweepState.cocktailPresence,
      ingredientPresence: sweepState.ingredientPresence,
    }),
  );
});
```

```js
const problem = (() => {
  const recipes = Object.entries(data);
  const ingredients = [...new Set(recipes.flatMap(([, ings]) => ings))];

  return {
    recipes, // exposed so `solution` can read back which cocktails were chosen
    ingredients, // exposed so `solution` can build the budget row

    // Maximize the number of cocktails we can make.
    objective: {
      direction: glpk.GLP_MAX,
      name: "cocktails",
      vars: recipes.map(([name]) => ({ name: `make ${name}`, coef: 1 })),
    },

    // we want to express that a cocktail can only be made if and only if
    // we hav bought each of its ingredients. one way to exprss this would
    // to have a constraint that of make {cocktail} <= buy {ingredient}
    // for each necessary ingredient. some solvers allow this formulation
    // but glpk doesn't. so we use the equivalent
    // make {cocktail} - buy {ingredient} <= 0
    coverage: recipes.flatMap(([name, ings]) =>
      ings.map((ingredient) => ({
        name: `${name} needs ${ingredient}`,
        vars: [
          { name: `make ${name}`, coef: 1 },
          { name: `buy ${ingredient}`, coef: -1 },
        ],
        bnds: { type: glpk.GLP_UP, ub: 0 },
      })),
    ),

    // Every cocktail and every ingredient is a 0/1 decision.
    binaries: [
      ...recipes.map(([name]) => `make ${name}`),
      ...ingredients.map((ingredient) => `buy ${ingredient}`),
    ],
  };
})();
```

```js
const data = await fetch(
  "/assets/data/cocktail-ingredients-optimizer/ingredients.json",
).then((r) => r.json());
```

```js
const glpk = await (await import("https://esm.sh/glpk.js@4.0.2")).default();
```
