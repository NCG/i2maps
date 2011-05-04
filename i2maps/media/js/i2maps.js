
/* Settings.
 * You can override them before you load this script.
 * 
 * In your HTML file, use something like...
 *   <script type="text/javascript">
 *     var i2maps_googlemaps_api_key = 'YOUR OWN API KEY';
 *   </script>
 *   <script type="text/javascript" src="../../media/js/i2maps.js"></script>
 * ... to customize i2maps_settings.googlemaps_api_key.
 */
var i2maps_default_settings = {
	// Google maps API key
    googlemaps_api_key: 'ABQIAAAAGwcE_6OjqiQ_gkEzT4zkehRQ6XxsilBjt0Se4vGYlThGy_5z-RQyP_fTE8P7wYPDMpFVbuL60-fJvQ',
}

var i2maps_settings = {}

if (typeof i2maps_googlemaps_api_key == "undefined")
{
    i2maps_settings.googlemaps_api_key = i2maps_default_settings.googlemaps_api_key;
}
else
{
	i2maps_settings.googlemaps_api_key = i2maps_googlemaps_api_key;
}

var scripts = document.getElementsByTagName("script");
var src = scripts[scripts.length-1].src;
var i2MAPS_URL = src.substr(0,src.indexOf("media/js/i2maps.js"));
String.prototype.startsWith = function(str){
    return (this.substr(0, str.length) === str);
}
function requireJS(url)
{
    if(url.startsWith('http://') || url.startsWith('/') || url.startsWith('.'))
    {
        url = url;
    }
    else
    {
        url = i2MAPS_URL + 'media/js/' + url;
    }
    document.write('<script type="text/javascript" src="' + url + '"></scr' + 'ipt>');
}
function requireCSS(url)
{
    if(url.startsWith('http://') || url.startsWith('/') || url.startsWith('.'))
    {
        url = url;
    }
    else
    {
        url = i2MAPS_URL + 'media/css/' + url;
    }
    document.write('<link type="text/css" href="' + url + '" rel="stylesheet" />');
}
requireJS("lib/openlayers/OpenLayers.js");
requireJS("lib/jquery-1.3.2.min.js");
requireJS("lib/jquery-ui-1.7.2.custom.min.js");
requireJS("lib/jquery.mousewheel.js");
requireJS("lib/jquery.flot.js");
requireJS("lib/jquery.dataTables.js");
requireJS("lib/ui.panel.min.js");
requireJS("lib/json2.js");
requireJS("timeline.js");
requireJS("circle.js");
requireJS("colormap.js");
requireJS("openlayers-extensions/surface.js");
requireJS("openlayers-extensions/OpenLayers-ext-min.js");
requireJS("http://maps.google.com/maps?file=api&amp;v=2&amp;key=" + i2maps_settings.googlemaps_api_key);

requireCSS("jquery-ui-1.7.2.custom.css");
requireCSS("ui.panel.css");
requireCSS("i2maps.css");

isReady();
function isReady(){
    if ( !document.body ) {
        return setTimeout( isReady, 13 );
    }else{
        if(!(($.browser.safari || $.browser.mozilla || $.browser.opera) && !!document.createElement('canvas').getContext))
        {
            $("body").append($('<div style="width: 100%; height: 100%; position: absolute; top: 0px; left: 0px; background-color: #000000; padding: 10%; z-index: 10000"><div style="color: #ffffff; font-size: 20px; width:80%">Sorry, but your browser is not supported by this application.<br/><br/> i2maps requires a modern browser which supports HTML5. We recommend Chrome 5+ or Safari 5+ for optimum performance. Firefox 3+ and Opera 9+ also work reasonably well. No version of Internet Explorer will work.</div></div>'));
            return;
        }
        setupUtils();
        setupUI();
        i2maps.project();
        i2maps.maps.map(function(map){map.init()}); 
    }
}

function setupUI(){
    $("#tabs").tabs();
    $("#map_canvas").resizable();
}
function Class(obj){
    return function(args){
        if(obj.initialize){
            obj.initialize(args);
        }
        for (opt in obj) { 
            this[opt] = obj[opt];
        }
    }
}

