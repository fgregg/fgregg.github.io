---
title: January 21, 2022 -  Weeknotes
layout: post
description: Weeknotes for January 21, 2022
---

#### Dedupe
I did a [lot of gardening of the dedupe
library](https://github.com/dedupeio/dedupe/issues?page=2&q=is%3Aissue+is%3Aclosed+closed%3A2022-01-15..2022-01-23),
and cut the 2.0.9 version of the library. The big enhancement in this
release was refactoring the [parallelization of scoring
pairs](https://github.com/dedupeio/dedupe/pull/936/files#diff-0af8d57e51708aa45e057ec83aa026a76f6750db803a41edf86054c80e54cc34).

Previously, worker processes pulled chunks of record pairs off a
queue, scored them, and wrote the results to a memmapped numpy
array. Each chunk got its own array backed by a separate file. Then,
the worker would put the name of the file into a result queue.

A collector process would read those filenames from the result queue
and open those files and copy the content into as single, big memmapped
numpy array.

I got rid of that collector process and now the scoring workers write
directly to the same memmapped numpy array. The workers need to know
where in the array they should write, and they communicate that
through a shared memory value, with a built-in locking mechanism.

Python's parallezation paradigm is based on multiple
processes. Inter-process can often be more expensive than the benefits
of using multiple cores, and this change gets rid of two ponts of
inter-process communication.

It also, in my opinion, makes it easier to
follow what's going on.

That said, it probably won't change performance hugely, since we
were just communicating filepaths before and those are quite small.
But still, it's a nice simplification.

#### Musing on even less communication

The real win in performance would be to have the workers produce the 
record pairs themselves. I've been thinking about that for a while, but
have not found an elegant way to do it.

The key problem is how to get workers access to the data. By default, we
represent the record set as python dictionary. This dictionary
can be quite big, and so we don't want to make a copy of each for
process because that could take up too much memory.

For the scoring workers, this dictionary should be read-only. If we
were [creating processes through
forks](https://docs.python.org/3/library/multiprocessing.html#contexts-and-start-methods),
then we could set up the workers so they all had access to the same
dictionary (i.e. same object in memory).

However, forking is not available on Mac OS and Windows, so parent memory is not shared in this way.

So, if we can't use shared memory, then the second best alternative is
to hold the data in database that each process can access
independently.

There's a lot that's attractive about making that move. We are already
using sqlite extensively in the library. 

In order to not radically change the API, we would need to be able to
load the records from a data dictionary into sqlite tables. The
problem is that right now the fields of a record can be of any type,
and sqlite does not have very rich set of native types.

We have comparators for strings, integers, and floats fields. Sqlite
has native support for those. We also have comparators for tuples and
sets and allow people to create arbitrary compartors that could take
arbitrary types.

The [`json1`](https://www.sqlite.org/json1.html) extension might be a
reasonable way of handling tuples and sets. I could also potentially 
handle this by normalizing these array-ish values into a separate table.

It might be acceptable to limit the types that custom comparators can
handle to strings, integers, floats, and arrays of those types.

Hmm... maybe it wouldn't be too bad. 

If we took this step, it would open us up to moving some of the
blocking and even record comparison into sqlite, which could be quite
nice.

### Remarkable 2
[I asked twitter for recommendations for e-readers that handled pdfs
of articles
well](https://twitter.com/forestgregg/status/1482503176934891521). The
resounding recommendation was for a Remarkable 2. I ordered one with
my DataMade annual office-equipment stipend, and it came on
Thursday. So far, I really like it. It's a cool, in a McLuhan
sense, piece of technology.


 
