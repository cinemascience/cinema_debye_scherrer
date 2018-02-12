/*
Copyright 2017 Los Alamos National Laboratory 

Redistribution and use in source and binary forms, with or without 
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this 
   list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice, 
   this list of conditions and the following disclaimer in the documentation 
   and/or other materials provided with the distribution.

3. Neither the name of the copyright holder nor the names of its contributors 
   may be used to endorse or promote products derived from this software 
   without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED 
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE 
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE 
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL 
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR 
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER 
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, 
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE 
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

// an array of the databases as defined in databases.json
var databaseInfo;

// info for the currently selected database as defined in databases.json
var currentDbInfo;

// The currently loaded datbase
var currentDb;

// whether the currentDb ahs extra axis ordering data
var hasAxisOrdering = false;

// whether the database has been loaded
var loaded = false;

// components for parallel coordinates plot, viewing selected results,
// and querying results
var pcoord;
var view;
var query;

// view type enum and set the currently selected view
var viewType = Object.freeze({
    IMAGESPREAD: 0,
    SCATTERPLOT: 1,
    TABLE: 2,
});
var currentView = viewType.IMAGESPREAD;
// query type enum and set the currently select query
var queryType = Object.freeze({
    QUERY: 0,
    DISPLAY: 1,
    AXIAL: 2,
});
var currentQuery = queryType.AXIAL;

// state of the slideOut Panel
var slideOutOpen = false;

// load databases.json and register databases into the database selection
// and load the first database listed
databaseInfo = loadDatabaseInfo("databases.json");

// initialize margins and image size
updateViewContainerSize();

// set up dragging on the resize bar
var resizeDrag = d3.drag()
    .on("start", function() {
        d3.select(this).attr("mode", "dragging");
    })
    .on("drag", function() {
        var headerRect = d3.select("#header").node().getBoundingClientRect();
        d3.select("#pcoordArea").style(
                            "height", (d3.event.y - headerRect.height) + "px");
        updateViewContainerSize();
        pcoord.updateSize();
        view.updateSize();
    })
    .on("end", function() {
        d3.select(this).attr("mode", "default");
    });
d3.select("#resizeBar").call(resizeDrag);

// resize chart and update margins when window is resized
window.onresize = function(){
    if (loaded) {
        pcoord.updateSize();
        updateViewContainerSize();
        view.updateSize();
    }
};

// open slideOut panel
toggleOpen()

//*********
//END MAIN THREAD
//FUNCTION DEFINITIONS BELOW
//*********

/**
 * Set the current database to the one selected in the database selection.
 */
function load() {

    // save current database
    if (loaded == true) {
        databaseInfo.forEach(function(d, i) {
            if (d.name == currentDbInfo.name) {
                // overwrite old values
                databaseInfo[i] = d;
                databaseInfo[i].filter = currentDbInfo.filter;
                databaseInfo[i].logscale = currentDbInfo.logscale;
                databaseInfo[i].smoothLines = currentDbInfo.smoothLines;
                databaseInfo[i].lineOpacity = currentDbInfo.lineOpacity;
                databaseInfo[i].picked = currentDbInfo.picked;
            }
        })
    }

    // mark as database is not lodaded
    loaded = false;

    // remove old components
    if (window.chart) {chart.destroy();}
    if (window.view) {view.destroy();}
    if (window.query) {query.destroy();}

    // remove axisOrdering panel if it exists
    if (hasAxisOrdering) {
        d3.select("#axisOrderPanel").remove();
    }
    hasAxisOrdering = false;

    // read new database
    currentDbInfo = databaseInfo[d3.select("#database").node().value];
    currentDb = new CINEMA_COMPONENTS.Database(currentDbInfo.directory,
                                               doneLoading, loadingError);

}

/**
 * Called if an error was found when loading the database.
 */
function loadingError(error) {
    window.alert(error);
}

/**
 * Called when a database finishes loading.
 * Builds components and sets up event listeners.
 */