function setupUtils()
{
    OpenLayers.Layer.prototype.EVENT_TYPES.concat(["timechanged","init", "featureselected"]);
    $.ajaxSetup({dataType: 'jsonp'});
    $.extend({
      getUrlVars: function(){
        var vars = {}, hash;
    	url = window.location.href;
    	if(url.indexOf('?') >= 0)
    	{
    	    var hashes = url.slice(url.indexOf('?') + 1).split('&');
    	    for(var i = 0; i < hashes.length; i++)
    	    {
    	      hash = hashes[i].split('=');
    	      vars[hash[0]] = hash[1];
    	    }
    	}
        return vars;
      },
      getUrlVar: function(name){
        return $.getUrlVars()[name];
      },
      setUrlVar: function(key, value){
    	vars = $.getUrlVars();
    	vars[key] = value;
    	url = window.location.href;
    	if(url.indexOf('?') < 0)
    	{
    		 url += "#?";
    	}
    	window.location.href = url.slice(0, url.indexOf('?') + 1) + $.param(vars);
        },
          showMessage: function(message, type){
    	    if(type == "Progress")
    			$("#message").html(message).show().css('top', $("body").scrollTop()).css('background-color', '#0000EE');
    		else if(type == "Good")
    			$("#message").html(message).show().css('top', $("body").scrollTop()).css('background-color', '#00EE00').fadeOut(2500);
    		else if(type="Bad")
    		{
    		    $("#message").hide();
    			$("body").append('<div id="overlay"><div id="overlay-message">' + message + '<br/><br/><button type="button" onclick="$(\'#overlay\').remove()">Close</button></div></div>');
    		}
    	  },
    	  hideMessage: function() {
			$("#message").hide();
		}
    });
}

function dateStringToTimestamp(dateString)
{
    return Math.round(new Date(dateString.replace(/-/g, "/")).getTime());
}


