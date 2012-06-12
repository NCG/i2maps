function load_i2maps(){
    var includes = [
    "i2maps.core.js",
    "lib/openlayers/OpenLayers.js",
    "lib/jquery-1.3.2.min.js",
    "lib/jquery-ui-1.7.2.custom.min.js",
    "lib/jquery.mousewheel.js",
    "lib/jquery.flot.js",
    "lib/ui.panel.min.js",
    "timeline.js",
    "colormap.js",
    "openlayers-extensions/surface.js",
    "openlayers-extensions/cloudmade.js",
    ]
    var $ = {};
    var scripts = document.getElementsByTagName("script");
    var src = scripts[scripts.length-1].src;
    i2MAPS_URL = src.substr(0,src.indexOf("media/js/"));
    // add startsWith to String class
    String.prototype.startsWith = function(str){
        return (this.substr(0, str.length) === str);
    };
    String.prototype.endsWith = function(str){
        return (this.substr(str.length*-1) === str);
    };
    String.prototype.f = function(subs){
        var temp = this; 
        for(var i in arguments){
            temp = temp.replace("%s", arguments[i]);
        } 
        return temp
    };
    var get = function(url){
        if(url.endsWith('.css')){
            document.write('<link type="text/css" href="' + url + '" rel="stylesheet" />');
        }
        else
        {
            document.write('<script type="text/javascript" src="' + url + '"></scr' + 'ipt>');
        }
    }
    for(var x in includes)
    {
        var url = includes[x];
        if(url.startsWith('http://') || url.startsWith('/') || url.startsWith('.')){
            url = url;
        }
        else {
            if(url.endsWith('.css')) url = i2MAPS_URL + 'media/css/' + url;
            else url = i2MAPS_URL + 'media/js/' + url;
        }
        get(url);
    }
    if(window['GOOGLE_MAPS_API_KEY'] != undefined) get("http://maps.google.com/maps?file=api&amp;v=2&amp;key=" + GOOGLE_MAPS_API_KEY);
}

// Add old/crappy (IE) browser check here, before anything else happens, without using any external libraries
// If fail, display a message on page and display:none everything else. return imediately
// Use minimum amount of code possible to reduce possibility of failure

if(!document.createElement('canvas').getContext)
{   
    function isReady(){
        if ( !document.body ) {
            return setTimeout( isReady, 13 );
        }
        else
        {
    document.getElementsByTagName('body')[0].innerHTML = '<div style="width: 100%; height: 100%; position: absolute; top: 0px; left: 0px; background-color: #000000; padding: 10%; z-index: 10000"><div style="color: #ffffff; font-size: 20px; width:80%"><p>Sorry, but your browser is not supported by this i2maps application.</p><p>i2maps requires a modern browser which supports HTML5.</p><br/><p>We recommend <a href="http://www.google.com/chrome">Chrome 5+</a> or <a href="http://www.apple.com/safari/">Safari 5+</a> for optimum performance.</p><p><a href="http://www.firefox.com">Firefox</a> should also work reasonably well.</p><br/><br/><p>No version of Internet Explorer will work.</p></div></div>';
        }
    }
    isReady();
}
else
{
    if(!window.console) console = {'debug': function(x){}, 'log': function(x){}, 'error': function(x){}};

    if(document.getElementsByTagName("body").length > 0){
        console.error("i2maps.js must be included in the HEAD of the document before the BODY is loaded!");
    }
    else{
        load_i2maps();
    }
}
