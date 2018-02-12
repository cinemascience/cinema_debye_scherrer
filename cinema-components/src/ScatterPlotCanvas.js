'use strict';
(function() {
	/**
	 * CINEMA_COMPONENTS
	 * SCATTER_PLOT_CANVAS
	 * 
	 * The ScatterPlotCanvas Component for the CINEMA_COMPONENTS library.
	 * Contains the constructor for the ScatterplotCanvas Component:
	 * A subclass of ScatterPlot which draws data using canvas elements
	 * 
	 * @exports CINEMA_COMPONENTS
	 * 
	 * @author Cameron Tauxe
	 */

	//If CINEMA_COMPONENTS is already defined, add to it, otherwise create it
	var CINEMA_COMPONENTS = {}
	if (window.CINEMA_COMPONENTS)
		CINEMA_COMPONENTS = window.CINEMA_COMPONENTS;
	else
		window.CINEMA_COMPONENTS = CINEMA_COMPONENTS;

	//Require that the ScatterPlot Component be included
	if (!CINEMA_COMPONENTS.SCATTER_PLOT_INCLUDED)
		throw new Error("CINEMA_COMPONENTS ScatterPlotCanvas Component requires that ScatterPlot"+
			" component be included. Please make sure that ScatterPlot component"+
			" is included BEFORE ScatterPlotCanvas module");

	/** @type {boolean} - Flag to indicate that the ScatterPlotSVG Component has been included */
	CINEMA_COMPONENTS.SCATTER_PLOT_CANVAS_INCLUDED = true;

	/**
	 * Constructor for ScatterPlotCanvas Component
	 * Represents a component for displaying data on a 2D Scatter Plot
	 * Rendered with canvas elements
	 * @param {DOM} parent - The DOM object to build this component inside of
	 * @param {CINEMA_COMPONENTS.Database} database - The database behind this component
	 * @param {RegExp} filterRegex - A regex to determine which dimensions to NOT show on the component
	 */
	CINEMA_COMPONENTS.ScatterPlotCanvas = function(parent, database, filterRegex) {
		var self = this;

		//call super-constructor
		CINEMA_COMPONENTS.ScatterPlot.call(this,parent,database,filterRegex);

		//specify that this is a ScatterPlot Canvas component.
		d3.select(this.container).classed('CANVAS',true);

		//Because not every point in the selection will be on the plot,
		//need to keep track of plottablePoints so that their
		//index can be used on indexCanvas
		this.plottablePoints = [];

		//Add canvases to pathContainer
		this.selectedCanvas = this.pointContainer.append('canvas')
			.classed('selectedCanvas',true)
			.node();
		this.highlightedCanvas = this.pointContainer.append('canvas')
			.classed('highlightedCanvas',true)
			.node();
		this.overlayCanvas = this.pointContainer.append('canvas')
			.classed('overlayCanvas',true)
			.node();
		//Index canvas is invisible and draws in a unique color for each path
		//Its color data is used to determine which path is being moused over
		this.indexCanvas = this.pointContainer.append('canvas')
			.classed('indexCanvas',true)
			.style('display','none')
			.node();
		//Size/position canvases
		this.pointContainer.selectAll('canvas')
			.style('position','absolute');

		//Determine screen DPI to rescale canvas contexts
		//(prevents artifacts and blurring on some displays)
		//https://stackoverflow.com/a/15666143/2827258
		this.pixelRatio = (function() {
			var ctx = document.createElement('canvas').getContext("2d"),
				dpr = window.devicePixelRatio || 1,
				bsr = ctx.webkitBackingStorePixelRatio ||
						ctx.mozBackingStorePixelRatio ||
						ctx.msBackingStorePixelRatio ||
						ctx.oBackingStorePixelRatio ||
						ctx.backingStorePixelRatio || 1;
				return dpr / bsr;
		})();

		//Loading/still drawing indicator
		this.loading = d3.select(this.container).append('div')
			.classed('loadingIndicator',true)
			.style('display','none')
			.text('Drawing...');

		//Set an interval to call drawIterator if it exists
		//roughly 60 times a second
		this.interval = setInterval(function(self) {
			for (var i = 0; i < 25; i++) {
				if (self.drawIterator) {
					if (self.drawIterator.next().done) {
						self.drawIterator = undefined;
						self.loading.style('display','none');
					}
				}
			}
		}, 16, this);

		//Set up mousemove listener to get moused-over paths
		this.lastMouseMove = null; //remember last result, to prevent excessive dispatch calls
		this.pointContainer.on('mousemove', function() {
			var x = d3.mouse(self.selectedCanvas)[0]*self.pixelRatio;
			var y = d3.mouse(self.selectedCanvas)[1]*self.pixelRatio;
			if (x >= 0 && y >= 0) {
				var index = getIndexAtPoint(x,y,self.indexCanvas);
				if (index != -1) {
					if (self.lastMouseMove != self.plottablePoints[index]) {
						self.lastMouseMove = self.plottablePoints[index];
						self.dispatch.call('mouseover',self,self.plottablePoints[index],d3.event);
					}
				}
				else {
					if (self.lastMouseMove !== null) {
						self.lastMouseMove = null;
						self.dispatch.call('mouseover',self,null,d3.event);
					}
				}
			}
		});

		this.updateSize();
	}
	//establish prototype chain
	CINEMA_COMPONENTS.ScatterPlotCanvas.prototype = Object.create(CINEMA_COMPONENTS.ScatterPlot.prototype);
	CINEMA_COMPONENTS.ScatterPlotCanvas.prototype.constructor = CINEMA_COMPONENTS.ScatterPlotCanvas;

	/**************************
	 * OVERRIDE METHODS
	 **************************/

	CINEMA_COMPONENTS.ScatterPlotCanvas.prototype.updateSize = function() {
		var self = this;
		//call super
		CINEMA_COMPONENTS.ScatterPlot.prototype.updateSize.call(this);

		//Resize canvases
		this.pointContainer.selectAll('canvas')
			.style('width',this.internalWidth+'px')
			.style('height',this.internalHeight+'px')
		// width/height styles are distinct from attributes
		// (attributes determine context size, style is the size the canvas appears in on screen)
			.attr('width',this.internalWidth*this.pixelRatio+'px')
			.attr('height',this.internalHeight*this.pixelRatio+'px')
			.each(function(){
				this.getContext('2d').scale(self.pixelRatio,self.pixelRatio);
			});
		//Init canvas contexts
		var selectedContext = this.selectedCanvas.getContext('2d');
		selectedContext.fillStyle = 'rgba(82, 137, 163, 0.521)';
		selectedContext.strokeStyle = 'rgb(69, 121, 153)';
		selectedContext.lineWidth = 2;
		var highlightedContext = this.highlightedCanvas.getContext('2d');
		highlightedContext.fillStyle = 'rgb(252, 127, 127)';
		highlightedContext.strokeStyle = 'rgb(153, 80, 80)';
		highlightedContext.lineWidth = 3;

		this.redrawPoints();
	}

	/**
	 * Redraw the current selection of points
	 */
	CINEMA_COMPONENTS.ScatterPlotCanvas.prototype.redrawSelectedPoints = function() {
		var self = this;

		this.plottablePoints = this.getPlottablePoints(this.selection);
		//Update warningReadout
		if (this.plottablePoints.length < this.selection.length)
			this.warningReadout.text((this.selection.length-this.plottablePoints.length) + 
				" point(s) could not be plotted (because they contain NaN or undefined values).");
		else
			this.warningReadout.text('');

		var ctx = this.selectedCanvas.getContext('2d');
		ctx.clearRect(0,0,this.internalWidth,this.internalHeight);

		var indexCtx = this.indexCanvas.getContext('2d');
		indexCtx.clearRect(0,0,this.internalWidth,this.internalHeight);

		this.drawIterator = (function*(queue){
			self.loading.style('display','initial');
			var i = 0;
			while (i < queue.length) {
				var x = self.x(self.db.data[queue[i]][self.xDimension]);
				var y = self.y(self.db.data[queue[i]][self.yDimension]);
				ctx.beginPath();
				ctx.arc(x,y,6,0,2*Math.PI);
				ctx.fill();
				ctx.stroke();

				indexCtx.fillStyle = indexToColor(i);
				indexCtx.beginPath();
				indexCtx.arc(x,y,10,0,2*Math.PI);
				indexCtx.fill();

				yield ++i;
			}
		})(this.plottablePoints);
	}

	/**
	 * Redraw the current selection of points
	 */
	CINEMA_COMPONENTS.ScatterPlotCanvas.prototype.redrawHighlightedPoints = function() {
		var self = this;

		var plottable = this.getPlottablePoints(this.highlighted);

		var ctx = this.highlightedCanvas.getContext('2d');
		ctx.clearRect(0,0,this.internalWidth,this.internalHeight);

		plottable.forEach(function(d) {
			var x = self.x(self.db.data[d][self.xDimension]);
			var y = self.y(self.db.data[d][self.yDimension]);
			ctx.beginPath();
			ctx.arc(x,y,10,0,2*Math.PI);
			ctx.fill();
			ctx.stroke();
		});
	}

	/**
	 * Redraw the overlay points
	 */
	CINEMA_COMPONENTS.ScatterPlotCanvas.prototype.redrawOverlayPoints = function() {
		var self = this;

		var ctx = this.overlayCanvas.getContext('2d');
		ctx.clearRect(0,0,this.internalWidth,this.internalHeight);

		this.overlayData.forEach(function(d) {
			//Parse style
			ctx.lineWidth = d.style.lineWidth || 0;
			ctx.lineCap = d.style.lineCap || 'butt';
			ctx.lineJoin = d.style.lineJoin || 'miter';
			ctx.miterLimit = d.style.miterLimit || 10;
			ctx.strokeStyle = d.style.strokeStyle || 'black';
			ctx.fillStyle = d.style.fillStyle || 'black';
			if (d.style.lineDash)
				ctx.setLineDash(d.style.lineDash);
			else
				ctx.setLineDash([]);
			//Draw line
			var x = self.x(d.data[self.xDimension]);
			var y = self.y(d.data[self.yDimension]);
			ctx.beginPath();
			ctx.arc(x,y,(d.style.r || 6),0,2*Math.PI);
			ctx.fill();
			ctx.stroke();
		});

	}

	//Get the index of the path at the given point
	//using the colors on the index canvas
	//returns -1 if there is no path, or the area around the point is too noisy
	var getIndexAtPoint = function(x,y,canvas) {
		//get the color data for a 3x3 pixel area around the point
		var colorData = canvas.getContext('2d').getImageData(x-1,y-1,3,3).data;
		//get the index for each pixel
		var indices = [];
		for (var i = 0; i < colorData.length/4; i++) {
			indices.push(colorToIndex(colorData.slice(i*4,i*4+3)));
		}

		//for a positive match, must find at least 5 pixels with the same index
		indices.sort();
		var matched = -1;
		var count = 0;
		var counting = -1;
		for (var i = 0; i < indices.length; i++) {
			if (counting != indices[i]) {
				count = 1;
				counting = indices[i];
			}
			else {
				count++;
				if (count == 5) {
					matched = counting;
					break;
				}
			}
		}

		return matched;
	}

	//convert an index value to a color
	//Mapping -1 through 256^3 to rgb(0,0,0) through rgb(255,255,255)
	var indexToColor = function(i) {
		if (i > 256*256*256) {
			return 'rgb(255,255,255)';
		}
		i++;
		var b = Math.floor(i/256/256);
		var g = Math.floor((i - b*256*256) / 256);
		var r = (i - b*256*256 - g*256);
		return 'rgb('+r+','+g+','+b+')';
	}

	//convert a color to an index value
	//Mapping [0,0,0] through [255,255,255] to -1 through 256^3
	var colorToIndex = function(rgb) {
		return (rgb[0] + rgb[1]*256 + rgb[2]*256*256)-1;
	}

})();