var i2maps = {
    maps: [],
    timelines: [],
    cache: {"enabled": true},
    project: function(){},
    registerMap: function(map)
    {
        this.maps.push(map);
    },
    registerTimeline: function(timeline)
    {
        timeline.onChangeTime = i2maps.timeChange
        this.timelines.push(timeline);
    },
    setupProject: function(proj)
    {
        this.project = proj;
    },
    doQuery: function(query_string, parameters, data_source, result_handler)
    {
        query_request = $.ajax({
          dataType: 'jsonp',
          url: i2MAPS_URL + "query/",
          data: {query: query_string,
                 data_source: data_source,
                 parameters: JSON.stringify(parameters)},
          beforeSend: function(XMLHttpRequest){
              var url = this.url.substr(this.url.indexOf('&query'));
              if(i2maps.cache[url])
              {
                  i2maps.debug('Cache hit for ' + url);
                  this.success(i2maps.cache[url]);
                  return false;
              }
          },
          success: function(response){    
                $.showMessage("OK", "Good");
                var url = this.url.substr(this.url.indexOf('&query'));
                if(i2maps.cache.enabled) i2maps.cache[url] = response;
                result_handler(response);
            },
          error: function(XMLHttpRequest, textStatus, errorThrown){    
                $.showMessage(XMLHttpRequest.responseText, "Bad");
                if(XMLHttpRequest.responseText.contains("OperationalError"))
                {
                    $("#settings").dialog('open');
                }
            },
        });
        $.showMessage("Running...", "Progress");
    },
    
    datasources: {
        get: function(datasource)
        {
            requireJS(i2MAPS_URL + 'datasource/?data_source=' + datasource);
        },
        
        call: function(data_source, method, parameters, result_handler)
        {
            query_request = $.ajax({
              dataType: 'jsonp',
              url: i2MAPS_URL + "call/",
              data: {data_source: data_source,
                     method: method,
                     parameters: JSON.stringify(parameters)},
              beforeSend: function(XMLHttpRequest){
                  var url = this.url.substr(this.url.indexOf('&data_source'));
                  if(i2maps.cache[url])
                  {
                      i2maps.debug('Cache hit for ' + url);
                      this.success(i2maps.cache[url]);
                      return false;
                  }
              },
              success: function(response){    
                    $.showMessage("OK", "Good");
                    var url = this.url.substr(this.url.indexOf('&data_source'));
                    if(i2maps.cache.enabled) i2maps.cache[url] = response;
                    result_handler(response);
                },
              error: function(XMLHttpRequest, textStatus, errorThrown){    
                    $.showMessage(XMLHttpRequest.responseText, "Bad");
                },
            });
            $.showMessage("Running...", "Progress");
        },
    },
    
    updateDataTable: function(response)
    {
        var results = response;
        rows = [];
        header = [];
        for(f in results.features)
        {
            attributes = results.features[f].properties;
            column = [];
            header = [];
            for(a in attributes)
            {
                column.push(attributes[a]);
                header.push({"sTitle" : a});
            }
            rows.push(column);
        }
        $("#data_table").empty();
        dataTable1 = null;
        $("#data_table").append('<table id="table1" style="width: 100%"></table>')
        dataTable1 = $("#table1").dataTable({
        "aaData": rows, 
        "aoColumns": header, 
        "bPaginate": false,
        "bLengthChange": false,
        "bFilter": false,
        "bSort": false,
        "bInfo": false,
        "bAutoWidth": true,
        "bJQueryUI": true,
        });
    },
    updateVectorLayer: function(geojson, vector_layer, keep_features)
    {
        var geojson_format = new OpenLayers.Format.GeoJSON();
        if(keep_features != true) vector_layer.destroyFeatures();
        var current_min = Number.MAX_VALUE;
        var current_max = Number.MIN_VALUE;
        vector_layer.addFeatures(geojson_format.read(geojson));
        vector_layer.properties = geojson.properties;
        vector_layer.redraw();
        //vector_layer.map.zoomToExtent(vector_layer.getDataExtent());
        for(f in vector_layer.features)
        {
            v = (vector_layer.features[f].attributes.value || 0) * 1.0;
            if(v < current_min) current_min = v;
            if(v > current_max) current_max = v;
            vector_layer.features[f].attributes.value = v;
        }
        vector_layer.min_value = current_min;
        vector_layer.max_value = current_max;
        vector_layer.redraw();
    },
    updateSurfaceLayer: function(geojson, surface_layer)
    {
        test = geojson;
        surface_layer.setData(geojson);
        surface_layer.properties = geojson.properties;
    },
    updateTimeSeries: function(data)
    {
        i2maps.timelines.map(function(timeline){timeline.setData(0, data)});
    },
	updateInfoBox: function(feature)
    {
        if (typeof(feature) == 'string') {
            $("#attributes").html(feature);
            return;
        }
        var vector_layer = feature.layer;
        var s = '<table style="font-size: 10px;">';
        if(vector_layer)
        {
            for(f in vector_layer.features)
            {
                if(vector_layer.features[f].geometry.equals(feature.geometry))
                {
                    attributes = vector_layer.features[f].attributes;
                    for(a in attributes)
                    {
                        s += "<tr><td><b>" + a + ":&nbsp;</b></td><td>" + attributes[a] + "</td></tr>";
                    }
                    s += "<tr><td></td></tr>";
                }
            }
        }
        else
        {
            attributes = feature.attributes || feature;
            for (a in attributes)
            {
                s += "<tr><td><b>" + a + ":&nbsp;</b></td><td>" + attributes[a] + "</td></tr>";
            }
            s += "<tr><td></td></tr>";
        }
        s += "</table>";
        $("#attributes").html(s);
    },
    timestampToDateString: function(time){
        d = new Date(time);
        time = d.toTimeString().substr(0,8);
        return d.getFullYear() + '-' + (d.getMonth()+1) + '-' + d.getDate() + ' ' + time;
    },
    dateStringToTimestamp: function(dateString)
    {
        return Math.round(new Date(dateString.replace(/-/g, "/")).getTime());
    },
    debug: function(obj)
    {
        if(window.console) console.log(obj);
    },
    timeChange: function(time)
    {
        i2maps.current_time = time;
        $("#time").text(new Date(time).toUTCString());
        i2maps.timelines.map(function(timeline){timeline.setCurrentTime(time)});
        i2maps.maps.map(function(map){map.timeChange(time)});
    },
    Map: new Class(
    {	
        /**
         * The ID of this instance.
         */
        id: null,
        
        /**
         * The id of the DIV containing this map display.
         */
        mapDiv: null,
        
        /**
         * The OpenLayers map object.
         */
        olMap: null,
        projection: null,
        
        /**
         * The maximum extent of this map.
         */
        maxExtent: null,
        
        layers: [],
        
        baseLayers: null,
        
        initialize: function(options) {
            for (opt in options) { 
                this[opt] = options[opt];
            }
            if (this.projection == null) {
            	//this.projection = new OpenLayers.Projection("EPSG:4326");
            }
            if (this.mapExtent == null) {
            	this.mapExtent = new OpenLayers.Bounds.fromArray([-1120566.8344909, 6875052.0711326, -430187.59514285, 7262740.6785256]);
            }
            if (this.baseLayers == null) {
            	this.baseLayers = ["Google Physical", "Google Streets", "Google Hybrid", "Google Satellite", "Open Street Map"];
            }
            var map_options = {
            	div: this.mapDiv,
            	allOverlays: false,
            	maxExtent: this.mapExtent, 
            	controls: [
            	    new OpenLayers.Control.DragPan(),
            		new OpenLayers.Control.Navigation(),
            		new OpenLayers.Control.PanZoomBar(),
            		new OpenLayers.Control.ScaleLine(),
            		new OpenLayers.Control.MousePosition(),
            		new OpenLayers.Control.KeyboardDefaults(),
            		new OpenLayers.Control.LayerSwitcher()
            	]
            };
            for (opt in options) {
                map_options[opt] = options[opt];
            }
            this.olMap = new OpenLayers.Map(this.mapDiv, map_options);
            var max_bounds = new OpenLayers.Bounds(-20037508.34, -20037508.34, 20037508.34, 20037508.34);
            // Base Layers
            for(bl in this.baseLayers)
            {
                if(this.baseLayers[bl].CLASS_NAME)
                {
                    this.olMap.addLayer(this.baseLayers[bl]);
                }
                else if(this.baseLayers[bl] == "Google Physical")
                {
                    this.olMap.addLayer(new OpenLayers.Layer.Google(
                        "Google Physical",
                        {type: G_PHYSICAL_MAP, sphericalMercator: true, maxExtent: max_bounds}
                    ));
                }
                else if(this.baseLayers[bl] == "Google Streets")
                {
                    this.olMap.addLayer(new OpenLayers.Layer.Google(
                    "Google Streets", // the default
                    {numZoomLevels: 20, sphericalMercator: true, maxExtent: max_bounds}
                    ));
                }
                else if(this.baseLayers[bl] == "Google Hybrid")
                {
                    this.olMap.addLayer(new OpenLayers.Layer.Google(
                    "Google Hybrid",
                    {type: G_HYBRID_MAP, numZoomLevels: 20, sphericalMercator: true, maxExtent: max_bounds}
                    ));
                }
                else if(this.baseLayers[bl] == "Google Satellite")
                {
                    this.olMap.addLayer(new OpenLayers.Layer.Google(
                    "Google Satellite",
                    {type: G_SATELLITE_MAP, numZoomLevels: 22, sphericalMercator: true, maxExtent: max_bounds}
                    ));
                }
                else if(this.baseLayers[bl] == "Open Street Map")
                {
                    this.olMap.addLayer(new OpenLayers.Layer.OSM("Open Street Map"));
                }
                else if(this.baseLayers[bl] == "No Base Layer")
                {
                    this.olMap.addLayer(new OpenLayers.Layer.Image("No Base Layer",
                            "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWNgYGD4DwABBAEAHnOcQAAAAABJRU5ErkJggg==",
                                        this.olMap.maxExtent,
                                        new OpenLayers.Size(1, 1),
                                        {isBaseLayer: true}));
                }
            }
            // What happens if no base layer!?
            if(this.baseLayers.length == 0)
            {
                this.olMap.addLayer(new OpenLayers.Layer("Base Layer",{isBaseLayer: true}));
            }
            this.olMap.addLayers(this.layers);
            selectControl = new OpenLayers.Control.SelectFeature(
            	this.layers.filter(function(l){return l.isVector})
            );
            selectControl.handlers.feature.stopDown = false; // hack for dragging vector layers
            this.olMap.addControl(selectControl);
            selectControl.activate();           
            this.olMap.zoomToExtent(this.mapExtent);
            OpenLayers.Events.prototype.includeXY = true;
        },
        timeChange: function(time) {
            for(l in this.layers)
            {
                this.layers[l].events.triggerEvent("timechanged", {"time": time});
            }
        },
        init: function()
        {
            for(l in this.layers)
            {
                this.layers[l].events.triggerEvent("init");
            }
        },
        CLASS_NAME: "map"
    }),
    CLASS_NAME: "i2maps"
};
