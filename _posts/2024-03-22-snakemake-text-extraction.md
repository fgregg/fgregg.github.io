---
title: Snakemake for PDF text extraction is pretty pleasant
author: Forest Gregg
layout: post
description: A Snakefile for writing a PDF text extraction pipeline is a lot nicer than an equivalent Makefile.
---

For [Chicago Councilmatic](https://chicago.councilmatic.org/), we've wanted to experiment with using a
large language model to write abstracts for the bills.

To do that, we needed the text of the legislation, which are published
as PDFs and Microsoft Word files. Text extraction for the Word files
is pretty easy, but text extraction for PDFs are not.

In our experience, the least maddening way to get text out of PDFs is
to turn each page of the PDF into an image, use an OCR tool like
`tesseract` to turn that image into text, and then recombine that text
back into a single file. OCR is a compute intensive task, so we need
to parallelize that task to get good throughput.

I've written a data pipeline to do that before in a Makefile, and it
was hard to write and even harder to read. This time, we wrote it
using [`snakemake`](https://snakemake.readthedocs.io/en/stable/) and
it was much, much better.

Below is the heavily annotated `Snakefile`.


```
# snakemake defines a domain specific language (DSL), but 
# everything that it does not parse as part of that DSL, 
# it interprets as normal python.
import csv
import pathlib


def text_files(wildcards):
    """
	As the result of some process, we have a CSV with 
	the urls of documents we need to download and 
	process. So, we make a list of the text files that 
	we will ultimately produce. If the orginal document 
	is called "example.pdf," we will want to produce a 
	text file called "example.pdf.txt".
	"""

    with open('urls.csv') as f:
        reader = csv.DictReader(f)
        file_name = [row["url"] for row in reader]

    return expand("{file_name}.txt", file_name=file_name)


# This is default target rule. Running Snakemake will try 
# to extract the text from every document in `urls.csv`
rule all:
    input: text_files


# We have to handle both docx and pdf documents. This is 
# the rule for the docx files. Notice the 
# wildcard_constraint which is just regex.
rule to_text_docx:
    output: "{source_name}.txt"
    input: "{source_name}"
    wildcard_constraints:
        source_name="[a-z0-9-]+\.docx"
    shell:
        """
        pandoc -i {input} -t plain > {output}
        """


def aggregate_texts(wildcards):
    """
	To process the pdfs, we will turn every page of 
	the pdf into a separate image, OCR that image, 
	and then recombine the text files. This function 
	gets the names of the individual page files 
	(which we can't know until we turn the pdf into a 
	bunch of page-images) and turns those into the 
	names of files we will use as dependencies for 
	recombining into a single text file.
	
	Notice that there are *two* kind of wildcards in 
	this text tranformation, which is very ugly to do 
	within a Makefile
	"""
	

    image_directory = pathlib.Path(checkpoints.to_images.get(**wildcards).output[0])
    files = expand(
        f"text/{wildcards.source_name}/page-{{page_num}}.txt",
        page_num=glob_wildcards(image_directory / "page-{page_num}.ppm").page_num,
    )
    return sorted(files)


rule to_text_pdf:
    output: "{source_name}.txt"
    input: aggregate_texts
    wildcard_constraints:
        source_name="[a-z0-9-]+\.(pdf|PDF)"
    shell:
        """
        cat {input} > {output}
        """

rule tesseract:
    output: "text/{source_name}/page-{page_num}.txt"
    input: "images/{source_name}/page-{page_num}.ppm"
    shell:
        """
        mkdir -p text/{wildcards.source_name}
        tesseract -l eng --dpi 150 {input} text/{wildcards.source_name}/page-{wildcards.page_num} txt
        """

# This is the rule that actually turns the PDF into a 
# bunch of images. Notice that it is a "checkpoint" not 
# a "rule." This is how Snakemake allows you to do 
# dynamic dependencies. Also notice that the output is a 
# directory, which is a kind of target Makefiles do not 
# always handle well.
checkpoint to_images:
    output: directory("images/{source_name}/")
    input: "{source_name}"
    wildcard_constraints:
        source_name="[a-z0-9-]+\.(pdf|PDF)"
    shell:
        """
        mkdir {output}
        pdftoppm -r 150 {input} {output}/page
        """
```

This is still complex, but much clearer than the equivalent Makefile.

As of the the posting date of this article, you should use a previous version 
of snakemake.

```
pip install snakemake==7.32.4 PuLP==2.3.1
```

The developers of snakemake recently completed a major refactor, and some of the
checkpoint handling has had regressions, I'm sure it will be fixed soon.
