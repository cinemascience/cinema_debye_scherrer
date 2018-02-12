'use strict';
(function() {
	/**
	 * CINEMA_COMPONENTS
	 * SCATTER_PLOT_SVG
	 * 
	 * The ScatterPlotSVG Component for the CINEMA_COMPONENTS library.
	 * Contains the constructor for the ScatterplotSVG Component:
	 * A subclass of ScatterPlot which draws data using SVG
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
		throw new Error("CINEMA_COMPONENTS ScatterPlotSVG Component requires that ScatterPlot"+
			" component be included. Please make sure that ScatterPlot component"+
			" is included BEFORE ScatterPlotSVG module");

	/** @type {boolean} - Flag to indicate that the ScatterPlotSVG Component has been included */
	CINEMA_COMPONENTS.SCATTER_PLOT_SVG_INCLUDED = true;

	/**
	 * Constructor for ScatterPlotSVG Component
	 * Represents a component for displaying data on a 2D Scatter Plot
	 * Rendered with SVG
	 * @param {DOM} parent - The DOM object to build this component inside of
	 * @param {CINEMA_COMPONENTS.Database} database - The database behind this component
	 * @param {RegExp} filterRegex - A regex to determine which dimensions to NOT show on the component
	 */
	CINEMA_COMPONENTS.ScatterPlotSVG = function(parent, database, filterRegex, logscaleRegex, picked) {
		//call super-constructor
		CINEMA_COMPONENTS.ScatterPlot.call(this,parent,database,filterRegex,logscaleRegex,picked);

		//specify that this is a ScatterPlot SVG component.
		d3.select(this.container).classed('SVG',true);

		//Add SVG Components to pointContainer
		this.svg = this.pointContainer.append('svg')
			.style('position','absolute')
			.attr('viewBox','0 0 '+this.internalWidth+' '+this.internalHeight)
			.attr('preserveAspectRatio','none')
			.attr('width','100%')
			.attr('height','100%');
		//Add group for selected points
		this.selectedPoints = this.svg.append('g')
			.classed('selectedPoints',true);
		//Add group for highlighted points
		this.highlightedPoints = this.svg.append('g')
			.classed('highlightedPoints',true);
		//Add group for overlay points
		this.overlayPoints = this.svg.append('g')
			.classed('overlayPoints',true);

	}
	//establish prototype chain
	CINEMA_COMPONENTS.ScatterPlotSVG.prototype = Object.create(CINEMA_COMPONENTS.ScatterPlot.prototype);
	CINEMA_COMPONENTS.ScatterPlotSVG.prototype.constructor = CINEMA_COMPONENTS.ScatterPlotSVG;

	/**************************
	 * OVERRIDE METHODS
	 **************************/

        /**
         * Set the chart's current picked data to the data represented
         * by the given list of indices
         */
        CINEMA_COMPONENTS.ScatterPlotSVG.prototype.setPickedPoints = function(indices) {
                this.picked = indices;
                this.redrawPickedPoints();
        }

        /**
         * Redraw the current selection of points
         */
        CINEMA_COMPONENTS.ScatterPlotSVG.prototype.redrawPickedPoints = function() {
		var self = this;
                this.selection.forEach(function(d) {
			if (self.picked.indexOf(d) != -1)
                        d3.select(".selectedPoints").select("circle[index='"+ d +"']")
                                .style("fill", "red");
                        else
                        d3.select(".selectedPoints").select("circle[index='"+ d +"']")
                                .style("fill", null);
                });
        }

	CINEMA_COMPONENTS.ScatterPlotSVG.prototype.updateSize = function() {
		//call super
		CINEMA_COMPONENTS.ScatterPlot.prototype.updateSize.call(this);

		//rescale svg
		this.svg.attr('viewBox','0 0 '+this.internalWidth+' '+this.internalHeight);
	}

	/**
	 * Redraw the current selection of points
	 */
	CINEMA_COMPONENTS.ScatterPlotSVG.prototype.redrawSelectedPoints = function() {
		var self = this;
		var plottable = this.getPlottablePoints(this.selection);
		//Update warningReadout
		if (plottable.length < this.selection.length)
			this.warningReadout.text((this.selection.length-plottable.length) + 
				" point(s) could not be plotted (because they contain NaN or undefined values).");
		else
			this.warningReadout.text('');
		//Bind to selection and update
		var update = this.selectedPoints
			.selectAll('circle').data(plottable);
		update.enter() //ENTER
			.append('circle')
			.attr('r','6')
		.merge(update) //ENTER + UPDATE
			.attr('index',function(d){return d;})
			.attr('cx',function(d) {
				return self.x(self.db.data[d][self.xDimension]);
			})
			.attr('cy',function(d) {
				return self.y(self.db.data[d][self.yDimension]);
			})
			.on('mouseenter',function(d) {
				self.dispatch.call('mouseover',self,d,d3.event);
			})
			.on('mouseleave',function(d) {
				self.dispatch.call('mouseover',self,null,d3.event);
			})
                        .on('click',function(d) {
                                self.dispatch.call('click',self,d,d3.event);
                        });
		update.exit()
			.remove();
		this.redrawPickedPoints();
	}

	/**
	 * Redraw the set of highlighted points
	 */
	CINEMA_COMPONENTS.ScatterPlotSVG.prototype.redrawHighlightedPoints = function() {
		var self = this;
		//Bind to selection and update
		var update = this.highlightedPoints
			.selectAll('circle').data(this.getPlottablePoints(this.highlighted));
		update.enter() //ENTER
			.append('circle')
			.attr('r','10')
		.merge(update) //ENTER + UPDATE
			.attr('index',function(d){return d;})
			.attr('cx',function(d) {
				return self.x(self.db.data[d][self.xDimension]);
			})
			.attr('cy',function(d) {
				return self.y(self.db.data[d][self.yDimension]);
			});
		update.exit()
			.remove();
	}

	/**
	 * Redraw the overlay points
	 */
	CINEMA_COMPONENTS.ScatterPlotSVG.prototype.redrawOverlayPoints = function() {
		var self = this;
		//Bind to selection and update
		var update = this.overlayPoints
			.selectAll('circle').data(this.overlayData);
		update.enter() //ENTER
			.append('circle')
			.attr('r','5')
		.merge(update) //ENTER + UPDATE
			.attr('cx',function(d) {
				return self.x(d.data[self.xDimension]);
			})
			.attr('cy',function(d) {
				return self.y(d.data[self.yDimension]);
			})
			.attr('style',function(d) {
				return d.style;
			});
		update.exit()
			.remove();
	}

})();
