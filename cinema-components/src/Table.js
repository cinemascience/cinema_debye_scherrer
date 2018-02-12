'use strict';
(function() {
        /**
         * CINEMA_COMPONENTS
         * TABLE
         * 
         * The Table component for the CINEMA_COMPONENTS library.
         * Contains the constructor for Table Components (Eg. TableSVG, TableCanvas)
         * It is a subclass of Component and contains methods and fields common to all Table Components
         * 
         * @exports CINEMA_COMPONENTS
         * 
         * @author Christopher M. Biwer
         */

        //If CINEMA_COMPONENTS is already defined, add to it, otherwise create it
        var CINEMA_COMPONENTS = {}
        if (window.CINEMA_COMPONENTS)
                CINEMA_COMPONENTS = window.CINEMA_COMPONENTS;
        else
                window.CINEMA_COMPONENTS = CINEMA_COMPONENTS;

        //Require that the Component module be included
        if (!CINEMA_COMPONENTS.COMPONENT_INCLUDED)
                throw new Error("CINEMA_COMPONENTS Table module requires that Component"+
                        " module be included. Please make sure that Component module"+
                        " is included BEFORE Table module");

        //Require that d3 be included
        if (!window.d3) {
                throw new Error("CINEMA_COMPONENTS Table module requires that"+
                " d3 be included (at least d3v4). Please make sure that d3 is included BEFORE the"+
                " the Table module");
        }

        /** @type {boolean} - Flag to indicate that the Table module has been included */
        CINEMA_COMPONENTS.TABLE_INCLUDED = true;

        /**
         * Abstract constructor for Table Components
         * Represents a component for displaying the data in a database on a 2D scatter plot.
         * Objects such as TableSVG and TableCanvas inherit from this.
         * @param {DOM} parent - The DOM object to build this component inside of
         * @param {CINEMA_COMPONENTS.Database} database - The database behind this component
         * @param {RegExp} filterRegex - A regex to determine which dimensions to NOT show on the component
         */
        CINEMA_COMPONENTS.Table = function(parent, database, filterRegex, picked) {

                var self = this;

                /***************************************
                 * SIZING
                 ***************************************/

                /** @type {CINEMA_COMPONENTS.Margin} Override default margin */
                this.margin = new CINEMA_COMPONENTS.Margin(25,0,0,0);

                //Call super-constructor
                CINEMA_COMPONENTS.Component.call(this,parent,database,filterRegex);

                /***************************************
                 * DATA
                 ***************************************/

                /** @type {number[]} Indices of all currently displayed data */
                this.selection = d3.range(0,this.db.data.length);
                /** @type {number[]} Indices of all currently displayed data */
                this.picked = picked;
                /** @type {number} Indices of all currently highlighted data */
                this.highlighted = [];
                /** @type {CINEMA_COMPONENTS.ExtraData[]} Custom data to overlay on chart */
                this.overlayData = [];

                /** @type {string} The currently selected dimensions for each axis*/
                this.xDimension = this.dimensions[0];
                this.yDimension = this.dimensions[1];

                /***************************************
                 * EVENTS
                 ***************************************/

                /** @type {d3.dispatch} Hook for events on chart 
                 * Set handlers with on() function. Ex: this.dispatch.on('mouseover',handlerFunction(i))
                 * 'mouseover': Triggered when selection of data changes.
                 *     (called with the index of moused over data and a reference to the mouse event)
                */
                this.dispatch = d3.dispatch("mouseover", "click");

                /***************************************
                 * DOM Content
                 ***************************************/

                //Specify that this a Table component
                d3.select(this.container).classed('TABLE',true);

                /** @type {d3.selection} Where the data on the chart will be drawn
                 * The actual drawing depends on the specific Table sublcass
                 */
                this.tableContainer = d3.select(this.container).append('div')
                        .classed('tableContainer',true)
                        .style('position','absolute')
                        .style('top',this.margin.top+'px')
                        .style('right',this.margin.right+'px')
                        .style('bottom',this.margin.bottom+'px')
                        .style('left',this.margin.left+'px')
                        .style('width',this.internalWidth+'px')
                        .style('height',this.internalHeight+'px');

        };
        //establish prototype chain
        CINEMA_COMPONENTS.Table.prototype = Object.create(CINEMA_COMPONENTS.Component.prototype);
        CINEMA_COMPONENTS.Table.prototype.constructor = CINEMA_COMPONENTS.Table;

        /**
         * Set the chart's selection of data to the data represented
         * by the given list of indices
         */
        CINEMA_COMPONENTS.Table.prototype.setSelection = function(selection) {
                this.selection = selection;
        }

})();
