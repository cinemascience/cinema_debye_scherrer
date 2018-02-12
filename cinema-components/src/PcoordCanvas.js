'use strict';
(function() {
	/**
	 * CINEMA_COMPONENTS
	 * PCOORD_CANVAS
	 * 
	 * The PcoordSVG Component for the CINEMA_COMPONENTS library.
	 * Contains the constructor for the PcoordCanvas component:
	 * A subclass of Pcoord which draws a Paralell Coordinates chart using canvas elements.
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

	//Require that the Pcoord Component be included
	if (!CINEMA_COMPONENTS.PCOORD_INCLUDED)
		throw new Error("CINEMA_COMPONENTS PcoordCanvas Component requires that Pcoord"+
			" component be included. Please make sure that Pcoord component"+
			" is included BEFORE PcoordCanvas module");

	/** @type {boolean} - Flag to indicate that the PcoordCanvas Component has been included */
	CINEMA_COMPONENTS.PCOORD_CANVAS_INCLUDED = true;

	/**
	 * Constructor for PcoordCanvas Component
	 * Represents a component for displaying and interacting with a database on a parallel coordinates chart
	 * rendered with canvas elements
	 * @param {DOM} parent - The DOM object to build this component inside of
	 * @param {CINEMA_COMPONENTS.Database} database - The database behind this component
	 * @param {RegExp} filterRegex - A regex to determine which dimensions to NOT show on the component
	 */
	CINEMA_COMPONENTS.PcoordCanvas = function(parent, database, filterRegex) {
		var self = this;
		//call super-constructor
		CINEMA_COMPONENTS.Pcoord.call(this,parent,database,filterRegex);

		//Specify that this is a Pcoord Canvas component
		d3.select(this.container).classed('CANVAS',true);

		//Add canvases to pathContainer
		this.selectedCanvas = this.pathContainer.append('canvas')
			.classed('selectedCanvas',true)
			.node();
		this.highlightedCanvas = this.pathContainer.append('canvas')
			.classed('highlightedCanvas',true)
			.node();
		this.overlayCanvas = this.pathContainer.append('canvas')
			.classed('overlayCanvas',true)
			.node();
		//Index canvas is invisible and draws in a unique color for each path
		//Its color data is used to determine which path is being moused over
		this.indexCanvas = this.pathContainer.append('canvas')
			.classed('indexCanvas',true)
			.style('display','none')
			.node();
		//Size/position canvases
		this.pathContainer.selectAll('canvas')
			.style('position','absolute')
			.style('top',this.margin.top+'px')
			.style('left',this.margin.left+'px');

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
		this.pathContainer.on('mousemove', function() {
			var x = d3.mouse(self.selectedCanvas)[0]*self.pixelRatio;
			var y = d3.mouse(self.selectedCanvas)[1]*self.pixelRatio;
			if (x >= 0 && y >= 0) {
				var index = getIndexAtPoint(x,y,self.indexCanvas);
				if (index != -1) {
					if (self.lastMouseMove != self.selection[index]) {
						self.lastMouseMove = self.selection[index];
						self.dispatch.call('mouseover',self,self.selection[index],d3.event);
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
	CINEMA_COMPONENTS.PcoordCanvas.prototype = Object.create(CINEMA_COMPONENTS.Pcoord.prototype);
	CINEMA_COMPONENTS.PcoordCanvas.prototype.constructor = CINEMA_COMPONENTS.PcoordCanvas;

	/**************************
	 * OVERRIDE METHODS
	 **************************/

	CINEMA_COMPONENTS.PcoordCanvas.prototype.updateSize = function() {
		var self = this;
		//call super
		CINEMA_COMPONENTS.Pcoord.prototype.updateSize.call(this);

		//Resize canvases
		this.pathContainer.selectAll('canvas')
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
		selectedContext.strokeStyle = 'lightgray';
		selectedContext.globalAlpha = 0.3;
		selectedContext.lineWidth = 2;
		var highlightedContext = this.highlightedCanvas.getContext('2d');
		highlightedContext.strokeStyle = 'lightskyblue';
		highlightedContext.lineWidth = 4;
		var indexContext = this.indexCanvas.getContext('2d');
		indexContext.lineWidth = 3;

		this.redrawPaths();
	}

	/**
	 * Redraw the current selection of paths.
	 */
	CINEMA_COMPONENTS.PcoordCanvas.prototype.redrawSelectedPaths = function() {
		var self = this;

		var ctx = this.selectedCanvas.getContext('2d');
		ctx.clearRect(0,0,this.internalWidth,this.internalHeight);

		var indexCtx = this.indexCanvas.getContext('2d');
		indexCtx.clearRect(0,0,this.internalWidth,this.internalHeight);

		this.drawIterator = (function*(queue){
			self.loading.style('display','initial');
			var i = 0;
			while (i < queue.length) {
				var path = new Path2D(self.getPath(self.db.data[queue[i]]));
				ctx.stroke(path);

				indexCtx.strokeStyle = indexToColor(i);
				indexCtx.stroke(path);

				yield ++i;
			}
		})(this.selection);
	}

	/**
	 * Redraw the currently highlighted path.
	 */
	CINEMA_COMPONENTS.PcoordCanvas.prototype.redrawHighlightedPaths = function() {
		var self = this;

		var ctx = this.highlightedCanvas.getContext('2d');
		ctx.clearRect(0,0,this.internalWidth,this.internalHeight);

		this.highlighted.forEach(function(d) {
			var path = new Path2D(self.getPath(self.db.data[d]));
			ctx.stroke(path);
		});
	}

	/**
	 * Redraw the overlay paths.
	 */
	CINEMA_COMPONENTS.PcoordCanvas.prototype.redrawOverlayPaths = function() {
		var self = this;

		var ctx = this.overlayCanvas.getContext('2d');
		ctx.clearRect(0,0,this.internalWidth,this.internalHeight);

		this.overlayData.forEach(function(d) {
			//Parse style
			ctx.lineWidth = d.style.lineWidth || 1;
			ctx.lineCap = d.style.lineCap || 'butt';
			ctx.lineJoin = d.style.lineJoin || 'miter';
			ctx.miterLimit = d.style.miterLimit || 10;
			ctx.strokeStyle = d.style.strokeStyle || 'black';
			if (d.style.lineDash)
				ctx.setLineDash(d.style.lineDash);
			else
				ctx.setLineDash([]);
			//Draw line
			var path = new Path2D(self.getPath(d.data));
			ctx.stroke(path);
		})
	}

	/**
	 * Override destroy() to also clear interval
	 */
	CINEMA_COMPONENTS.PcoordCanvas.prototype.destroy = function() {
		clearInterval(this.interval);
		//Call super
		CINEMA_COMPONENTS.Component.prototype.destroy.call(this);
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