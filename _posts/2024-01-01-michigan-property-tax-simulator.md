---
title: Michigan Property Tax Simulator
author: Forest Gregg
layout: post
date: 2024-01-01
description: An interactive simulator of how Michigan property-tax proposals would change a homeowner's bill.
reactive: cellular
---

Michigan property tax regime is mainly determined by two constitutional amendments to the Michigan constitution: the Headlee amendment and Proposal A.

## The Headlee Amendment
Property value can divided into two components, at least in theory: land value and improvement value. Land value increases if more people want to live in a place, the people who want to live there are wealthier, or land use rules are liberalized. Improvement value increases if, for example, people build a building on a vacant lot or replace a single family home with an apartment building.

The 1978 [Headlee amendments to the Michigan constitution](https://legislature.mi.gov/Laws/MCL?objectName=MCL-ARTICLE-IX-31) says that local government can only capture increased property value that comes from improvement value, not from increased land value.

The way that this works is that if the value of land increases more quickly than inflation, then the local tax rate is automatically lowered so that the amount of revenue generated from the increased land value stays the same in real, inflation-adjusted dollars. This lowering can be overridden by local voters.

The increase due to improvements, however, can be mostly captured by local governments. 

If there are no improvements, but the land value increases faster than inflation, the Headlee amendment keeps local tax revenue constant. If there are improvements, then the taxable value of the improvements times the adjusted local tax rate will be added to the local tax revenue.

While the Headlee amendment, prevents growth in local tax revenue from increases in land value, local tax revenue can decrease whenever the growth rate of of land value is less than inflation. This acts as a downward [ratchet on property taxes](https://crcmich.org/PUBLICAT/2020s/2021/rpt411-Michigans_Property_Tax_Limitations_Analysis.pdf). There are [proposals to address this ratcheting mechanism](https://crcmich.org/address-headlee-rollups-together-with-overall-local-government-fiscal-reforms), which do not require any constitutional change.

## Proposal A
Proposal A is about property taxes of individual parcels. So we need to talk about assessed value and taxable value.

Assessed value is the half the the price that the local assessor believes that a property could be sold for. The assessor further divides that value into land value and improvement value. Assessment is itself quite a complicated field, which will will not dwell on here.

Before proposal A, the tax for a parcel was the assessed value times the local tax rate. While the Headlee amendment said overall increases in land value couldn't lead to higher tax revenue (in real dollors), if the land value of one parcel increased more than parcels in other parts of the city, then the tax bill would increase relatively, and often absolutely.

The 1994 [Proposal A](https://www.legislature.mi.gov/Laws/MCL?objectName=mcl-Article-IX-3) constitutional amendment introduced "taxable value." When the ownership of a property is transferred, the taxable value is set to the assessed value. However, every subsequent year, the taxable value is only allowed to increase by at most the rate of inflation or 5% (whichever is less). The taxable value is also not allowed to be more than the assessed value, so if property value growth is slow or negative, then taxable value will converge to the assessed value.

Whenever the ownership of property is transferred, the taxable value is reset to the assessed value, an event called "uncapping." 

If a property is improved by an addition or a new building, then the assessed value of the improvement does get added to the taxable value.

In a rising market, Proposal A means that that long-time property owners will pay a substantially smaller share of tax then newer owners, and when combined with the Headlee amendment, long-timer owners may pay less in absolute, real-dollars.

## Simulation

In order to understand the dynamics of the tax system better, here is a dynamic simulation of the evolution of a tax system with the Headlee amendment and Proposal A.

We start with 100,000 parcels, each assessed at $100,000. We step forward year after year for nine years. In each year, the assessed value increases by ${property_value_growth_rate.toLocaleString(undefined, {style: "percent"})}, any parcel has ${transfer_rate.toLocaleString(undefined, {style: "percent"})} chance of having ownership transfered, which resets the taxable value to the assessed value. Also, each parcel has a ${improvement_rate.toLocaleString(undefined, {style: "percent"})} chance of having an improvement worth ${improvement_increase.toLocaleString(undefined, {style: "percent"})} assessed value being added to the parcel. 

We also set a ${inflation.toLocaleString(undefined, {style: "percent"})} rate. We also start the simulation with a tax rate of 0.005 (5 mills), and let the Headlee adjustments float that down if needed.

You can adjust most of these numbers and see how that changes the assessed value, the taxable value, and tax revenue.

```js
const transfer_rate = view(Inputs.range([0, 0.1], {
  label: "Annual Transfer Rate (how many properties are sold in a year)",
  step: 0.001,
  value: 0.02
}));
```

```js
const inflation = view(Inputs.range([0, 0.1], {
  label: "Annual Inflation",
  step: 0.001,
  value: 0.02
}));
```

```js
const property_value_growth_rate = view(Inputs.range([0, 0.2], {
  label: "Annual Property Value Growth Rate",
  step: 0.01,
  value: 0.05
}));
```

```js
const improvement_rate = view(Inputs.range([0, 0.2], {
  label: "Annual proportion of properties improved",
  step: 0.001,
  value: 0.01
}));
```

```js
const improvement_increase = view(Inputs.range([0, 1], {
  label: "Average value of improvement as proportion of property value",
  step: 0.01,
  value: 0.1
}));
```

```js
const real_dollars = view(Inputs.toggle({
  label: "Inflation Adjusted",
  value: true
}));
```

```js
display(
Plot.plot({
  title: "Simulated Assessed and Taxable Income",
  subtitle: real_dollars ? "Real Dollars" : "Nominal Dollars",
  y: { label: "$ Billions", tickFormat: (d) => d / 1000000000, nice: true },
  marginRight: 100,
  marks: [
    Plot.line(overall_evolution, {
      x: "year",
      y: (d) =>
        d.assessed_value / (real_dollars ? (1 + inflation) ** d.year : 1),
      stroke: "#4269d0"
    }),
    Plot.text(
      overall_evolution,
      Plot.selectLast({
        x: "year",
        y: (d) =>
          d.assessed_value / (real_dollars ? (1 + inflation) ** d.year : 1),
        text: (d) => "Total assessed value",
        textAnchor: "start",
        dx: 3
      })
    ),
    Plot.line(overall_evolution, {
      x: "year",
      y: (d) =>
        d.taxable_value / (real_dollars ? (1 + inflation) ** d.year : 1),
      stroke: "#efb118"
    }),
    Plot.text(
      overall_evolution,
      Plot.selectLast({
        x: "year",
        y: (d) =>
          d.taxable_value / (real_dollars ? (1 + inflation) ** d.year : 1),
        text: (d) => "Total taxable value",
        textAnchor: "start",
        dx: 3
      })
    )
  ]
})
);
```

```js
display(
Plot.plot({
  title: "Simulated Tax Revenue",
  subtitle: real_dollars ? "Real Dollars" : "Nominal Dollars",
  y: {
    label: "$ Millions",
    tickFormat: (d) => d / 1000000,
    domain:
      real_dollars && improvement_rate * improvement_increase === 0.0
        ? [5000000, 5010000]
        : undefined,
    nice: true
  },
  marginRight: 100,
  marks: [
    Plot.line(overall_evolution, {
      x: "year",
      y: (d, i) =>
        (d.taxable_value * headlee_rates[i]) /
        (real_dollars ? (1 + inflation) ** d.year : 1),
      stroke: "#ff725c"
    }),
    Plot.text(
      overall_evolution,
      Plot.selectLast({
        x: "year",
        y: (d, i) =>
          (d.taxable_value * headlee_rates[i]) /
          (real_dollars ? (1 + inflation) ** d.year : 1),
        text: (d) => "Tax revenue",
        textAnchor: "start",
        dx: 3
      })
    )
  ]
})
);
```

## Proposal A as a transfer from newer property owners to longer-term property owners

In a rising property market, Proposal A transfers wealth from new property owners and property owners that have improved their property to longer-term owners and owners who have not made improvements.

One way to see this transfer is by recognizing that Proposal A interacts with the Headlee amendment to slow the automatic lowering of local tax rates. Taxable value, by design, grows much more slowly than assessed value. Since Proposal A makes taxable value the tax base instead of assessed value, it slows the lowering of the tax rate.

So, for each property, we could calculate two values, the actual tax bill under Proposal A and Headlee, and the tax bill would have been without Proposal A.

${tex.block`
\text{bill}_{\text{prop A}} = \text{Taxable Value} \cdot \text{Tax Rate}_{\text{prop A}}\\
\text{bill}_{\text{without prop A}} = \text{Assessed Value} \cdot \text{Tax Rate}_{\text{without prop A}}
`}

The difference in the bills represents a wealth transfer between taxpayers.

${tex.block`
\text{transfer} = \text{bill}_{\text{prop A}} - \text{bill}_{\text{without prop A}} 
`}

If the transfer is positive, then the tax payer is subsidizing others tax payers' lower bills. If the transfer is negative, then tax payer is being subsidized by other tax payers.

```js
display(
Plot.plot({
  title: "Proposal A Wealth Transfer",
  subtitle: real_dollars ? "Real Dollars" : "Nominal Dollars",
  marginRight: 100,
  y: {
    label: "$ Thousands",
    tickFormat: (d) => d / 1000,
    nice: true
  },
  marks: [
    Plot.line(total_transfer, {
      x: "year",
      y: (d) => d.transfer / (real_dollars ? (1 + inflation) ** d.year : 1)
    }),
    Plot.text(
      total_transfer,
      Plot.selectLast({
        x: "year",
        y: (d) => d.transfer / (real_dollars ? (1 + inflation) ** d.year : 1),
        text: (d) => "Wealth Transfer",
        textAnchor: "start",
        dx: 3
      })
    )
  ]
})
);
```

In our simulation, if we look at the transfers in the ninth and last year, we can see the average transfer is related to how long a property owner has owned a property (tenure). On average, property owners who just acquired the property are transferring ${average_transfer.find(d => d.tenure === 0).transfer.toLocaleString(undefined, {style: "currency", currency: "USD"})} to other tax payers and property owners that have had the property for 9 years are receiving ${(-1 * (average_transfer.find(d => d.tenure === 9).transfer)).toLocaleString(undefined, {style: "currency", currency: "USD"})} from other tax payers.

```js
display(
Plot.plot({
  title: "Year 9 Average Transfers by Tenure",
  subtitle: real_dollars ? "Real Dollars" : "Nominal Dollars",
  marks: [
    Plot.dot(average_transfer, {
      x: "tenure",
      y: (d) => d.transfer / (real_dollars ? (1 + inflation) ** 9 : 1)
    })
  ]
})
);
```

```js
const average_transfer = d3
  .flatRollup(
    transfers.filter((d) => d.year === 9),
    (v) => d3.mean(v, (d) => d.transfer),
    (d) => d.tenure
  )
  .map(([tenure, transfer]) => ({ tenure, transfer }))
  .sort((a, b) => a.tenure - b.tenure);
```

```js
const mill = 0.005;
```

```js
const properties_initial = Array.from({ length: 100 }, () => ({
  year: 0,
  property_value: 200_000,
  assessed_value: 100_000,
  taxable_value: 100_000,
  reset_taxable_value: 100_000,
  tenure: 0
}));
```

```js
const evolution = (() => {
  let evolution = [];
  let properties = properties_initial;
  evolution = [...properties];
  for (const year of d3.range(1, 10)) {
    const updated_properties = properties.map((d) => {
      let improvement;
      if (Math.random() < improvement_rate) {
        improvement = d.property_value * improvement_increase;
      } else {
        improvement = 0;
      }
      const property_value =
        d.property_value * (1 + property_value_growth_rate) + improvement;

      let taxable_value;
      let reset;
      if (Math.random() < transfer_rate) {
        taxable_value = property_value / 2;
        reset = true;
      } else {
        taxable_value = Math.min(
          d.taxable_value * (1 + Math.min(inflation, 0.05)) + improvement / 2,
          property_value / 2
        );
        reset = false;
      }

      return {
        ...d,
        property_value: property_value,
        assessed_value: property_value / 2,
        taxable_value: taxable_value,
        year: year,
        improvement: improvement / 2,
        tenure: reset ? 0 : d.tenure + 1,
        reset_taxable_value: reset ? property_value / 2 : d.reset_taxable_value
      };
    });
    evolution = [...evolution, ...updated_properties];
    properties = updated_properties;
  }
  return evolution;
})();
```

```js
display(
d3.flatGroup(evolution, (d) => d.year)
);
```

```js
const overall_evolution = d3
  .flatGroup(evolution, (d) => d.year)
  .map(([year, parcels]) => ({
    year,
    assessed_value: d3.sum(parcels.map((d) => d.assessed_value)),
    taxable_value: d3.sum(parcels.map((d) => d.taxable_value)),
    improvement: d3.sum(parcels.map((d) => d.improvement)) 
  }));
```

```js
const headlee_adjustments = overall_evolution
  .slice(1)
  .map(
    (d, i) =>
      (d.taxable_value - d.improvement) / overall_evolution[i].taxable_value
  )
  .map((d) => (d > inflation + 1 ? (inflation + 1) / d : 1));
```

```js
const headlee_rates = (() => {
  let adjusted_mill = mill;
  const rates = [mill];
  for (const adjustment of headlee_adjustments) {
    adjusted_mill *= adjustment;
    rates.push(adjusted_mill);
  }
  return rates;
})();
```

```js
const non_prop_a_headlee_adjustments = overall_evolution
  .slice(1)
  .map(
    (d, i) =>
      (d.assessed_value - d.improvement) / overall_evolution[i].assessed_value
  )
  .map((d) => (d > inflation + 1 ? (inflation + 1) / d : 1));
```

```js
const non_prop_a_headlee_rates = (() => {
  let adjusted_mill = mill;
  const rates = [mill];
  for (const adjustment of non_prop_a_headlee_adjustments) {
    adjusted_mill *= adjustment;
    rates.push(adjusted_mill);
  }
  return rates;
})();
```

```js
const transfers = evolution.map((d) => {
  const taxable_value_of_purchase =
    d.reset_taxable_value * (1 + inflation) ** d.tenure;
  const assessed_value_of_purchase =
    d.reset_taxable_value * (1 + property_value_growth_rate) ** d.tenure;
  const taxable_value_of_improvement =
    d.taxable_value - taxable_value_of_purchase;
  const assessed_value_of_improvement =
    d.assessed_value - assessed_value_of_purchase;

  return {
    year: d.year,
    tenure: d.tenure,
    transfer:
      headlee_rates[d.year] * taxable_value_of_purchase -
      non_prop_a_headlee_rates[d.year] * assessed_value_of_purchase -
      non_prop_a_headlee_rates[d.year] *
        (assessed_value_of_improvement - taxable_value_of_improvement),
    ...d,
    taxable_value_of_purchase,
    assessed_value_of_purchase,
    taxable_value_of_improvement,
    assessed_value_of_improvement
  };
});
```

```js
const total_transfer = d3
  .flatGroup(transfers, (d) => d.year)
  .map(([year, transfer_year]) => ({
    year,
    transfer: d3.sum(transfer_year.map((d) => d.transfer))
  }));
```

```js
display(
overall_evolution[9].assessed_value * non_prop_a_headlee_rates[9]
);
```

```js
display(
overall_evolution[9].taxable_value * headlee_rates[9] -
  overall_evolution[9].assessed_value * non_prop_a_headlee_rates[9]
);
```

