# CINEMA_COMPONENTS
## Version 2.4.1
## Author: Cameron Tauxe
A javascript library containing prebuilt components for viewing and querying Cinema SpecD databases.

**To Do: Once this repository is on Github, update readme with pictures and better formatting because Teamforge has poor markdown support.**

**Requires D3v4**

# Components
### PcoordSVG
A component for viewing and browsing a database on a Parallel Coordinates Chart (rendered with SVG)
### PcoordCanvas
A component for viewing and browsing a database on a Parallel Coordinates Chart (rendered with Canvas)
### Glyph
A component for viewing data on a Glyph Chart
### ImageSpread
A component for viewing image data for a set of data points
### Query
A component that provides an interface for defining a custom data point and querying the database for similar points.
### ScatterPlotSVG
A component for viewing data on a Scatter plot (rendered with SVG)
### ScatterPlotCanvas
A component for viewing data on a Scatter plot (rendered with Canvas)

## Usage
Below is a simple example of a webpage that uses a pcoordSVG component to control the display of an ImageSpread component
```html
<html>
<head>
	<!--Import D3-->
	<script src="lib/d3.min.js"></script>
	<!--Import Cinema Components Library-->
	<script src="CinemaComponents.min.js"></script>
	<!--Include Component's CSS-->
	<link rel='stylesheet' href='css/PcoordSVG.css'>
	<link rel='stylesheet' href='css/ImageSpread.css'>
</head>
<body>
	<!--The component will be placed inside container-->
	<div id="pcoord_container" style="width:500px;height:400px;"></div>
	<div id="spread_container" style="width:100%;height:400px;"></div>
	<script>
		var chart, spread;
		//First create a database
		var database = new CINEMA_COMPONENTS.Database('mydata.cdb',function() {
			//This callback function is called when the database has finished loading
			//Use it to create your components
			chart = new CINEMA_COMPONENTS.PcoordSVG(document.getElementByID('pcoord_container'), database);
			spread = new CINEMA_COMPONENTS.ImageSpread(document.getElementByID('spread_container'),database);

			//Using dispatch events, components can communicate with each other
			chart.dispatch.on('selectionchange',function(selection) {
				spread.setSelection(selection);
			});
		});
	</script>
</body>
</html>
```

# How to Build

The **CinemaComponents.min.js** file can be built with whatever minify-ing tool you prefer, but please be aware of the following rules when building:
* Database.js *must* be included before Component.js
* Component.js *must* be included before Glyph.js, Pcoord.js, ImageSpread.js, Query.js and ScatterPlot.js
* Pcoord.js *must* be included before PcoordSVG.js and PcoordCanvas.js
* ScatterPlot.js *must* be included before ScatterPlotSVG.js and ScatterPlotCanvas.js

# Documentation

## Database
At the heart of CinemaComponents is the Database object. An instance of Database represents all of the data in a SpecD Cinema Database. All components will refer to a Database for their information and occasionally use the functions provided in Database for data processing.
### Constructor
**CINEMA_COMPONENTS.Database(directory,callback,errorCallback)**
- **directory (string)** The path to the '.cdb' directory for the database.
- **callback (function)** Function to call once loading has been succesfully completed. Called with this instance of Database as an argument
- **errorCallback (function)** Function to call if an error occurs while loading. Called with the error message as an argument. Note that if an error occurs, **callback** will never be called.