function doneLoading() {

    // load parallel coordinates plot
    pcoord = new CINEMA_COMPONENTS.PcoordSVG(
        d3.select("#pcoordContainer").node(),
        currentDb,
        currentDbInfo.filter === undefined ? /^FILE/ : new RegExp(currentDbInfo.filter),
        currentDbInfo.logscale === undefined ? /^$/ : new RegExp(currentDbInfo.logscale));

    // display changes
    pcoord.smoothPaths = currentDbInfo.smoothLines === undefined ? true : currentDbInfo.smoothLines;
    if (currentDbInfo.smoothLines != undefined)
        this.pcoord.redrawPaths();
    if (currentDbInfo.lineOpacity != undefined) 
        d3.select(".selectedPaths").selectAll("path")
                .style("stroke-opacity", currentDbInfo.lineOpacity);

    // customize and rotate labels
    pcoord.axes.selectAll(".axis .axisTitle")
          .attr("transform", "rotate(-10)")
          .style("text-anchor", "start");

    // load current view
    view = changeView(currentView);

    // load query controls
    query = changeQuery(currentQuery);

    // mark as done loading database
    loaded = true;

    // when selection in pcoord chart changes, set readout
    // and update view component
    pcoord.dispatch.on("selectionchange", function(selection) {
        d3.select("#selectionStats")
          .text(selection.length + " out of " + currentDb.data.length + " results selected");
        view.setSelection(selection);
    });

    // set mouseover handler for pcoord and views component
    pcoord.dispatch.on("mouseover", handleMouseover);
    view.dispatch.on("mouseover", handleMouseover);

    // set click handler for pcoord and views component
    pcoord.dispatch.on("click", handleClick);
    if (Object.keys(view.dispatch["_"]).indexOf("click") >= 0)
        view.dispatch.on("click", handleClick);

    // update size now that components are built
    updateViewContainerSize();
    view.updateSize();

    // trigger initial selectionchange event
    pcoord.dispatch.call("selectionchange",pcoord,pcoord.selection);

    // handle axis ordering
    if (currentDb.hasAxisOrdering) {
        hasAxisOrdering = true;
        buildAxisOrderPanel();
    }

    // set selection
    currentDbInfo.picked = currentDbInfo.picked == undefined ? [] : currentDbInfo.picked;
    currentDbInfo.picked.forEach(function(d) {
        if (currentView == viewType.TABLE) {
            clickTableHighlight(d);
        }
    });
    pcoord.setPickedPaths(currentDbInfo.picked);
}


/**
 * Load JSON file with database information.
 */
function loadDatabaseInfo(jsonFilename) {
    var jsonRequest = new XMLHttpRequest();
    jsonRequest.open("GET", jsonFilename, true);
    jsonRequest.onreadystatechange = function() {
        if (jsonRequest.readyState === 4) {
            if (jsonRequest.status === 200 || jsonRequest.status === 0) {
                databaseInfo = JSON.parse(jsonRequest.responseText);
                d3.select("#database").selectAll("option")
                    .data(databaseInfo)
                    .enter().append("option")
                    .attr("value", function(d,i){return i;})
                    .text(function(d) {
                        return d.name ? d.name: d.directory;
                });
            load();
            }
        }
    }
    jsonRequest.send(null);
    // defaults
    return databaseInfo;
}

/**
 * Open or close the slideOut panel.
 */
function toggleShowHide() {

    // toggle flag for stating if slide in or out
    slideOutOpen = !slideOutOpen;

    // slide out
    if (slideOutOpen) {
        d3.select("#slideOut").transition()
            .duration(500)
            .style("width", "500px")
            .on("start", function(){
                d3.select("#slideOutContents").style("display","initial");
                if (currentQuery == queryType.QUERY)
                    pcoord.setOverlayPaths([query.custom, query.upper, query.lower]);
            })
            .on("end",function() {
                query.updateSize();
            });
        d3.select("#pcoordArea").transition()
            .duration(500)
            .style("padding-left", "500px")
            .on("end", function(){pcoord.updateSize();})
        d3.select("#showHideLabel").text("<");
    }

    // slide in
    else {
        d3.select("#slideOut").transition()
            .duration(500)
            .style("width", "25px")
            .on("start",function(){
                pcoord.setOverlayPaths([]);
            })
            .on("end",function(){
                d3.select("#slideOutContents").style("display", "hidden");
                query.updateSize();
            });
        d3.select("#pcoordArea").transition()
            .duration(500)
            .style("padding-left", "25px")
            .on("end",function(){pcoord.updateSize();});
        d3.select("#showHideLabel").text(">");
    }

}

/**
 * Open slideOut panel if not open.
 */
function toggleOpen() {
    if (!slideOutOpen)
        toggleShowHide();
}

/**
 * Change the view component to the specified viewType.
 */
