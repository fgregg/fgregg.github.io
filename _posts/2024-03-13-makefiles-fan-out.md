---
title: It's hard to express a fan-out data flow in Makefiles
author: Forest Gregg
layout: post
description: Makefiles, Snakefiles, and Tupfiles don't let you express fan-out data well.
---

We've been using Makefiles for our reproducible data builds at
DataMade for years, and it's been okay.

The data workflows that are hardest to express in Makefiles are
fan-out flows, which are unfortunately very common.

Here's a simple example of a fan-out (actually a fan-out and fan-in or
scatter-gather flow): download a zip file that contains many CSVs,
remove some unneeded lines from each CSV, and then stack all the
processed CSVs into a single large file.

This can be okay, if you know the names of all the files ahead of
time, but if you dont't, you have to write a recursive
makefile. Besides being a bit of a boggle, the Makefile no longer is
representing a real dependency between creating the data directory and
creating the final data. Instead, you have to call targets in the
right order in the `PHONY` target.


```makefile
.PHONY: all
all :
	make data
	$(MAKE) complete.csv

# Stack all the trimmed CSVs into single file
complete.csv : $(patsubst data/%,%.trimmed,$(wildcard data/*.csv))
	csvstack $^ > $@

# Each CSV needs a few lines trimmed from the top of the file
%.csv.trimmed : data/%.csv
	tail +4 $< > $@

# Unzip a bunch of CSVs
data : data.zip
	unzip $< -d $@
```

[Snakemake](https://snakemake.readthedocs.io/en/stable/) improves on
this a bit with its checkpoint syntax. It is better than a recursive
call, but here too we can't we can’t clearly read off the whole chain
of dependency relations.

```
def csv_dependencies(wildcards):
    output_dir = checkpoints.unzip.get(**wildcards).output[0]
    file_names = expand("{name}.csv.trimmed", 
                        name = glob_wildcards(os.path.join(output_dir, "{name}.csv")).name)
    return file_names

rule all:
    input: csv_dependencies
    output: "complete.csv"
    shell: "csvstack {input} > {output}"

rule:
    input: "data/{name}.csv"
    output: "{name}.csv.trimmed"
    shell: "tail +4 {input} > {output}"

checkpoint unzip:
    input: "data.zip"
    output: directory("data")
    shell: "unzip {input} -d {output}"
```


One reason it's hard to to express the dependency of the CSVs in the
data directory and `data.zip` is that we need to ultimately resolve
the files that `complete.csv` depends on. There can be many
intermediate steps between fanning out the data into the `data` directory and fanning it back in to `complete.csv`, and so we might creating a very long distance
reference, where it would be better to have somethign more local.

[Tupfiles'](https://gittup.org/tup/) bottom-up syntax is better for
this. Assuming that the data directory already exists, a Tupfile might
look like this

```tupfile
: foreach data/*.csv |> tail +4 %f > %o |> %B.csv.trimmed
: *.csv.trimmed |> csvstack %f > %o |> complete.csv
```

I was not able to get `tup` running without setting up FUSE, a
kernel extension, which I did not want to do. But from reading the
docs, I don't think there's a simple way to express the extraction of
the CSVs from the zipfile. Since Tupfiles cannot be recursive, i'm not
even sure it's possible to run a single Tupfile command and build
everything.

It makes sense that build systems that were orginally and primarily built for building
programs do not handle fan-outs well. They show up rarely when creating programs. 

But fan-outs are very common for data builds, and data builds are
very common, and it would be very nice to have a syntax that handled
them elegantly.

If you know of a build system that does this well, please let me know! 

(I know Airflow and Prefect and their sestren exist. I'm looking for a
build system that a reasonable person would actually use on a small,
one-off data build)




