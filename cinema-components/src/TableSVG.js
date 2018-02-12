'use strict';
(function() {
        /**
         * CINEMA_COMPONENTS
         * TABLE_SVG
         * 
         * The TableSVG Component for the CINEMA_COMPONENTS library.
         * Contains the constructor for the TableSVG Component:
         * A subclass of Table which draws data using SVG
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

        //Require that the Table Component be included
        if (!CINEMA_COMPONENTS.SCATTER_PLOT_INCLUDED)
                throw new Error("CINEMA_COMPONENTS TableSVG Component requires that Table"+
                        " component be included. Please make sure that Table component"+
                        " is included BEFORE TableSVG module");

        /** @type {boolean} - Flag to indicate that the TableSVG Component has been included */
        CINEMA_COMPONENTS.SCATTER_PLOT_SVG_INCLUDED = true;

        /**
         * Constructor for TableSVG Component
         * Represents a component for displaying data in a Table
         * Rendered with SVG
         * @param {DOM} parent - The DOM object to build this component inside of
         * @param {CINEMA_COMPONENTS.Database} database - The database behind this component
         * @param {RegExp} filterRegex - A regex to determine which dimensions to NOT show on the component
         */
        CINEMA_COMPONENTS.TableSVG = function(parent, database, filterRegex, picked) {

                //call super-constructor
                CINEMA_COMPONENTS.Table.call(this,parent,database,filterRegex,picked);

                //specify that this is a Table SVG component.
                d3.select(this.container).classed('SVG',true);

                //create table
                this.table = this.tableContainer.append('table')
                this.thead = this.table.append('thead')
                this.tbody = this.table.append('tbody')

                //add table header
                var self = this;
                this.thead.selectAll('tr')
                          .data(this.dimensions).enter()
                          .append('th')
                          .attr('class', function(d) {return d;})
                          .text(function(d) {return d;})
                          .on('click', function (d) {
                              var ascending = d3.select(this).attr("ascending") == 'true';
                              self.rows.sort(function(a, b) {
                                  var s1 = self.db.data[b][d].toLowerCase();
                                  var s2 = self.db.data[a][d].toLowerCase();
                                  if (ascending)
                                      return s1 > s2 ? 1 : s1 == s2 ? 0 : -1;
                                  else
                                      return s1 < s2 ? 1 : s1 == s2 ? 0 : -1;
                              });
                              d3.select(this)
                                .attr("ascending", function() {
                                  if (ascending === true)
                                      return false;
                                  else
                                      return true;
                                });
                          });


                //add rows of data
                this.rows = this.tbody.selectAll('tr')
                                .data(this.selection).enter()
                                .append('tr');
                this.rows.attr('index', function(d) {return d;})
                          .on('mouseenter',function(d) {
                              self.dispatch.call('mouseover',self,d,d3.event);
                          })
                          .on('mouseleave',function(d) {
                              self.dispatch.call('mouseover',self,null,d3.event);
                          })
                          .on('click', function(d) {
                              self.dispatch.call('click',self,d,d3.event);
                          })
                          .selectAll('td')
                          .data(this.dimensions).enter()
                          .append('td')
                          .attr('class', function(d) {return d;})
                          .text(function(d) {return self.db.data[d3.select(this.parentNode).attr('index')][d]});

		this.redrawPickedPoints();

		this.updateSize();

        }
        //establish prototype chain
        CINEMA_COMPONENTS.TableSVG.prototype = Object.create(CINEMA_COMPONENTS.Table.prototype);
        CINEMA_COMPONENTS.TableSVG.prototype.constructor = CINEMA_COMPONENTS.TableSVG;

        /**************************
         * OVERRIDE METHODS
         **************************/

        /**
         * Set the chart's current highlighted data to the data represented
         * by the given list of indices
         */
        CINEMA_COMPONENTS.Table.prototype.setHighlightedPoints = function(indices) {
                this.highlighted = indices;
                this.redrawHighlightedPoints();
        }

        /**
         * Set the chart's current picked data to the data represented
         * by the given list of indices
         */
        CINEMA_COMPONENTS.Table.prototype.setPickedPoints = function(indices) {
                this.picked = indices;
                this.redrawPickedPoints();
        }

        CINEMA_COMPONENTS.TableSVG.prototype.redrawSelectedPoints = function() {
        }

        //Shortcut function for redrawSelectedPoints, redrawHighlightedPoints and redrawOverlayPoints
        CINEMA_COMPONENTS.Table.prototype.redrawPoints = function() {
                this.redrawSelectedPoints();
                this.redrawHighlightedPoints();
                //this.redrawOverlayPoints();
        }

        /**
         * Redraw the current selection of points
         */
        CINEMA_COMPONENTS.TableSVG.prototype.redrawSelectedPoints = function() {
            var self = this;
            this.tbody.selectAll('tr').each(function(d) {
                if (self.selection.indexOf(d) == -1)
                    d3.select(this).style("display", "none");
                else {
                    d3.select(this).style("display", null);
}
            });
        }

        /**
         * Redraw the current selection of points
         */
        CINEMA_COMPONENTS.TableSVG.prototype.redrawHighlightedPoints = function() {
            var self = this;
            this.tbody.selectAll("tr[class='highlighted']")
                      .attr('class', 'selected');
            this.highlighted.forEach(function(d) {
                self.tbody.select("tr[index='" + d + "']")
                      .attr("class", "highlighted")
                      .each(function() {
                if (self.selection.indexOf(parseInt(d3.select(this).attr('index'))) == -1)
                    d3.select(this).style("display", "none");
                else
                    d3.select(this).style("display", null);
            });
                });
            };

        /**
         * Redraw the current selection of points
         */
        CINEMA_COMPONENTS.TableSVG.prototype.redrawPickedPoints = function() {
                this.picked.forEach(function(d) {
                        d3.select(".tableContainer").select("tr[index='"+ d +"']")
                                .style("background", "red")
                                .style("color", "white");
                });
	}

        /**
         * Set the chart's selection of data to the data represented
         * by the given list of indices
         */
        CINEMA_COMPONENTS.Table.prototype.setSelection = function(selection) {
                this.selection = selection;
                this.redrawSelectedPoints();
        }

        /**
         * Change view size
         */
        CINEMA_COMPONENTS.TableSVG.prototype.updateSize = function() {
                //Call super
                CINEMA_COMPONENTS.Component.prototype.updateSize.call(this);

                this.tableContainer
                        .style('height',(this.parentRect.height - this.margin.top)+'px');
        };

})();
