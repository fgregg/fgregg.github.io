---
title: A sqlite data layer for dedupe?
layout: post
description: Thinking through the benefits and costs of sqlite as a data layer for the dedupe library
---


Right now, the [dedupe library](https://github.com/dedupeio/dedupe)
ultimately expects data to be represented as a stream of Python
dictionaries. This design decision has made the library very flexible,
since it does not need to know anything in particular about how the
data is originally stored.

However, this design has two important costs. First, it substantially
limits the places where dedupe can profitably use parallel processing
to take advantage of multiple CPUs. Second, many of the operations of
the library could be done much faster if it was able to know more
about and therefore cooperate more effectively with the data layer.

If the library was built with the expectation that the data was stored
in a sqlite database, the base library could significantly increase
the scale of data that could be processed into the tens of millions


## Benefits

### Costs of interprocess-communication 

Blocking is the clearest example or a problem that should be easy to
do in parallel, but one where we get no advantage of parallel
processing with our current architecture.

Basically, blocking is applying a kind of hash function to thousand or
millions of records where order does not matter. The way that we do
this now is apply the blocking function to a stream of records
represented as python dictionaries, effectively:

```python
block_keys = map(blocking_function, data stream)
```

which can be easily parallelized as

```python
import multiprocessing

pool = multiprocessing.pool(NUM_PROCESSES)

block_keys = pool.imap_unordered(blocking_function, 
                                 data stream)
```

But this ends up not being very useful, because of interprocess communication. 

Basically, the multiprocessing `imap` works like this: the parent
process will pull a chunk of the data from the data stream, pickled
the data to a byte-string, and send the pickled data over a socket to
a child process. The child process will listen on the socket, unpickle
the chunk of data, apply the block_function, then pickle the resulting
block keys, communicate the bytestring back to the parent process,
which, finally, deserializes it.

If the actual application of blocking function is computationally
cheap, then the all benefits are having more than one core working on
the problem overwhelmed by the overhead of all that serializing and
deserializing.

If the data is stored in a relational database, we could parallelize
by having each process separately connect to the database, pull their
own chunk of data from the database, calculate the block keys and
write those block keys for the chunk to the database. While we still
need to effectively serialize/deserialize in our communication with
the database, the number of times we need to pay for that overhead can
be hugely reduced and the per-call overhead will also typically be
much smaller than pickling/unpickling.


### Pushing operations to the data layer

If can build off a relational database, then some of work that that
library is currently doing fairly slowly in Python could be done much
more quickly in the data layer.

Blocking, again, is clear example. 

Many of our blocking functions are very simple. For example, take the
first seven characters of the address field. Even with a good parallel
processing model, it will be very hard for a Python solution to beat

```sql
INSERT INTO block_keys (key, record_id)
SELECT
    substring(address, 1, 7),
    record_id
FROM
    data;
```


### Collateral benefits

While the lowest level dedupe methods operate over streams of
dictionaries, the high level API assumes that the data represented as
a Python dictionary, necessarily stored in memory. This requirement
means that the users of the high level API face a limit in how much
data they can process as it has to fit in memory.

Moving to an architecture that requires the data to be stored in a
relational database would remove that restriction.


## Downsides

### Type Inflexibility

Python objects are very flexible, and dedupe has taken advantage of
that by having comparators that work over numbers, strings, tuples,
and sets.

Relational databases do not have that flexibility. Core sqlite
supports floats, integers, and strings, and bytes and that’s basically
it.

If we use sqlite as the database layer. Then we will either lose the
ability to use compare some types of objects, have to use type
adaptation, or represent the data more indirectly.

[Type adaptation](https://docs.python.org/3.10/library/sqlite3.html#how-to-adapt-custom-python-types-to-sqlite-values)
is another layer of serialization and deserialization on top of the
serialization from sqlite data to python objects. Type adaptations are
written in Python and can introduce significant overhead.

Collection objects like tuples, arrays, and sets can also be
represented in sqlite as normalized tables. This strategy would
significantly increase the complexity of the code of serializing and
deserializing a record from python to sqlite and back. On the other
hand, if the data is represented in a normalized form in the database
then some of the dedupe operations over collections could be pushed
down into the database layer.

Type adaptation is probably the best near-term strategy.


### Table definition generation

if we want to keep something like our existing API, then we need code
to automatically convert a Python dictionary of record to a sqlite
table, which is going to require inferring a SQL table definition from
the Python data.

This is complex. This some reasonable prior art to follow from
[pandas](https://github.com/pandas-dev/pandas/blob/8dab54d6573f7186ff0c3b6364d5e4dd635ff3e7/pandas/io/sql.py#L1845-L1986) or
[sqlite-utils](https://github.com/simonw/sqlite-utils/blob/fc221f9b62ed8624b1d2098e564f525c84497969/sqlite_utils/db.py#L744),
but we would need to write our own, and it’s a boring and bug-prone
piece of functionality.

If we started our library with an existing sqlite table or pandas data
frame, then we could side step much of this, but that would be a very
big departure from the the existing API and would also impose limits
on type flexibility.

### Supporting multiple database engines

While i would recommend that the core library be written with sqlite as the database, many users will want a different database engine. 

If we support that, then that will be another layer of complexity to manage. Something like sqlalchemy may be able to help some, but we are going to need write engine-specific queries for to take advantage of the different facilities of different engines.