function changeView(type) {
    if ((loaded && type != currentView) || (!loaded)) {
        currentView = type;
        if (loaded) {
            view.destroy();
        }
        if (currentView == viewType.IMAGESPREAD) {
            view = new CINEMA_COMPONENTS.ImageSpread(d3.select("#viewContainer").node(), currentDb);
            d3.select("#imageSpreadTab").attr("selected","selected");
            d3.select("#scatterPlotTab").attr("selected","default");
            d3.select("#tableTab").attr("selected","default");
        }
        else if (currentView == viewType.SCATTERPLOT) {
            view = new CINEMA_COMPONENTS.ScatterPlotSVG(d3.select("#viewContainer").node(), currentDb,
                currentDbInfo.filter === undefined ? /^FILE/ : new RegExp(currentDbInfo.filter),
                currentDbInfo.logscale === undefined ? /^$/ : new RegExp(currentDbInfo.logscale),
                currentDbInfo.picked === undefined ? [] : currentDbInfo.picked);
            d3.select("#scatterPlotTab").attr("selected", "selected");
            d3.select("#imageSpreadTab").attr("selected", "default");
            d3.select("#tableTab").attr("selected","default");
        }
        else if (currentView == viewType.TABLE) {
            view = new CINEMA_COMPONENTS.TableSVG(d3.select("#viewContainer").node(), currentDb,
                currentDbInfo.filter === undefined ? /^FILE/ : new RegExp(currentDbInfo.filter),
                currentDbInfo.picked === undefined ? [] : currentDbInfo.picked);
            d3.select("#scatterPlotTab").attr("selected", "default");
            d3.select("#imageSpreadTab").attr("selected", "default");
            d3.select("#tableTab").attr("selected","selected");
        }
        view.dispatch.on("mouseover", handleMouseover);
        if (Object.keys(view.dispatch["_"]).indexOf("click") >= 0)
            view.dispatch.on("click", handleClick);
        updateViewContainerSize();
//        view.updateSize();
        view.setSelection(pcoord.selection);
    }

    return view;
}

/**
 * Change the query component to the specified queryType.
 */
function changeQuery(type) {
    if ((loaded && type != currentQuery) || (!loaded)) {
        currentQuery = type;
        if (loaded) {
            query.destroy();
        }

        // if query component
        if (currentQuery == queryType.QUERY) {

            // create component
            query = new CINEMA_COMPONENTS.Query(d3.select("#queryContainer").node(),currentDb);

            // set styles for query data
            query.custom.style = "stroke-dasharray:20,7;stroke-width:3px;stroke:red";
            query.lower.style = "stroke-dasharray:initial;stroke-width:2px;stroke:pink;";
            query.upper.style = "stroke-dasharray:initial;stroke-width:2px;stroke:pink;";

            // add query data as overlays to pcoord chart
            pcoord.setOverlayPaths([query.custom, query.upper, query.lower]);

            // set pcoord chart to repond to change in query data
            query.dispatch.on("customchange", function(newData) {
                pcoord.redrawOverlayPaths();
            });

            // set pcoord query to respond to a query
            query.dispatch.on("query", function(results) {
                pcoord.setSelection(results);
            });
        }

        // if display component
        if (currentQuery == queryType.DISPLAY) {
            query = new CINEMA_COMPONENTS.Display(d3.select("#queryContainer").node(),currentDb,pcoord);
        }

        // if axial component
        if (currentQuery == queryType.AXIAL) {
            query = new CINEMA_COMPONENTS.Axial(d3.select("#queryContainer").node(),currentDb,pcoord, "FILE");
        }

    }

    return query;
}

/**
 * Build a panel for selecting axis orderings.
 * Add listeners for pcoord chart.
 */
