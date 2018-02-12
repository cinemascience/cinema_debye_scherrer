# Cinema:Debye-Scherrer

Cinema:Debye-Scherrer is an interactive visualization tool for exploring datasets.
It has been applied to multi-dataset Rietveld analyses for the validation, scientific discovery, and experimental design.

Cinema:Debye-Scherrer is a web-based data exploration tool built on from the Cinema Components (https://github.com/cmbiwer/cinema_components) and D3 (https://d3js.org/) JavaScript libraries.

# Instructions

In this section, we provide a instructions for common operations.

## Loading the viewer

You can open then open the file ``main.html`` with your preferred browser.

Some browsers may have advanced security settings enabled which prevents reading data files.
If you encounter problems viewing data, then you can run a simple HTTP server.
To start a HTTP server using Python on an Unix operating system, in the directory containing ``main.html`` do
```
python -m SimpleHTTPServer
```
Record the port assigned in the terminal from this command; typically, the port assigned is 8000.
Then, you can navigate to ``main.html`` from the URL ``http://localhost:8000/main.html``.

## Adding a new database

Paths to datasets and information how to view each dataset is stored in the ``databases.json`` in the top-level of this repository.
We include an extra of a dataset.

# Citation

We have submitted an article that details Cinema:Debye-Scherrer to a peer-reviewed journal, and this citation will be updated upon acceptance to a journal.
However, in the meantime, if you use the Cinema:Debye-Scherrer software you may use the following citation to reference our work
```
@article{CinemaDebyeScherrer2018,
  author = "{Vogel, S. and Biwer, C. and Rogers, D. H. and Ahrens, J. P. and Hackenberg, R. E. and Onken, D. and Zhang, J.}",
  title = "{Interactive Visualization of Multi-Dataset Rietveld Analyses using Cinema:Debye-Scherrer}",
  year = "{2018}",
  notes = "{Manscript submitted for publication}",
  url = "{https://github.com/lanl/cinema\_debye\_scherrer}"
}
```