Example:
```javascript
var myDatabase = CINEMA_COMPONENTS.Database("path/to/database.cdb",done,error);
function done() {console.log("Loaded Succesfully!");}
function error(message) {console.log("Error! " + message);}
```
### Fields
- **directory (string)** The path to the '.cdb' directory for the database.
- **loaded (boolean)** Indicates that the database has finished loading succesfully.
- **error (string)** The error message from loading the database, undefined if no errors.
- **data (Object[])** The Database's data. Each object in the array contains a field for each dimension along with its value. Example below:
```javascript
//myDatabase.data
[
	{phi: "0", theta: "90", x: "42", y: "12", FILE: "0-90-42-12.png"},
	{phi: "90", theta: "0", x: "8", y: "64", FILE: "90-0-8-64.png"},
	{phi: "90", theta: "0", x: "21", y: "34", FILE: "90-0-21-34.png"}
]
```
You will be using this field a lot as most components keep track of data by storing their indices in this array as opposed to the data itself.
- **dimensions (string[])** An array of the names of each dimension in the database.
- **dimensionTypes (Object)** The type (String,Float or Integer) of each dimension. The object has a field named for each dimension. The value of each field is an integer and can be matched with the enum **CINEMA\_COMPONENTS.DIMENSION\_TYPE**
- **dimensionDomains (Object)** The domains covered by each dimension. The object has a field named for each dimension. The value of each field is an array formatted in the way that a D3 Scale would expect in their **domain()** function.
- **hasAxisOrdering (boolean)** Whether or not this database has additional axis ordering data.
- **axisOrderData (Object)** The axis ordering data (if it exists) Formatted like the example below.
```javascript
//myDatabase.axisOrderData
{
	//Each "root-level" field is a category, an array of individual axis orderings
	Rotations: [
		//Each axis ordering has its name/value and the actual order of axes
		{name: "Phi First", order: ["phi","theta"]},//not every dimension needs to be listed
		{name: "Theta First", order: ["theta","phi"]}
	],
	Variables: [
		{name: "X First", order: ["x","y"]},
		{name: "Y First", order: ["y","x"]}
	]
}
```
###Methods
**isStringDimension(dimension)** Returns a boolean representing whether the given dimension is a string-type or not.
**getSimilar(query, threshold)** Get data rows (returned as an array of indices) that are similar to the given data (**query**). Difference between two data points is measured as the Manhattan distance where each dimension is normalized. i.e. The sum of the differencs on each dimension (each scaled from 0 to 1. On string dimensions, the distance is considered 0 if the strings are the same, otherwise 1 NaN values have 0 distance from each other, but 1 from anything else undefined values 0 distance from each other, but 1 from defined values. **query** Does not have to be a data point already in the database, but it must have the same dimensions as the database. **Threshold** is the value that the difference between **query** and data point must be to be considerd "similar."

## Component
All components in CinemaComponents are subclasses of Component. Component contains fields and methods common to all components (though some may be overridden). **Component.js** also contains definitions for some small classes that may be used by components such as **CINEMA\_COMPONENTS.ExtraData** and **CINEMA_COMPONENTS.Margin**
### Usage of Components
Components are built inside DOM elements where they create an interface for interacting with their respective databases. Not all components provide much functionality on their own and are expected to "communicate" with other components through d3.dispatch events. (For example, the query component can query for data points, but does nothing with the query unless another component listens for the query event and does something with it (such as display the results)).
### Constructor
**CINEMA_COMPONENTS.Component(parent, database, filterRegex)**
This constructor is abstract and will throw an error if called directly. You should instead instantiate subclasses of Component. However, the parameters for all components constructors are the same, so they will be listed here.
- **parent (DOM)** The DOM object to build this component inside of. (Anything already in the parent will be removed)
- **database (CINEMA_COMPONENTS.Database)** The database behind this component.
- **filterRegex (RegExp)** A regular expression to filter dimensions out of the component. Any dimensions whose name match it will *NOT* be shown on the component. (Some components may ignore this)
### Fields
These fields are common to all components.
- **parent (DOM)** The DOM object that this component resides in.
- **container (DOM)** The DOM object representing the component itself. Subclasses place their content in here. It has a CSS class of .CINEMA_COMPONENT
- **db (CINEMA_COMPONENTS.Database)** A reference to the Database behind this component.
- **dimensions (string[])** An array of strings representing all the dimensions shown in the component (i.e. after applying filterRegex). Note that this is different than the dimensions field of Database which contains *all* the dimensions in the database.
- **filter (RegExp)** The regular expression used to filter dimensions.
- **dispatch (d3.dispatch)** Any components that use dispatch events will send them from this.
### Methods
These methods are common to all components
**updateSize()** Updates the size of the component to fit inside its parent. This should be called on *all* components whenever their parent changes size. Note that the component will fill the size of its parent exactly (disregarding padding and margins and such).
**destroy()** Remove this component from the scene. This is preferable to simply removing the component directly as some subclasses may need to perform cleanup.

## Glyph
Glyph is a type of component for viewing one data point at a time in a glyph chart.
### Usage
The Glyph offers no user interactivity other than looking at it.
### Events
The Glyph component does not dispatch any events.
### Structure
Inside the container, the glyph consists of an SVG element classed ".glyphChart." Inside that is a path classed ".glyph" representing the glyph being drawn, a group (g) classed ".labels" for all the axis labels, and a group classed ".axisContainer" for the axes. Inside labels, are more groups each classed ".label." Inside each label is a text element with the name of the dimension. Inside axisContainer, are groups classed ".axisGroup" for each dimension. Each axisGroup contains another group classed ".axis" which is where d3 places the axis content.
### Fields
- **selected (number)** The index of the data point being shown. Please do not edit this directly and instead use the **setSelected(index)** function.
- **rotation (d3.scalePoint)** A scale that maps dimensions to the rotation of that dimension's axis around the glyph chart (in radians)
- **scales (Object (d3.scale))** An object (keyed by dimension names) containing scales for each dimension which map a value to a distance from the center on the chart.
### Methods
- **getPath(data)** Get the path (contents of the 'd' attribute) for the given data point.
- **getPoint(dimension, point)** Get x/y coordinates of the point on the chart where the given data point passes through the given dimension's axis. Returned as an object with fields 'x' and 'y'
- **setSelected(index)** Set the selected data point to the one with the given index (will redraw automatically)
- **redraw()** Redraw the glyph path
- **getAxisTransform(dimension)** Get the transform attribute for an axis with the given dimension.
- **getTextRotation(dimension)** Get the rotation (in degrees) for text on an axis with the given dimension. Is rotated so that the text will always appear right-side up.

## Pcoord
Pcoord is a component for displaying and selecting data on a Parallel Coordinates Chart. It is an abstract class and cannot be built on its own. Instead use either a PcoordSVG or PcoordCanvas component which use different methods of rendering paths. Both subclasses expose the same fields and methods so they will be listed here.
### Usage
Data shown on the chart can be filtered by click-and-dragging along an axis. This will create a selection and only show data that passes through the selection. Data can be filtered further by creating selections on other axes. Axes can be re-arranged by click-and-dragging along the axis titles.
### Events
- **'selectionchange'** Triggered when the selection in the chart changes. Called with the array of indices for the new selection as an argument.
- **'mouseover'** Triggered when a path is moused over. Called with the index of the data point (or null if a path was just moused-off) and the corresponding mouse event as arguments.
- **'click'** Triggered when a path is clicked on. Called with the index of the data point and the corresponding mouse event as arguments.
- **'axisorderchange'** Triggered when the axis ordering is manually changed. Called with the list of dimensions in the new order as an argument.
### Structure
Inside the container is a div classed '.pathContainer' and an SVG element classed '.axisContainer'. The contents of pathContainer depend on the particular subclass (SVG or Canvas) of Pcoord. Inside axisContainer are groups for each dimension classed '.axisGroup'. Inside each axisGroup is a group classed '.axis' where d3 builds the axis and a text element classed '.axisTitle' which has the name of the dimension. Each 'axis' group also contains a path, line and text element all classed '.NaNExtension' which represent the area just below the axis for NaN values.
### Fields
- **selection (number[])** The indices of all the currently selected data. Please do not edit this directly and use the **setSelection(number[])** function instead. Otherwise there may be a discrepancy between the selection made on the axes and the data being shown.
- **highlighted (number[])** The indices of all currently highlighted data. Please do not edit this directly and use the **setHighlighted(number[])** function instead.
- **overlayData (CINEMA_COMPONENTS.ExtraData[])** An array of extra data to be overlaid on the chart. Please do not edit this directly and use the **setOverlayData()** function instead.
- **x (d3.scalePoint)** Scale for the x axis on the chart. Maps dimensions to a position along the width of the chart.
- **y (Object (d3.scale))** An object (keyed by dimension names) containing scales for each dimension which map a value to a height on the chart
- **brushExtents (Object (arrays))** An object (keyed by dimension names) containing arrays for each dimension representing the extents (in pixels) of the selection along each axis. Please do not edit this directly.
- **dontUpdateSelectionOnBrush (boolean)** If true, the selection will not changed when brushing along an axis. Useful if changing multiple brushes at once to avoid extraneous updates.
- **smoothPaths (boolean)** Whether or not the paths in the chart should be drawn with smooth curves. Be sure to call redrawPaths() after changing this.
### Methods
- **updateSelection()** Update the selection according to the state of brushExtents. If the selection has changed, will trigger the 'selectionchange' event.
- **setSelection(selection)** Set the selections on each axis to encapsulate all the data represented by the given list of indices. Note that the final selection may contain more data than is listed in the given array.
- **setHighlightedPaths(indices)** Set the highlighted data to the data with the given indices.
- **setOverlayPaths(data)** Set the overlays on the chart to the data from the given array of **CINEMA_COMPONENTS.ExtraData** objects.
- **redrawPaths()** Shortcut method to redraw all paths. Calls **redrawSelectedPaths()**,**redrawHighlightedPaths()** and **redrawOverlayPaths()**.
- **redrawSelectedPaths()** Redraw all the currently selected paths. Actual implementation depends on the particular subclass of Pcoord.
- **redrawHighlightedPaths()** Redraw all the currently highlighted paths. Actual implementation depends on the particular subclass of Pcoord.
- **redrawOverlayPaths()** Redraw all of the overlay data. Actual implementation depends on the particular subclass of Pcoord.
- **setAxisOrder(order)** Set the order of the axes to the order in the given list of dimensions. This will *not* trigger the 'axisorderchange' event, which is only for when they are changed manually (by clicking and dragging).
- **getPath(data)** Get the path (contents of the 'd' attribute) for the given data point.
- **getXPosition(dimension)** Get the x-coordinate for the given dimension on the chart.
- **getYPosition(dimension, point)** Get y-coordinate of the point on the chart where the given data point passes through the given dimension's axis.
### Difference between PcoordSVG and PcoordCanvas
The contents of pathContainer is different for the SVG and Canvas versions of Pcoord. For SVG, pathContainer contains an SVG element with groups inside it for selected paths, highlighted paths and overlay paths, classed '.selectedPaths', '.highlightedPaths' and '.overlayPaths' respectively. Each group contains SVG Path elements. In selectedPaths, each path has, as an attribute, the index of its corresponding data point (called "index"). For Canvas, pathContainer contains canvases classed '.selectedCanvas', '.highlightedCanvas', and '.overlayCanvas' where paths are drawn. There is also an invisble canvas '.indexCanvas' that is used for determining mouse events.

## Query
Query is a component for defining a custom data point and querying the database for data similar to it.
### Usage
The query panel contains a slider for every numeric dimension in the database. Adjusting these sliders defines a value along that dimension for the custom data point. The checkbox next to each slider indicates whether or not to include that dimension in the query. The "Threshold" input defines the threshold value for the query. Pressing the "Find Similar" button performs the query. The results of the query are not represented in the component but instead given out with an event and is expected to be recieved by other components.
### Events
- **'query'** Triggered when a query is made. Called with the results of the query (as a list of indices) as an argument.
- **'customchange'** Triggered when the custom-defined data point for the query is changed. Called with an array containing **custom**,**upper** and **lower** extra data (in that order) as an argument.
### Structure
Inside the container is a button to perform the query classed '.queryButton', a number-type input for the threshold classed '.thresholdInput' along with a span label for it classed '.thresholdLabel'. There is also a span classed '.readout' which displays the number of results of a query and a div classed '.inputRow' for every dimension. Each inputRow contains a span classed '.label' which has the name of the dimension, a checkbox classed and a range-type input (no class).
### Fields
- **results (number[])** An array of indices for the results of the last query performed.
- **custom (CINEMA_COMPONENTS.ExtraData)** The custom-defined data point.
- **upper (CINEMA_COMPONENTS.ExtraData)** Approximation of the upper-bound of the query given the threshold.
- **lower (CINEMA_COMPONENTS.ExtraData)** Approximation of the lower-bound of the query given the threshold.
- **scales (Object)** An object (keyed by dimension names) containing scales for slider. Maps a value from 0 to 100 to a value in a dimension.

## ScatterPlot
ScatterPlot is a component for viewing data on a 2D Scatter Plot. It is an abstract class and cannot be built on its own. Instead use either a ScatterPlotSVG or ScatterPlotCanvas component which use different methods of rendering points. Both subclasses expose the same fields and methods so they will be listed here.
### Usage
Selected data points are displayed on the Scatter Plot. The dimensions used on the plot can be changed with the select elements on the left and bottom sides of the chart.
### Events
- **'mouseover'** Triggered when a data point is moused over. Called with the index of the moused-over data (or null if a point is moused-off) and the corresponding mouse event as arguments.
- **'xchanged'** Triggered when the x dimension being viewed is changed. Called with the new dimension as an argument.
- **'ychanged'** Triggered when the y dimension being viewed is changed. Called with the new dimension as an argument.
### Structure
In the container, there is a div classed '.pointContainer' two SVG elements classed '.axisContainer.x' and '.axisContainer.y' and two select elements classed '.dimensionSelect.x' and '.dimensionSelect.y'. Inside each axisContainer, is a group classed '.axis' where d3 builds the axis content.
### Fields
- **selection (number[])** The indices of all the currently selected data. Please do not edit this directly and use the **setSelection(number[])** function instead.
- **highlighted (number[])** The indices of all currently highlighted data. Please do not edit this directly and use the **setHighlighted(number[])** function instead.
- **overlayData (CINEMA_COMPONENTS.ExtraData[])** An array of extra data to be overlaid on the chart. Please do not edit this directly and use the **setOverlayData()** function instead.
- **xDimension (string)** The currently selected dimension for the x axis.
- **yDimension (string)** The currently selected dimension for the y axis.
- **x (d3.scale)** The scale for the x axis. Maps a value in the dimension to a value along the width of the chart.
- **y (d3.scale)** The scale for the y axis. Maps a value in the dimension to a value along the height of the chart.
### Methods
- **setSelection(selection)** Set data displayed in the chart to the data with the given indices.
- **setHighlightedPoints(indices)** Set the highlighted data to the data with the given indices.
- **setOverlayPoints(data)** Set the overlays on the chart to the data from the given array of **CINEMA_COMPONENTS.ExtraData** objects.
- **redrawPoints()** Shortcut method to redraw all points. Calls **redrawSelectedPoints()**,**redrawHighlightedPoints()** and **redrawOverlayPoints()**.
- **redrawSelectedPoints()** Redraw all the currently selected points. Actual implementation depends on the particular subclass of ScatterPlot.
- **redrawHighlightedPoints()** Redraw all the currently highlighted points. Actual implementation depends on the particular subclass of ScatterPlot.
- **redrawOverlayPoints()** Redraw all of the overlay data. Actual implementation depends on the particular subclass of ScatterPlot.
- **getPlottablePoints(selection)** Filter the given selection to only the indices of data that can be plotted and return the new selection. Data cannot be plotted if it has NaN or undefined values in at least one of the two dimensions being viewed.
### Difference between ScatterPlotSVG and ScatterPlotCanvas
The contents of pointContainer is different for the SVG and Canvas versions of ScatterPlot. For SVG, pointContainer contains an SVG element with groups inside it for selected points, highlighted points and overlay points, classed '.selectedPoints', '.highlightedPoints' and '.overlayPoints' respectively. Each group contains SVG Circle elements. For Canvas, pointContainer contains canvases classed '.selectedCanvas', '.highlightedCanvas', and '.overlayCanvas' where points are drawn. There is also an invisble canvas '.indexCanvas' that is used for determining mouse events.

## ImageSpread
ImageSpread is a component for viewing the FILE data associated with a selection of data as a spread of images.
### Usage
The file data for all selected data is displayed in boxes. Each box represents a data point and contains a display for each FILE dimension of the data. Valid images (PNG,GIF,JPEG) are displayed while other filetypes have text explaining that they couldn't be displayed. An image can be clicked on to reveal the full-size image. If the boxes extend outside of the size of the component, it can be scrolled through to reveal more. If there is more data selected than can fit on a single page, buttons will appear at the bottom of the component to select different pages. Settings for displaying and sorting the data are in the header at the top of the component.
### Events
- **'mouseover'** Triggered when a box is moused over. Called with the index of the corresponding data (or null if a box is moused-off) and the corresponding mouse event as arguments.
### Structure
In the container are divs classed '.header' and '.imageContainer'. The header contains controls for browsing the data, each set of controls is in a div classed '.controlPanel' Each controlPanel contains a span classed '.label' and necessary inputs. For every selected data point imageContainer has a div classed '.dataDisplay'. In turn, every dataDisplay has a div classed '.fileDisplay' for every FILE dimension in the data. In each fileDisplay is a div classed either '.display.image' or '.display.text' depending on whether it contains a valid image or text for an invalid filetype. display.image divs contain an img element while display.text divs contain plain text. Each fileDisplay also has a div classed '.displayLabel' which contains the name of the dimension.

If there are no FILE dimensions in the data, the only contents of imageContainer is div classed '.noFileWarning' with text saying so.

If there are multiple pages of data the container also has a div classed '.pageNavWrapper' for the page navigation widget. in pageNavWrapper is a ul element classed '.pageNav' and a div clased '.pageReadout'. Every li element in pageNav is classed '.pageButton.'
### Fields
- **hasFileDimensions (boolean)** Whether any FILE dimensions exist in the dataset.
- **selection (number[])** Indices of all the data points to display. Please do not edit this directly and instead use the **setSelection(indices)** function.
- **currentPage (number)** The number of the page currently being viewed.
- **pageSizeNode (DOM (select))** The select element for controlling page size.
- **sortNode (DOM (select))** The select element for controlling which dimension to sort by.
- **sortOrderNode (DOM (checkbox))** The input/checkbox element for controlling the sort order.
- **imageSizeNode (DOM (slider))** The input/range element for controlling image preview size.
### Methods
- **setSelection(indices)** Set the selected data to the data with the given indices.
- **getSortComparator()** Get the function used to sort data depending on the values of sortNode and sortOrderNode.
- **populateResults()** Fill the imageContainer with dataDisplays for the current page of results.
- **createModalImg()** An event handler for img element that will create a modal overlay of the image when it is clicked.
- **updatePageNav()** Calculate the number of pages needed to display all the selected results and rebuild the page navigation widget.

# Changelog
### Version 2.4.1
- Fixed Database not loading files in Safari
### Version 2.4
- Added PcoordCanvas and ScatterPlotCanvas components
- Databases now allow for axis_order.csv files to not specify every dimension
- Added 'xchanged' and 'ychanged' events to ScatterPlot
### Version 2.3
- Added ScatterPlotSVG Component
- Databases now verfiy that there are at least two dimensions when error-checking
### Version 2.2
- Databases now support extra axis ordering information (in axis_order.csv files)
- Added setAxisOrder to Pcoord Component
- Added dispatch 'axisorderchanged' to Pcoord Component
### Version 2.1
- Added ImageSpread and Query components (ported over from pcoord_viewer project)
- Added destroy() function to Component
### Version 2.0
- First release of this major rewrite

# To Do

- Rewrite examples.
