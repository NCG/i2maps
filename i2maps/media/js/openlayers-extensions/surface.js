/* Copyright (c) 2006-2008 MetaCarta, Inc., published under the Clear BSD
 * license.  See http://svn.openlayers.org/trunk/openlayers/license.txt for the
 * full text of the license. */
 
/**
 * @requires OpenLayers/Layer.js
 * @requires OpenLayers/Tile/Image.js
 */

/**
 * Class: OpenLayers.Layer.Surface
 * Instances of OpenLayers.Layer.Surface are used to display data from a 2d array as a map layer.
 * The data is rendered to a canvas and added to an image layer
 * Create a new image layer with the
 * <OpenLayers.Layer.Image> constructor.  Inherits from <OpenLayers.Layer>.
 */
OpenLayers.Layer.Surface = OpenLayers.Class(OpenLayers.Layer.Image, {

    min_value: 0,
    max_value: 0,
    data: null,
    null_value: -999,
    
    /**
     * Constructor: OpenLayers.Layer.Image
     * Create a new image layer
     *
     * Parameters:
     * name - {String} A name for the layer.
     * url - {String} Relative or absolute path to the image
     * extent - {<OpenLayers.Bounds>} The extent represented by the image
     * size - {<OpenLayers.Size>} The size (in pixels) of the image
     * options - {Object} Hashtable of extra options to tag onto the layer
     */
    initialize: function(name, options) {
        this.url = $('<canvas></canvas>')[0].toDataURL();
        this.colormap;
        var irl = [-1120566.8344909, 6875052.0711326, -430187.59514285, 7262740.6785256];
        this.extent = new OpenLayers.Bounds.fromArray(irl);
        this.maxExtent = this.extent;
        this.size = new OpenLayers.Size(200, 200);
        this.aspectRatio = (this.extent.getHeight() / this.size.h) / (this.extent.getWidth() / this.size.w);
        this.overlay_layer = false;
        OpenLayers.Layer.prototype.initialize.apply(this, [name, options]);
        this.isBaseLayer = false;
        selected_point = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.Point(0,0), {value: 0});
        selected_point.surface = this;
        this.feature = {};
        this.manual_range_set = false;
    },
    
    pixelToGeo: function(y,x) {
        var lon2px = Math.abs(this.extent.getWidth()) / this.size.w;
        var lat2px = Math.abs(this.extent.getHeight()) / this.size.h;
        var lon = (y * lon2px) - Math.abs(this.extent.left);
        var lat = (((this.size.h-1) - x) * lat2px) + Math.abs(this.extent.bottom);
        return [lat, lon];
    },
        
    geoToPixel: function(lat, lon) {
        var lon2px = Math.abs(this.extent.getWidth()) / this.size.w;
        var lat2px = Math.abs(this.extent.getHeight()) / this.size.h;
        y = Math.round((lon + Math.abs(this.extent.left)) / lon2px);
        x = (this.size.h-1) - Math.round((lat - Math.abs(this.extent.bottom)) / lat2px);
        return [x, y];
    },
    
    getValue: function(x, y){
        return this.data[(y * this.shape[1]) + x];
    },
    /**
     * Method: destroy
     * Destroy this layer
     */
    destroy: function() {
        if (this.tile) {
            this.removeTileMonitoringHooks(this.tile);
            this.tile.destroy();
            this.tile = null;
        }
        OpenLayers.Layer.prototype.destroy.apply(this, arguments);
    },
    
    onmousemove: function(e) {
        if(!this.visibility){
           return;
        }
        var coord = this.getLonLatFromViewPortPx(new OpenLayers.Pixel(e.xy.x, e.xy.y));
        if (coord.lat >= this.extent.bottom && coord.lat <= this.extent.top &&
            coord.lon >= this.extent.left && coord.lon <= this.extent.right)
        {
            px = this.geoToPixel(coord.lat, coord.lon);
            this.events.triggerEvent("mousemove", {
                'x': coord.lon,
                'y': coord.lat,
                'pixel_x': px[0],
                'pixel_y': px[1],
            });
        }
    },
    
    onclick: function(e) {
        if(!this.visibility){
           return;
        }
        if (this.overlay_layer) {
            var f = this.overlay_layer.features[0];
            if (f && f.renderIntent != 'select') {
                f.renderIntent = 'select';
                this.overlay_layer.selectedFeatures.push(f);
                this.overlay_layer.drawFeature(f);
            }
        }
        var coord = this.getLonLatFromViewPortPx(new OpenLayers.Pixel(e.xy.x, e.xy.y));
        if (coord.lat >= this.extent.bottom && coord.lat <= this.extent.top &&
            coord.lon >= this.extent.left && coord.lon <= this.extent.right)
        {
            px = this.geoToPixel(coord.lat, coord.lon);
            this.feature.x = px[1];
            this.feature.y = px[0];
            this.feature.coord = {'x': coord.lon, 'y': coord.lat};
            this.drawSelectedPoint();
            this.events.triggerEvent("featureselected", this.feature);
        }
    },
    
    setValueRange: function(min, max){
        this.manual_range_set = true;
        this.max_value = max;
        this.min_value = min;
    },
    
    setGeometry: function(bbox, shape){
        this.maxExtent = this.extent = new OpenLayers.Bounds.fromArray(bbox);
        this.shape = shape;
        this.size = new OpenLayers.Size(this.shape[1], this.shape[0]);
        this.aspectRatio = Math.abs((this.extent.getHeight() / this.size.h) / (this.extent.getWidth() / this.size.w));
        this.tile.clear();
        this.tile.destroy();
        this.tile = null;
        this.redraw();
    },
    
    update: function(){
        if(!this.overlay_layer)
        {
            this.overlay_layer = this.map.getLayersByName("overlay")[0];
            this.overlay_layer.addFeatures([selected_point]);      
            this.overlay_layer.events.on({
            "featureselected": function(e) {
                if(e.feature.surface)
                {
                    e.feature.surface.events.triggerEvent("featureselected", e.feature.surface.feature);
                }
            }
            });
        }
        this.renderData();
        this.redraw();
        this.setupMouseEvents();
    },
    
    addTileMonitoringHooks: function(tile) {
        tile.onLoadStart = function() {
            this.events.triggerEvent("loadstart");
        };
        tile.events.register("loadstart", this, tile.onLoadStart);
      
        tile.onLoadEnd = function() {
            this.setupEvents();
            this.events.triggerEvent("loadend");
        };
        tile.events.register("loadend", this, tile.onLoadEnd);
        tile.events.register("unload", this, tile.onLoadEnd);
    },

    /** 
     * APIMethod: getURL
     * The url we return is always the same (the image itself never changes)
     *     so we can ignore the bounds parameter (it will always be the same, 
     *     anyways) 
     * 
     * Parameters:
     * bounds - {<OpenLayers.Bounds>}
     */
    getURL: function(bounds) {
        return this.url;
    },
    
    renderData: function() {
        var canvas = $('<canvas></canvas>')[0];
        canvas.width = this.size.w;
        canvas.height = this.size.h;
        if (canvas.getContext){
            var ctx = canvas.getContext('2d');
            var canvasData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        }
        var w = canvasData.width;
        var h = canvasData.height;
        for (var x = 0; x < w; x++)  {
                for (var y = 0; y < h; y++)  {
                    // Index of the pixel in the array
                    var idx = (x + y * canvas.width) * 4;
                    var color = this.draw_function(x,y)
                    canvasData.data[idx + 0] = color[0]; // Red channel
                    canvasData.data[idx + 1] = color[1]; // Green channel
                    canvasData.data[idx + 2] = color[2]; // Blue channel
                    canvasData.data[idx + 3] = color[3]; // Alpha channel
                }
            }
          ctx.putImageData(canvasData, 0, 0);
          this.url = canvas.toDataURL();
          this.tile.imgDiv.src = this.url;
    },
    
    setupEvents: function() {
    },
    
    setupMouseEvents: function() {
        var img = $(this.tile.imgDiv);
        var that = this;
        var data_x;
        var data_y;
        var mouse_down = false;
        this.map.events.register('mousemove', this, this.onmousemove);
        this.map.events.register('click', this, this.onclick);
        this.setupMouseEvents = function(){}; // Events should only be setup once after the first draw
    },
    
    drawSelectedPoint: function() {
        if(this.feature.x)
        {
            var latlon = this.pixelToGeo(this.feature.x, this.feature.y);            
            // this.feature.value = this.getValue(this.feature.x, this.feature.y) * 1.0;
            // selected_point.attributes.value = this.feature.value.toFixed(1);
            selected_point.move(new OpenLayers.LonLat(latlon[1], latlon[0]));
        }
    },

    CLASS_NAME: "OpenLayers.Layer.Surface"
});
