# Cinema:Debye-Scherrer

Cinema:Debye-Scherrer is an interactive visualization tool for exploring datasets.
It has been applied to multi-dataset Rietveld analyses for the validation, scientific discovery, and experimental design.

Cinema:Debye-Scherrer is a web-based data exploration tool built on from the Cinema Components (https://github.com/lanl/cinema_components) and D3 (https://d3js.org/) JavaScript libraries.

# Instructions

In this section, we provide a instructions for common operations.

## Loading the viewer

You can open then open the file ``main.html`` with your preferred browser.

Some browsers may have advanced security settings enabled which prevents reading data files from your computer.
If you encounter problems viewing your datasets, then you can run a simple HTTP server to serve your datasets.
To start a HTTP server using Python on an Unix operating system, in the directory containing ``main.html`` do
```
python -m SimpleHTTPServer
```
Record the port assigned in the terminal from this command; typically, the port assigned is 8000.
Then, you can navigate to ``main.html`` from the URL ``http://localhost:8000/main.html``.

## Input data format

The input data format to Cinema:Debye-Scherrer is a called a Cinema database.
We use the Cinema databse specification D which is described in detail at https://github.com/lanl/cinema/blob/master/specs/dietrich/01/cinema_specD_v011.pdf.
A brief summary of the specification is a directory with a ``data.csv`` file.
This ``data.csv`` file is a comma-delimited ASCII file with a header, and each row corresponds to a data point.
The final set of columns may contain relative paths to images, and these columns must be named ``FILE``, ``FILE2``, etc.
We include a Cinema database as an example in ``data/example.cdb`` with the following directory structure
```
data/
  examples.cdb/
    data.csv
    images/
      DN_500C-B2.png
      DN_700C-B2.png
      UP_030C-B2.png
      UP_200C-B2.png
      UP_400C-B2.png
      UP_600C-B2.png
      UP_800C-B2.png
```

## Adding a new dataset to the viewer

Paths to datasets and information how to view each dataset is stored in the ``databases.json`` in the top-level of this repository.
We include an example how to visualize the example dataset
```
[
        {
                "name" : "Example (All)",
                "directory" : "data/example.cdb",
                "filter" : "FILE",
                "logscale" : "anneal temp|anneal time",
                "smoothLines" : false,
                "lineOpacity" : 1.0
        }
]
```

Each dataset has several attributes.
Required attributes are
  * ``name``: A short description of the dataset.
  * ``directory``: A relative path to the Cinema database.

Optional attributes include ``filter`` which is a regular expression for columns to exclude in the visualization, ``logscale`` which is a regular expression for columns to display on a logarithmic axis, ``smoothLines`` is ``true`` or ``false`` to use curved paths on the parallel coordinates plot, ``lineOpacity`` is an integer from 0 to 1 that 

# Citation

We have submitted an article that details Cinema:Debye-Scherrer to a peer-reviewed journal, and this citation will be updated upon acceptance to a journal.
However, in the meantime, if you use the Cinema:Debye-Scherrer software you may reference our work with the following citation
```
@article{CinemaDebyeScherrer2018,
  author = "{Vogel, S. and Biwer, C. and Rogers, D. H. and Ahrens, J. P. and Hackenberg, R. E. and Onken, D. and Zhang, J.}",
  title = "{Interactive Visualization of Multi-Dataset Rietveld Analyses using Cinema:Debye-Scherrer}",
  year = "{2018}",
  notes = "{Manscript submitted for publication}",
  url = "{https://github.com/lanl/cinema\_debye\_scherrer}"
}
```
