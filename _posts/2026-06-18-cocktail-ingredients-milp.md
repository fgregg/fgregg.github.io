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

| Cocktail | Ingredients |
|----------|-------------|
${solution.covered.map((c) => `| ${c.name} | ${c.ingredients.join(", ")} |`).join("\n")}

Here's the shopping list:

| Ingredient | Number of Cocktails |
|------------|---------------------|
${shoppingList.map((row) => `| ${row.join(" | ")} |`).join("\n")}

```js
const shoppingList = d3
  .rollups(
    solution.covered.flatMap((cocktail) => cocktail.ingredients),
    (uses) => uses.length, // how many chosen cocktails use this ingredient
    (ingredient) => ingredient,
  )
  .sort((a, b) => b[1] - a[1]);
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
// The static half of the model — everything that does NOT depend on the budget.
// Built once from the recipe data and reused on every solve; only the budget
// constraint (in `solution`) changes as you move the slider.
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
