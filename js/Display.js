'use strict';
(function() {
	/**
	 * CINEMA_COMPONENTS
	 * DISPLAY
	 * 
	 * The Display Component for the CINEMA_COMPONENTS library.
	 * Contains the constructor for the Display Component
	 * Which allows for defining a custom data point and querying
	 * a database for similar data points
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
		throw new Error("CINEMA_COMPONENTS Display module requires that Component"+
			" module be included. Please make sure that Component module"+
			" is included BEFORE Display module");

	//Require that d3 be included
	if (!window.d3) {
		throw new Error("CINEMA_COMPONENTS Display module requires that"+
		" d3 be included (at least d3v4). Please make sure that d3 is included BEFORE the"+
		" the Display module");
	}

	/** @type {boolean} - Flag to indicate that the Display module has been included */
	CINEMA_COMPONENTS.DISPLAY_INCLUDED = true;

	/**
	 * Constructor for Display Component
	 * Represents a component for changing display
	 * @param {DOM} parent - The DOM object to build this component inside of 
	 * @param {CINEMA_COMPONENTS.Database} database - The database behind this component
	 * (Note that Display does not use a filterRegex)
	 */
	CINEMA_COMPONENTS.Display = function(parent, database, pcoord) {
		var self = this;

		/***************************************
		 * SIZING
		 ***************************************/

		//Call super-constructor (will calculate size)
		CINEMA_COMPONENTS.Component.call(this,parent,database);

		/***************************************
		 * DATA
		 ***************************************/

		//override this.dimensions to include only numeric dimensions
		this.dimensions = this.dimensions.filter(function(d) {
			return !self.db.isStringDimension(d);
		});

		/** @type {number[]} Indices of the similar results to the last query */
		this.results = [];

		/** @type {CINEMA_COMPONENTS.ExtraData} The custom-defined data point */
		this.custom = new CINEMA_COMPONENTS.ExtraData({},"");
		/** @type {CINEMA_COMPONENTS.ExtraData} Approximations of the boudnaries for similar data given the threshold */
		this.upper = new CINEMA_COMPONENTS.ExtraData({},"");
		this.lower = new CINEMA_COMPONENTS.ExtraData({},"");
		// (styles will be decided by a client program)

		this.pcoord = pcoord;

		/***************************************
		 * EVENTS
		 ***************************************/

		/** @type {d3.dispatch} Hook for events on chart
		 * Set handlers with on() function. Ex: this.dispatch.on('query',handlerFunction(results))
		 * 'query': Triggered when a query is made
		 *     (argument is the results of the query (as an array of indices))
		 * 'customchange': Triggered when the custom-defined data point changes
		 *     (arguemnt is an array with extra data custom,upper and lower (in that order))
		*/
		this.dispatch = d3.dispatch('query','customchange');

		/***************************************
		 * SCALES
		 ***************************************/

		//Input sliders for each dimension range from 0 to 100
		//So create scales to scale a slider's value to a value in its dimension
		this.scales = {};
		this.dimensions.forEach(function(d) {
			self.scales[d] = d3.scaleLinear()
				.domain([0,100])
				.range(self.db.dimensionDomains[d]);
		});

		/***************************************
		 * DOM Content
		 ***************************************/

		//Specify that this is a Display component
		d3.select(this.container).classed('QUERY',true);

                // add table
                this.table = d3.select(this.container).append('table');
                this.tbody = this.table.append('tbody');

		var row;

                // add row for smooth lines
                row = this.tbody.append("tr");
                        row.append('td').append('span')
                        .text("Smooth lines");
                row.append('td').append('input')
                        .attr('id', 'smoothLines')
                        .attr('type','checkbox')
	                .each(function() {
        	          if (self.pcoord.smoothPaths)
                	      this.checked = true;
                	})
                        .on('change', function() {self.updateSmoothLines()});

                // add row for line opacity
                row = this.tbody.append("tr");
        		row.append('td').append('span')
                	.text("Line opacity");
        	row.append('td').append('input')
                	.attr('id', 'lineOpacity')
	                .attr('type','range')
        	        .attr('min',0)
                	.attr('max',1)
	                .attr('step',0.05)
        	        .attr('value',function () {
                            // FIXME
                            if (currentDbInfo.lineOpacity != undefined)
                                return currentDbInfo.lineOpacity;
                            else
                                return 0.2;
                        })
                	.on('change', function() {self.updateLineOpacity()});

	}
	//establish prototype chain
	CINEMA_COMPONENTS.Display.prototype = Object.create(CINEMA_COMPONENTS.Component.prototype);
	CINEMA_COMPONENTS.Display.prototype.constructor = CINEMA_COMPONENTS.Display;

        /**
         * Updates line opacity FIXME
         */
        CINEMA_COMPONENTS.Display.prototype.updateLineOpacity = function() {
                currentDbInfo.lineOpacity = d3.select('#lineOpacity').node().value;
    		d3.select(".selectedPaths").selectAll("path")
        		.transition(1000).style("stroke-opacity", currentDbInfo.lineOpacity);
        }

        /**
         * Updates line smoothing FIXME
         */
        CINEMA_COMPONENTS.Display.prototype.updateSmoothLines = function() {
        	this.pcoord.smoothPaths = d3.select("#smoothLines").node().checked;
                currentDbInfo.smoothLines = this.pcoord.smoothPaths;
        	this.pcoord.redrawPaths();
        }

})();
