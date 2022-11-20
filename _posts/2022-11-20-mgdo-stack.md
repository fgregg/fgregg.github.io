---
title: The MGDO Stack
layout: post
description: Small pieces loosely joined
---

Over the past year, I’ve refined a stack for my personal projects that has been productive and fun.

1. Makefile to produce a sqlite database
2. Github Actions as an ETL and scraping platform
3. Datasette as a public data warehouse
4. Observable for data analysis and visualisation 

## Makefile for a sqlite Database
For each dataset, I'll make a repository that turns source data into a sqlite database with a single `make` command. The repositories [follow this template](https://github.com/fgregg/warehouse-etl). 

[csvkit](https://csvkit.readthedocs.io/en/latest/), [sqlite-utils](https://sqlite-utils.datasette.io/en/stable/), and [csvs-to-sqlite](https://pypi.org/project/csvs-to-sqlite/) are often the workhouses of the ETL code. Thanks [Christopher Groskopf](https://twitter.com/onyxfish), [James McKinney](http://www.jamespetermckinney.com/) and [Simon Willison](https://fedi.simonwillison.net/@simon)!

Here are some examples:
* [Illinois Campaign Finance Database](https://github.com/fgregg/ilcampaigncash)
* [Boundaries and Locations of Chicago Public Schools](https://github.com/Chicago-Data-Collaborative-Schools/locations-boundaries)

## Github Actions for ETL and Scraping
[GitHub Actions](https://docs.github.com/en/actions/learn-github-actions/understanding-github-actions) is almost the perfect platform for running ETL jobs and web scraping. It has just about everything you could want.

* Schedulable jobs
* Execution on demand
* Red / Green dashboard for job success
* Email notifications if something goes wrong
* Execution lives next to code
* Serverless
* Simple management of secrets
* Storage of large artifacts
* Parallelism
* A large user base
* Free! (For public repos)

The only real limitation I've run into is that execution time for a single job is limited to six hours, which can be constraining for large scrapes. Getting around this can take some creativity. Often the best solution is to split the job into smaller bites and run many parallel jobs.

Another small challenge is what to do with the large artifacts produced by an ETL. What I do is manually create a release on the github repository, and then use [this github action](https://github.com/WebFreak001/deploy-nightly) to stuff the artifacts in the release. I bet I could smooth this over if I wrote a custom Github Action but I haven't tried yet.

The limit on artifact size attached to a release is 100Gb which has been quite enough so far.

Here's how I set up [the Github Actions script](https://github.com/fgregg/warehouse-etl/blob/main/.github/workflows/build.yml).

### Private Repos
For private jobs, GitHub you get 2000-3000 minutes of execution time for free a month depending on your account type, and then Github charges $0.008/per minute  after that. 

That can get expensive, but GitHub allows you to dispatch github action jobs on your servers. Azure spot instances + [cirun.io](https://cirun.io/) makes intensive use of GitHub actions on private repos very affordable.

That GitHub is owned by Microsoft, and that  I can pay for GitHub actions and also have an option to pay someone else for the server-time are all some comfort on persistence of the service.

## Datasette as a public data warehouse
If you are building things for the web, you need to take [extraordinary care to prevent users of your website from making arbitrary queries](https://en.wikipedia.org/wiki/SQL_injection) against your database. The core conceit of Simon Willison's [Datasette](https://datasette.io/) project is "What if you didn't?"

Datasette allows unauthorized users to make arbitrary `SELECT` queries against sqlite databases, and that ends up being a really powerful thing to do. 

I use it to collect all the sqlite databases that I build into a [publicly](https://labordata.bunkum.us) [accessible](https://puddle.bunkum.us) [data warehouses](https://data.thefoiabakery.org). Folks can ask their own questions of the data, share queries, or download the entire databases.

To my mind, the most important feature of Datasette is that for any query, you can get the results back as JSON. This means the websites provides an JSON API that uses SQL directly. It's amazing.

I have GitHub Actions that run nightly to collect all the databases and pushes the data and code to Google Cloudrun, a scale-to-zero platform. I have CloudFlare set up in front of that, so I'm able to host and serve and 10s of Gb of data a month for less than $5/month.

Here's what the [Github Actions file](https://github.com/labordata/warehouse/blob/main/.github/workflows/build.yml) looks like for the [labordata.bunkum.us](https://labordata.bunkum.us) warehouse.

## Observable for data analysis and visualisation
[Observable](https://observablehq.com) is a lyrical platform for writing JavaScript notebooks for data analysis and visualisation. It has excellent support for working with databases and Datasette instances (using the JSON API I mentioned above).

Many of this notebooks are updated automatically, as the GitHub
actions craetes updated databases, which are pulled into the Datasette
warehouses.

Being able to do arbitrarily complicated SQL queries across multiple tables and then working with the the analysis and visualisation all on a reactive front-end is very, very to fast to build.

Here are some examples:

* [Distribution of days from filing to election](https://observablehq.com/@fgregg/distribution-of-days-from-filing-to-first-election)
* [CPS and Illinois report different graduation rates for Chicago high schools](https://observablehq.com/d/1f3c5386c65501bf)
* [New contracts reported by anti-labor consultants in LM-20 Filings](https://observablehq.com/@fgregg/new-contracts-reported-by-anti-labor-consultants-in-lm-20-fi)

I'm a bit worried about the free lunch ending with Observable some
day, but for now it's a pleasure.


