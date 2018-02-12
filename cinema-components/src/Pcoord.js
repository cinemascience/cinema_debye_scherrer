'use strict';
(function() {
	/**
	 * CINEMA_COMPONENTS
	 * PCOORD
	 * 
	 * The Pcoord Component for the CINEMA_COMPONENTS library.
	 * Contains the constructor for Parallel Coordinates Components (e.g. PcoordSVG, PcoordCanvas)
	 * It is a sublcass of Component and contains methods and fields common to all Parallel Coordinates Components
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

	//Require that the Component module be included
	if (!CINEMA_COMPONENTS.COMPONENT_INCLUDED)
		throw new Error("CINEMA_COMPONENTS Pcoord module requires that Component"+
			" module be included. Please make sure that Component module"+
			" is included BEFORE Pcoord module");

	//Require that d3 be included
	if (!window.d3) {
		throw new Error("CINEMA_COMPONENTS Pcoord module requires that"+
		" d3 be included (at least d3v4). Please make sure that d3 is included BEFORE the"+
		" the Pcoord module");
	}

	/** @type {boolean} - Flag to indicate that the Pcoord module has been included */
	CINEMA_COMPONENTS.PCOORD_INCLUDED = true;

	/**
	 * Abstract constructor for Pcoord Components
	 * Represents a component for displaying and interacting with a database on a parallel coordinates chart
	 * Objects such as PcoordSVG and PcoordCanvas inherit from this
	 * @param {DOM} parent - The DOM object to build this component inside of
	 * @param {CINEMA_COMPONENTS.Database} database - The database behind this component
	 * @param {RegExp} filterRegex - A regex to determine which dimensions to NOT show on the component
	 */
	CINEMA_COMPONENTS.Pcoord = function(parent, database, filterRegex, logscaleRegex) {
		if (this.constructor === CINEMA_COMPONENTS.Pcoord)
			throw new Error("Cannot instantiate abstract class 'Pcoord'"+
			" Please use a subclass");

		var self = this;

		/***************************************
		 * SIZING
		 ***************************************/
		
		/** @type {CINEMA_COMPONENTS.Margin} Override default margin */
		this.margin = new CINEMA_COMPONENTS.Margin(30,10,10,10);
		/** @type {number} the room left at the bottom of the chart for NaN values */
		this.NaNMargin;

		//call super-constructor
		CINEMA_COMPONENTS.Component.call(this,parent,database,filterRegex,logscaleRegex);
		//after size is calculated in the super-constructor, Set NaNMargin
		this.NaNMargin = this.internalHeight/11;

		/***************************************
		 * DATA
		 ***************************************/

		/** @type {number[]} Indices of all currently selected data */
		this.selection = d3.range(0,this.db.data.length);
		/** @type {number} Indices of all currently highlighted data*/
		this.highlighted = [];
                /** @type {number} Indices of all currently picked data*/
                this.picked = [];
		/** @type {CINEMA_COMPONENTS.ExtraData[]} Custom data to overlay on chart */
		this.overlayData = [];

		/***************************************
		 * EVENTS
		 ***************************************/

		/** @type {d3.dispatch} Hook for events on chart
		 * Set handlers with on() function. Ex: this.dispatch.on('click',handlerFunction(i))
		 * 'selectionchange': Triggered when selection of data changes
		 *     (called with array of indices of selected data)
		 * 'mouseover': Triggered when a path is moused over
		 *     (called with index of moused over data and reference to mouse event)
		 * 'click': Triggered when a path is clicked on
		 *     (called with index of clicked data and reference to mouse event)
		 * 'axisorderchange': Triggered when the axis ordering is manually changed
		 *     (called with the list of the dimensions in the new order)
		 */
		this.dispatch = d3.dispatch("selectionchange","mouseover","click","axisorderchange");

		/***************************************
		 * SCALES
		 ***************************************/

		/** @type {d3.scalePoint} - Scale for x axis on chart
		 * Maps dimensions to position (in pixels) along width of chart.*/
		this.x = d3.scalePoint()
			.domain(this.dimensions)
			.range([0,this.internalWidth])
			.padding(1);



		/** @type {Object(d3.scale)} 
		 * Scales for each dimension axis on the chart. One scale for each dimension */
		this.y = {};
		this.dimensions.forEach(function (d) {
                        //Create log scale
                        if (logscaleRegex ? logscaleRegex.test(d) : true)
                                self.y[d] = d3.scaleLog()
                                        .domain(self.db.dimensionDomains[d])
                                        .range([self.internalHeight-self.NaNMargin,0]);
			//Create point scale for string dimensions
			else if (self.db.isStringDimension(d))
				self.y[d] = d3.scalePoint()
					.domain(self.db.dimensionDomains[d])
					.range([self.internalHeight,0]);
			//Create linear scale for numeric dimensions
			else
				self.y[d] = d3.scaleLinear()
					.domain(self.db.dimensionDomains[d])
					.range([self.internalHeight-self.NaNMargin,0]);
		});

		/***************************************
		 * DRAGGING
		 ***************************************/

		/** @type {Object (numbers)} Keeps track of the x-position of each axis currently being dragged */
		this.dragging = {};

		//Drag event handlers
		this.axisDragStart = function(d) {
			self.dragging[d] = self.x(d);
		};
		this.axisDrag = function(d) {
			self.dragging[d] = Math.min(self.internalWidth,Math.max(0,d3.event.x));
			self.redrawPaths();
			var oldDimensions = self.dimensions.slice();
			self.dimensions.sort(function(a,b){
				return self.getXPosition(a)-self.getXPosition(b);
			});
			if (!arraysEqual(oldDimensions,self.dimensions))
				self.dispatch.call('axisorderchange',self,self.dimensions);
			self.x.domain(self.dimensions);
			self.axes.attr('transform',function(d) {
				return "translate("+self.getXPosition(d)+")";
			});
		};
		this.axisDragEnd = function(d) {
			delete self.dragging[d];
			d3.select(this).attr('transform',"translate("+self.x(d)+")");
			self.redrawPaths();
		};

		/** @type {d3.drag} */
		this.drag = d3.drag()
			.subject(function(d){return {x: self.x(d)};})
			.on('start',this.axisDragStart)
			.on('drag',this.axisDrag)
			.on('end',this.axisDragEnd);

		/***************************************
		 * BRUSHES
		 ***************************************/

		 /** @type {Object (Arrays)} Keeps track of the extents of the brush for each dimension*/
		this.brushExtents = {}

		/** @type {boolean} If true, don't update selection when brushes change */
		this.dontUpdateSelectionOnBrush = false;

		//Brush event handler
		this.axisBrush = function(d) {
			//If this is called due to an event (as opposed to manually called)
			//update corresponding brush extent
			if (d3.event != null) {
				self.brushExtents[d] = d3.event.selection;
				//Ignore brush if its start and end coordinates are the same
				if (self.brushExtents[d] != null && self.brushExtents[d][0] === self.brushExtents[d][1])
					delete self.brushExtents[d];
			}
			if (!self.dontUpdateSelectionOnBrush)
				self.updateSelection();
		}

		/** @type {d3.brushY} The brushes for each axis */
		this.brush = d3.brushY()
			.extent([[-8,0],[8,this.internalHeight]])
			.on('start', function(){d3.event.sourceEvent.stopPropagation();})
			.on('start brush',this.axisBrush);

		/***************************************
		 * DOM Content
		 ***************************************/

		//Create DOM content
		//Specify that this is a Pcoord component
		d3.select(this.container).classed('PCOORD',true);
		/** @type {d3.selection} Where the paths for the chart will be drawn
		 * The actual drawing of paths depends on the specific Pcoord subclass
		 */
		this.pathContainer = d3.select(this.container).append('div')
			.classed('pathContainer',true)
			.style('position','absolute')
			.style('width',this.parentRect.width+'px')
			.style('height',this.parentRect.height+'px');

		/** @type {boolean} Indicates if the lines on the chart should be smooth(curved) or not 
		 * Be sure to call redrawPaths() after changing this so it takes effect
		*/
		this.smoothPaths = true;

		/***************************************
		 * AXES
		 ***************************************/

		/** @type {d3.selection} The container for all axes (as an svg object) */
		this.axisContainer = d3.select(this.container).append('svg')
			.classed('axisContainer',true)
			.style('position','absolute')
			.attr('viewBox',(-this.margin.right)+' '+(-this.margin.top)+' '+
							(this.parentRect.width)+' '+
							(this.parentRect.height))
			.attr('preserveAspectRatio','none')
			.attr('width','100%')
			.attr('height','100%')
			//disable pointer events on axisContainer so it doesn't block pathContainer
			.style('pointer-events','none');
		/** @type {d3.selction} Groups for each axis */
		this.axes = this.axisContainer.selectAll('.axisGroup')
			.data(this.dimensions)
		.enter().append('g')
			.classed('axisGroup',true)
			.attr('transform', function(d) {
				return "translate("+self.x(d)+")";
			})
			.call(this.drag)
		//Add d3 axes to each axis group
		this.axes.append('g')
			.classed('axis',true)
			.each(function(d) {
				d3.select(this).call(d3.axisLeft().scale(self.y[d]));
				if (!self.db.isStringDimension(d))
					self.addNaNExtensionToAxis(this);
			})
		.append('text')
			.classed('axisTitle',true)
			//allow pointer-events on axisTitle so axes can be dragged
			.style('pointer-events','initial')
			.style('text-anchor','middle')
			.attr('y',-9)
			.text(function(d){return d;});
		//Add brush group to each axis group
		this.axes.append('g')
			.classed('brush',true)
			.each(function(){d3.select(this).call(self.brush);});

	};
	//establish prototype chain
	CINEMA_COMPONENTS.Pcoord.prototype = Object.create(CINEMA_COMPONENTS.Component.prototype);
	CINEMA_COMPONENTS.Pcoord.prototype.constructor = CINEMA_COMPONENTS.Pcoord;

	/**
	 * Add an additional line segment and tick to the end of an axis to represent the area
	 * for NaN values.
	 * @param {DOM} node - The DOM node for the svg group containing the axis (g.axis)
	 */
	CINEMA_COMPONENTS.Pcoord.prototype.addNaNExtensionToAxis = function(node) {
		d3.select(node).append('path')
			.attr('class','NaNExtension')
			.attr('d',"M0.5,"+String(this.internalHeight-this.NaNMargin+0.5)+"V"+String(this.internalHeight-0.5));
		var NaNTick = d3.select(node).append('g')
			.attr('class','NaNExtensionTick')
			.attr('transform',"translate(0,"+String(this.internalHeight-0.5)+")");
		NaNTick.append('line')
			.attr('x2','-6');
		NaNTick.append('text')
			.attr('x','-9')
			.attr('dy','0.32em')
			.text('NaN');
	}

	/**
	 * Should be called every time the size of the chart's container changes.
	 * Updates the sizing and scaling of all parts of the chart and redraws
	 */
	CINEMA_COMPONENTS.Pcoord.prototype.updateSize = function() {
		var self = this;
		var oldHeight = this.internalHeight;//old height needed to rescale brushes

		//Call super (will recalculate size)
		CINEMA_COMPONENTS.Component.prototype.updateSize.call(this);

		//update NaNMargin
		this.NaNMargin = this.internalHeight/11;

		//update PathContainer size
		this.pathContainer
			.style('width',this.parentRect.width+'px')
			.style('height',this.parentRect.height+'px');

		//Rescale x
		this.x.range([0,this.internalWidth]);

		//Rescale y scales
		this.dimensions.forEach(function(d) {
			self.y[d].range([self.db.isStringDimension(d) ? self.internalHeight : self.internalHeight-self.NaNMargin, 0]);
		});

		this.redrawPaths();

		//Reposition and rescale axes
		this.axisContainer
			.attr('viewBox',(-this.margin.right)+' '+(-this.margin.top)+' '+
						(this.parentRect.width)+' '+
						(this.parentRect.height));
		this.axes.attr("transform", function(d) {
			return "translate("+self.getXPosition(d)+")";
		});
		this.axes.each(function(d) {
			d3.select(this).call(d3.axisLeft().scale(self.y[d]));
			//if scale is linear, then update the NaN extension on the axis
			if (!self.db.isStringDimension(d)) {
				d3.select(this).select('path.NaNExtension')
					.attr('d',"M0.5,"+String(self.internalHeight-self.NaNMargin+0.5)+"V"+String(self.internalHeight-0.5));
				d3.select(this).select('.NaNExtensionTick')
					.attr('transform',"translate(0,"+String(self.internalHeight-0.5)+")");
			}
		});

		//Redraw brushes
		this.dontUpdateSelectionOnBrush = true; //avoid updating selection when resizing brushes
		this.brush.extent([[-8,0],[8,this.internalHeight]]);
		this.axes.selectAll('g.brush').each(function(d) {
			d3.select(this).call(self.brush);
			d3.select(this).call(self.brush.move, function() {
				if (self.brushExtents[d] == null)
					return null;

				return self.brushExtents[d].map(function(i) {
					return i/oldHeight * self.internalHeight;
				});
			});
		});
		this.dontUpdateSelectionOnBrush = false;
	}

	/**
	 * Called whenever a brush changes the selection
	 * Updates selection to hold the indices of all data points that are
	 * selected by the brushes
	 */
	CINEMA_COMPONENTS.Pcoord.prototype.updateSelection = function() {
		var self = this;
		var newSelection = [];
		this.db.data.forEach(function(d,i) {
			var selected = true;
			for (var p in self.dimensions) {
				var extent = self.brushExtents[self.dimensions[p]];
				if (extent) {
					var y = self.getYPosition(self.dimensions[p],d);
					selected = selected && extent[0] <= y && y <= extent[1];
					if (!selected)
						break;
				}
			}
			if (selected) {
				newSelection.push(i);
			}
		});
		if (!arraysEqual(this.selection,newSelection)) {
			this.selection = newSelection;
			this.dispatch.call("selectionchange",this, this.selection.slice());
			this.redrawSelectedPaths();
		}
	}

	/**
	 * Set the indices of the currently highlighted data
	 */
	CINEMA_COMPONENTS.Pcoord.prototype.setHighlightedPaths = function(indices) {
		this.highlighted = indices;
		this.redrawHighlightedPaths();
	}

        /**
         * Set the indices of the currently picked data
         */
        CINEMA_COMPONENTS.Pcoord.prototype.setPickedPaths = function(indices) {
                this.picked = indices;
                this.redrawSelectedPaths();
        }

	/**
	 * Set the current overlay paths
	 */
	CINEMA_COMPONENTS.Pcoord.prototype.setOverlayPaths = function(data) {
		this.overlayData = data;
		this.redrawOverlayPaths();
	};

	//Shortcut function for redrawSelectedPaths, redrawHighlightedPath, redrawOverlayPaths
	CINEMA_COMPONENTS.Pcoord.prototype.redrawPaths = function() {
		this.redrawSelectedPaths();
		this.redrawHighlightedPaths();
		this.redrawOverlayPaths();
	}

	/**
	 * Set the chart's selection to encapsulate the data represented by
	 * the given array of indices
	 */
	CINEMA_COMPONENTS.Pcoord.prototype.setSelection = function(selection) {
		var ranges = {};
		var self = this;
		this.dimensions.forEach(function(d) {
			ranges[d] = d3.extent(selection, function(i) {
				return self.getYPosition(d, self.db.data[i]);
			});
		});
		this.axes.selectAll('g.brush')
			.each(function(d) {
				d3.select(this).call(self.brush.move, function() {
					return [ranges[d][0]-5,ranges[d][1]+5];
				});
			});
		//call brush event handler
		this.axisBrush();
	}

	/**
	 * Reorder the axes to the order given
	 */
	CINEMA_COMPONENTS.Pcoord.prototype.setAxisOrder = function(order) {
		var self = this;
		//filter out dimensions in order, but not in chart's dimensions
		var order = order.filter(function(d) {
			return self.dimensions.includes(d);
		});
		//Add any dimensions in chart's dimensions but not in order
		this.dimensions.forEach(function(d) {
			if (!order.includes[d])
				order.push(d);
		});
		//update domain
		this.x.domain(order);
		//update dimensions list
		self.dimensions.sort(function(a,b){
			return self.getXPosition(a)-self.getXPosition(b);
		});
		//update axes
		this.axes.attr('transform',function(d) {
			return "translate("+self.getXPosition(d)+")";
		});
		//redraw
		this.redrawPaths();
	}

	/**
	 * Redraw the current selection of paths.
	 * Actual implementation is up to specific subclasses
	 */
	CINEMA_COMPONENTS.Pcoord.prototype.redrawSelectedPaths = function() {
		throw new Error("Cannot call abstract function 'redrawSelectedPaths()'!"+
			" Please override function in a subclass");
	}

	/**
	 * Redraw the currently highlighted path.
	 * Actual implementation is up to specific subclasses
	 */
	CINEMA_COMPONENTS.Pcoord.prototype.redrawHighlightedPaths = function() {
		throw new Error("Cannot call abstract function 'redrawHighlightedPaths()'!"+
			" Please override function in a subclass");
	}

        /**
         * Redraw the currently picked path.
         * Actual implementation is up to specific subclasses
         */
        CINEMA_COMPONENTS.Pcoord.prototype.redrawPickedPaths = function() {
                throw new Error("Cannot call abstract function 'redrawPickedPaths()'!"+
                        " Please override function in a subclass");
        }

	/**
	 * Redraw the overlay paths.
	 * Actual implementation is up to specific subclasses
	 */
	CINEMA_COMPONENTS.Pcoord.prototype.redrawOverlayPaths = function() {
		throw new Error("Cannot call abstract function 'redrawOverlayPaths()'!"+
			" Please override function in a subclass");
	}

	/**
	 * Get the path (the contents of the 'd' attribute) for the path
	 * represented by the given data point.
	 * Draws a physical break in the path where values are undefined.
	 * @param {Object} d The data point to base the path off
	 */
	CINEMA_COMPONENTS.Pcoord.prototype.getPath = function(d) {
		var self = this;
		var curveLength = this.smoothPaths ? this.internalWidth/this.dimensions.length/3 : 0;
		var singleSegmentLength = this.internalWidth/this.dimensions.length/5;
		var path = '';

		//Split dimensions into sections deliminated by undefined values
		var sections = [];
		var currentSection = [];
		this.dimensions.forEach(function(p) {
			if (d[p] != undefined) {
				currentSection.push(p);
			}
			else if (currentSection.length != 0) {
				sections.push(currentSection.slice());
				currentSection = [];
			}
		});
		if (currentSection.length > 0)
			sections.push(currentSection.slice());

		//Draw individual sections
		sections.forEach(function(section) {
			//If a section contains only one dimension, draw a short line across the axis
			if (section.length == 1) {
				var p = section[0];
				var x = self.getXPosition(p);
				var y = self.getYPosition(p,d);
				path += ('M '+(x-singleSegmentLength/2)+' '+y+' L ')+
						((x+singleSegmentLength/2)+' '+y);
			}
			else {
				section.forEach(function (p,i) {
					var x = self.getXPosition(p);
					var y = self.getYPosition(p,d);
					if (i == 0) {//beginning of path
						path += ('M '+x+' '+y+' C ')+
								((x+curveLength)+' '+y+' ');
					}
					else if (i == section.length-1) {//end of path
						path += ((x-curveLength)+' '+y+' ')+
								(x+' '+y+' ');
					}
					else {//midpoints
						path += ((x-curveLength)+' '+y+' ')+
								(x+' '+y+' ')+
								((x+curveLength)+' '+y+' ');
					}
				});
			}
		});
		return path;
	}

	/**
	 * Get the x-coordinate of the axis representing the given dimension
	 * @param {string} d - The dimension to get the x-coordinate for
	 */
	CINEMA_COMPONENTS.Pcoord.prototype.getXPosition = function(d) {
		var v = this.dragging[d];
		return v == null ? this.x(d) : v;
	};

	/**
	 * Get the y-coordinate of the line for data point p on dimension d
	 * @param {string} d - The dimension on the data point
	 * @param {Object} p - The data point
	 */
	CINEMA_COMPONENTS.Pcoord.prototype.getYPosition = function(d, p) {
		if (!this.db.isStringDimension(d) && isNaN(p[d]))
			//If the value is NaN on a linear scale, return internalHeight as the position 
			//(to place the line on the NaN tick)
			return this.internalHeight;
		return this.y[d](p[d]);
	}

	/**
	 * Convenience function to compare arrays
	 * (used to compare the selection to the previous one)
	 */
	function arraysEqual(a, b) {
		if (a === b) return true;
		if (a == null || b == null) return false;
		if (a.length != b.length) return false;

		for (var i = 0; i < a.length; ++i) {
			if (a[i] !== b[i]) return false;
		}
		return true;
	}

})();
