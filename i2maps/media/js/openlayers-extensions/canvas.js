
/* 
 * This code is based on Heatmap by Bjoern Hoehrmann http://www.websitedev.de/temp/openlayers-heatmap-layer.html:
 *
 * Copyright (c) 2010 Bjoern Hoehrmann <http://bjoern.hoehrmann.de/>.
 * This module is licensed under the same terms as OpenLayers itself.
 *
 */
 
Canvas = {};
Canvas.Layer = OpenLayers.Class(OpenLayers.Layer, {

  /** 
   * APIProperty: isBaseLayer 
   * {Boolean} Canvas layer is never a base layer.  
   */
  isBaseLayer: false,


  /** 
   * Property: cache
   * {Object} Hashtable with CanvasGradient objects
   */
  cache: null,

  /** 
   * Property: gradient
   * {Array(Number)} RGBA gradient map used to colorize the intensity map.
   */
  gradient: null,

  /** 
   * Property: canvas
   * {DOMElement} Canvas element.
   */
  canvas: null,

  /** 
   * APIProperty: defaultRadius
   * {Number} Heat source default radius
   */
  defaultRadius: null,

  /** 
   * APIProperty: defaultIntensity
   * {Number} Heat source default intensity
   */
  defaultIntensity: null,

  /**
   * Constructor: Canvas.Layer
   * Create a Canvas layer.
   *
   * Parameters:
   * name - {String} Name of the Layer
   * options - {Object} Hashtable of extra options to tag onto the layer
   */
  initialize: function(name, options) {
    OpenLayers.Layer.prototype.initialize.apply(this, arguments);
    this.points = [];
    this.cache = {};
    this.canvas = document.createElement('canvas');
    this.canvas.style.position = 'absolute';
    this.defaultRadius = 20;
    this.defaultIntensity = 0.2;
    // For some reason OpenLayers.Layer.setOpacity assumes there is
    // an additional div between the layer's div and its contents.
    var sub = document.createElement('div');
    sub.appendChild(this.canvas);
    this.div.appendChild(sub);
    this.old_bounds = new OpenLayers.Bounds();
  },


    pixelToGeo: function(x, y) {
        // var lon2px = Math.abs(this.getExtent().getWidth()) / this.canvas.width;
        // var lat2px = Math.abs(this.getExtent().getHeight()) / this.canvas.height;
        // var lon = (y * lon2px) - Math.abs(this.getExtent().left);
        // var lat = (((this.canvas.height-1) - x) * lat2px) + Math.abs(this.getExtent().bottom);
        // return [lat, lon];
        // i2maps.debug("Not implemented!");
        return this.map.getLonLatFromLayerPx(new OpenLayers.Pixel(x,y))
    },
        
    geoToPixel: function(lat, lon) {
        // var lon2px = Math.abs(this.getExtent().getWidth()) / this.canvas.width;
        // var lat2px = Math.abs(this.getExtent().getHeight()) / this.canvas.height;
        // y = Math.round((lon + Math.abs(this.getExtent().left)) / lon2px);
        // x = (this.canvas.height-1) - Math.round((lat - Math.abs(this.getExtent().bottom)) / lat2px);
        
        var p = this.map.getLayerPxFromLonLat(new OpenLayers.LonLat(lat, lon)) || {x: 0, y: 0};
        p[0] = p.x;
        p[1] = p.y;
        return p;
    },
    
    colorAtGeo: function(lat, lon) {
        var p = this.geoToPixel(lat, lon);
        var ctx = this.canvas.getContext('2d');
        var data = ctx.getImageData(p[0], p[1], 1, 1).data;
        rgb = data[2] | (data[1] << 8) | (data[0] << 16);
        return "#" + rgb.toString(16);
    },

  /** 
   * Method: moveTo
   *
   * Parameters:
   * bounds - {<OpenLayers.Bounds>} 
   * zoomChanged - {Boolean} 
   * dragging - {Boolean} 
   */
  moveTo: function(bounds, zoomChanged, dragging) {
        OpenLayers.Layer.prototype.moveTo.apply(this, arguments);
            
        // The code is too slow to update the rendering during dragging.
        //if (dragging)
          //return;
        
        sx = Math.abs((this.old_bounds.left - this.old_bounds.right) / (bounds.left - bounds.right));
        //if(!this.old_bounds.equals(bounds) || sx != 1)
        if(true)
        {
            ctx = this.canvas.getContext('2d');
            ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            
            // Pick some point on the map and use it to determine the offset
            // between the map's 0,0 coordinate and the layer's 0,0 position.
            var someLoc = new OpenLayers.LonLat(0,0);
            var offsetX = this.map.getViewPortPxFromLonLat(someLoc).x -
                          this.map.getLayerPxFromLonLat(someLoc).x;
            var offsetY = this.map.getViewPortPxFromLonLat(someLoc).y -
                          this.map.getLayerPxFromLonLat(someLoc).y;
            
            if(this.map.getSize().w != this.canvas.width)
            {
                    i2maps.debug("Canvas resized!");
                    this.canvas.width = this.map.getSize().w;
                    this.canvas.height = this.map.getSize().h;
            }
            // Unfortunately OpenLayers does not currently support layers that
            // remain in a fixed position with respect to the screen location
            // of the base layer, so this puts this layer manually back into
            // that position using one point's offset as determined earlier.
            // this.canvas.style.left = (-offsetX) + 'px';
            // this.canvas.style.top = (-offsetY) + 'px';
            this.offsetX = offsetX;
            this.offsetY = offsetY;
            this.old_bounds = bounds;
            
            if(this.draw) this.draw(this.canvas);
        }
    },

  /** 
   * APIMethod: getDataExtent
   * Calculates the max extent which includes all of the heat sources.
   * 
   * Returns:
   * {<OpenLayers.Bounds>}
   */
  getDataExtent: function () {
    var maxExtent = null;
    return maxExtent;
  },

  CLASS_NAME: 'Canvas.Layer'

});