function buildAxisOrderPanel() {

    // add panel
    var axisOrderPanel = d3.select("#header").append("div")
                           .attr("id","axisOrderPanel");

    // add label
    axisOrderPanel.append("span")
                  .attr("id","axisOrderLabel")
                  .text("Axis Order:");
    axisOrderPanel.append("br");

    // add select for category
    axisOrderPanel.append("select")
        .attr("id","axis_category")
        .selectAll("option").data(d3.keys(currentDb.axisOrderData))
            .enter().append("option")
                .attr("value", function(d){return d;})
                .text(function(d){return d;});

    // set onchange for category select to populate value select
    // -1 is custom order
    d3.select("#axis_category").on("change",function() {
        var category = currentDb.axisOrderData[this.value];
        var val = d3.select("#axis_value").selectAll("option")
                    .data(d3.range(-1, category.length));
        val.exit().remove();
        val.enter().append("option")
           .merge(val)
           .attr("value",function(d){return d;})
           .text(function(d){return d == -1 ? "Custom" : category[d].name;});

        // set onchange for value select to change order in pcoord chart
        d3.select("#axis_value").on("change",function() {
            if (this.value != -1) {
                var order = category[this.value].order;
                pcoord.setAxisOrder(order);
            }
        });
        d3.select("#axis_value").node().value = -1;
    });

    // add spacer
    axisOrderPanel.append("span").text(" : ");

    // add value select
    axisOrderPanel.append("select")
                  .attr("id","axis_value");

    // add handler to pcoord chart to set value select to "custom" 
    // when axis order is manually changed
    pcoord.dispatch.on("axisorderchange", function() {
        d3.select("#axis_value").node().value = -1;
    });

    // trigger change in category to populate value select
    d3.select("#axis_category")
      .on("change").call(d3.select("#axis_category").node());
}

/**
 * Update the size of viewContainer to fill the remaining space below
 * the top panel
 **/
function updateViewContainerSize() {
    var topRect = d3.select("#top").node().getBoundingClientRect();
    var tabRect = d3.select("#tabContainer").node().getBoundingClientRect();
    d3.select("#viewContainer").style(
        "height", window.innerHeight - topRect.height - tabRect.height + "px");
}

/*
 * Respond to mouseover event.
 * Set highlight in pcoord chart and update info pane.
 */
function handleMouseover(index, event) {
    if (index != null) {
        pcoord.setHighlightedPaths([index]);
        if (currentView == viewType.SCATTERPLOT || currentView == viewType.TABLE)
            view.setHighlightedPoints([index]);
    }
    else {
        pcoord.setHighlightedPaths([]);
        if (currentView == viewType.SCATTERPLOT || currentView == viewType.TABLE)
            view.setHighlightedPoints([]);
}
    if (currentView != viewType.TABLE)
        updateInfoPane(index,event);
}

/*
 * Respond to click event.
 * Set highlight in pcoord chart and update info pane.
 */
function handleClick(index, event) {
    var newPick = currentDbInfo.picked.indexOf(index) == -1;
    if (newPick) {
        currentDbInfo.picked.push(index);
    }
    else {
        currentDbInfo.picked.splice(currentDbInfo.picked.indexOf(index), 1);
    }
    // change picks in table
    if (currentView == viewType.TABLE && !newPick) {
        var row = d3.select(".tableContainer").select("tr[index='"+ index +"']");
        row.style("background", null)
           .style("color", null);
    }
    // change picks in scatter plot
    if (currentView == viewType.SCATTERPLOT && !newPick) {
        var row = d3.select(".selectedPoints").select("circle[index='"+ index +"']");
        row.style("background", null)
           .style("color", null);
    }
    // show picked in viewer
    pcoord.setPickedPaths(currentDbInfo.picked);
    if (currentView == viewType.SCATTERPLOT || currentView == viewType.TABLE)
        view.setPickedPoints(currentDbInfo.picked);
}
function clickTableHighlight(index) {
    d3.select(".tableContainer").select("tr[index='"+ index +"']")
      .style("background", "red")
      .style("color", "white");
}

/*
 * Update the info pane according to the index of the data
 * being moused over.
 */
function updateInfoPane(index, event) {
    var pane = d3.select(".infoPane");
    if (index != null && pane.empty()) {
        pane = d3.select("body").append("div")
            .attr("class", "infoPane")
    }
    if (index != null) {
        pane.html(function() {
                var text = "<b>Index:<b> "+index+"<br>";
                var data = currentDb.data[index]
                for (i in data) {
                    if (!RegExp(currentDbInfo.filter).test(i)) {
                        text += ("<b>"+i+":</b> ");
                        text += (data[i] + "<br>");
                    }
                }
                return text;
            });
        // draw the info pane in the side of the window opposite the mouse
        var leftHalf = (event.clientX <= window.innerWidth/2)
        if (leftHalf)
            pane.style("right", "30px")
                .style("left", null);
        else
            pane.style("left", "30px")
                .style("right", null)
    }
    else {
        d3.select(".infoPane").remove();
    }
}

/*
 * Download new database settings file with current settings for viewer.
 */
function downloadSettings(filename) {
    download(filename, JSON.stringify(databaseInfo, null, 4));
}

/*
 * Packages a file to be downloaded.
 */
function download(filename, text) {
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
}
