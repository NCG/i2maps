if(i2maps == undefined) i2maps = {};
i2maps.colormap = (function (){
    var o = {};
    o.colormaps = {};
    o.colormaps['jet'] = {
        "blue": [[0.0, 0.5, 0.5], [0.11, 1, 1], [0.34, 1, 1], [0.65, 0, 0], [1, 0, 0]], 
        "green": [[0.0, 0, 0], [0.125, 0, 0], [0.375, 1, 1], [0.64, 1, 1], [0.91, 0, 0], [1, 0, 0]], 
        "red": [[0.0, 0, 0], [0.35, 0, 0], [0.66, 1, 1], [0.89, 1, 1], [1, 0.5, 0.5]]};
    o.colormaps['hot'] = {
        "blue": [[0.0, 0.0, 0.0], [0.746032, 0.0, 0.0], [1.0, 1.0, 1.0]], 
        "green": [[0.0, 0.0, 0.0], [0.365079, 0.0, 0.0], [0.746032, 1.0, 1.0], [1.0, 1.0, 1.0]], 
        "red": [[0.0, 0.0416, 0.0416], [0.365079, 1.0, 1.0], [1.0, 1.0, 1.0]]};
    o.colormaps['grays'] = {
        "blue": [[0.0, 0, 0], [1.0, 1, 1]], 
        "green": [[0.0, 0, 0], [1.0, 1, 1]], 
        "red": [[0.0, 0, 0], [1.0, 1, 1]]};
    
    var interpolate = function(f, a, b){
        return a + (f * (b-a));
    }
    var find_index = function(a, v){for(var i=0; i < a.length; i++){if(v < a[i]) return i}};
    
    var lpad = function(s, len){while(s.length < len){s = '0' + s} return s};
    
    var make_colormap = function(name){
        var cdict = o.colormaps[name];
        var stops = {};
        for(c in cdict)
        {
            stops[c] = [];
            cdict[c].forEach(function(x){stops[c].push(x[0])})
        }
        var f = function(min, max){
            var cm = function(value, default_color)
            {
                if(value < min || value > max) return default_color;
                var v = (value-min) * (1/(max-min));
                // console.log('v:' + v);
                var color = {};
                for(c in cdict)
                {
                    if(v < 0) v = 0;
                    if(v < 1)
                    {
                        var key = find_index(stops[c], v) - 1;
                        var x0 = cdict[c][key][0];
                        var x1 = cdict[c][key+1][0];
                        var x = (v - x0)/ (x1 - x0);
                        var a = cdict[c][key][2];
                        var b = cdict[c][key+1][1];
                        color[c] = interpolate(x, a, b);
                    }
                    else
                    {
                        color[c] = cdict[c][stops[c].length-1][2];
                    }
                    color[c] = Math.floor(color[c] * 255);
                }
                if(arguments[arguments.length-1] === true)
                {
                      return "#" + lpad(color['red'].toString(16), 2) + lpad(color['green'].toString(16), 2) + lpad(color['blue'].toString(16), 2);
                }
                var c = [color['red'], color['green'], color['blue'], 255];
                c.html = function(){
                    return "#" + lpad(this[0].toString(16), 2) + lpad(this[1].toString(16), 2) + lpad(this[2].toString(16), 2);
                };
                
                return c;
            }
            cm.min = min;
            cm.max = max;
            return cm;
        }
        return f
    }
    
    for(var c in o.colormaps)
    {
        o.__defineGetter__(c, (function(c){return function(){return make_colormap(c)}})(c));
    }
    
    
    o.jet2 = function(value, min, max, hex)
    {
          var r = 0;
          var g = 0;
          var b = 0;
          var v = 1 - (value - min) * (1 / (max - min));
          if(v < 0.33)
          {
              r = 208;
              g = 131 + ((208-131) * v/0.33);
              b = 131;
          }
          else if(v >= 0.33 && v < 0.66)
          {
              r = 208 - ((208-131) * (v-0.33)/0.33);
              g = 208
              b = 131 + ((208-131) * (v-0.33)/0.33);
          }
          else //if(v >= 0.66)
          {
              r = 131;
              g = 208 - ((208-131) * (v-0.66)/0.33);
              b = 208;
          }
          r = Math.floor(r);
          g = Math.floor(g);
          b = Math.floor(b);
          if(hex)
          {
              return "#" + r.toString(16) + g.toString(16) + b.toString(16);
          }
          return [r,g,b];
    }
    
    o.categories = function (i, n)
    {
        var colors = [];
        if(n <= 10)
        {
            colors = ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf"];
        }
        else
        {
            colors = ["#9c9ede", "#7375b5", "#4a5584", "#cedb9c", "#b5cf6b", "#8ca252", "#637939", "#e7cb94", "#e7ba52", "#bd9e39", "#8c6d31", "#e7969c", "#d6616b", "#ad494a", "#843c39", "#de9ed6", "#ce6dbd", "#a55194", "#7b4173"];
        }
        if(i >= colors.length) i = colors.length - 1;
        return colors[i];
    }
    return o;
})();




