(function($) {
    function Graph(target_, data_, options_) {
        // data is on the form:
        //   [ series1, series2 ... ]
        // where series is either just the data as [ [x1, y1], [x2, y2], ... ]
        // or { data: [ [x1, y1], [x2, y2], ... ], label: "some label" }
        
        var series = [],
            options = {
                
            },
        canvas = null,      // the canvas for the plot itself
        overlay = null,     // canvas for interactive stuff on top of plot
        eventHolder = null, // jQuery object that events should be bound to
        ctx = null, octx = null,
        target = target_,
        axes = { xaxis: {}, yaxis: {}, x2axis: {}, y2axis: {} },
        plotOffset = { left: 0, right: 0, top: 0, bottom: 0},
        canvasWidth = 0, canvasHeight = 0,
        plotWidth = 0, plotHeight = 0,
        // dedicated to storing data for buggy standard compliance cases
        workarounds = {};
        
        var points = data_[0];
        var links = data_[1];
        var current_point;
        
        this.draw = draw;
        this.getCurrentPoint = getCurrentPoint;
        this.setCurrentPoint = setCurrentPoint;
        this.test = getTest;
        
        // initialize
        constructCanvas();
        draw();
        
        function constructCanvas() {
            canvasWidth = target.width();
            canvasHeight = target.height();
            target.html(""); // clear target
            target.css("position", "relative"); // for positioning labels and overlay

            if (canvasWidth <= 0 || canvasHeight <= 0)
                throw "Invalid dimensions for graph, width = " + canvasWidth + ", height = " + canvasHeight;

            // the canvas
            canvas = $('<canvas width="' + canvasWidth + '" height="' + canvasHeight + '"></canvas>').appendTo(target).get(0);
            if ($.browser.msie) // excanvas hack
                canvas = window.G_vmlCanvasManager.initElement(canvas);
            ctx = canvas.getContext("2d");

            // overlay canvas for interactive features
            overlay = $('<canvas style="position:absolute;left:0px;top:0px;" width="' + canvasWidth + '" height="' + canvasHeight + '"></canvas>').appendTo(target).get(0);
            if ($.browser.msie) // excanvas hack
                overlay = window.G_vmlCanvasManager.initElement(overlay);
            octx = overlay.getContext("2d");

            // we include the canvas in the event holder too, because IE 7
            // sometimes has trouble with the stacking order
            eventHolder = $([overlay, canvas]);

            // bind events
            eventHolder.click(onClick);
        }

        function getDistance(point1, point2)
        {
          var dx = point1[0] - point2[0];
          var dy = point1[1] - point2[1];
          var d = dx*dx + dy*dy;
          return d;
        }

        function findNearestPoint(point)
        {
          var minDistance = Number.MAX_VALUE;
          var nearestPoint;
          for(p in points)
          {
              var d = getDistance(point, points[p]);
              if(d < minDistance)
              {
                 minDistance = d;
                 nearestPoint = p; 
              } 
          }
          return nearestPoint;
        }

        function draw()
        {
              //ctx.fillStyle = "rgba(255,255,255,1)";
              ctx.clearRect(0,0,canvasWidth,canvasHeight);
              c = 0;
              for(l in links)
              {
                  for(i in links[l])
                  {
                      if(links[l][i] > 0 && links[i][l] > 0)
                      {
                          ctx.beginPath();
                          ctx.lineWidth = 2;
                          ctx.strokeStyle = "rgba(" + links[l][i] + ",0," + (255 - links[l][i]) + ",1)";
                          ctx.strokeStyle = "rgba(255,0,0,1)";
                          ctx.moveTo(points[l][0], points[l][1]);
                          ctx.lineTo(points[i][0], points[i][1]);
                          ctx.stroke();
                          c += 1;
                      }
                  }
              }

              for(i in points)
              {
                  ctx.beginPath();
                  ctx.lineWidth = 3;
                  ctx.strokeStyle = "rgba(0,0,0,1)";
                  radius = 3;
                  ctx.arc(points[i][0], points[i][1], radius, 0, 2 * Math.PI, true);
                  if(i == current_point)
                  {
                      ctx.lineWidth = 5;
                      ctx.strokeStyle = "rgba(0,255,0,1)";
                      radius = 6;
                      ctx.arc(points[i][0], points[i][1], radius, 0, 2 * Math.PI, true);
                  }
                  ctx.stroke();
              }
        }
        
        function getCurrentPoint()
        {
            return current_point;
        }
        
        function setCurrentPoint(p)
        {
            current_point = p;
            draw();
        }
        
        function getTest()
        {
            return test;
        }

        // interactive features
        
        
        function onClick(e) {
            offset = eventHolder.offset();
            test = offset;
            var x = e.pageX - offset.left;
        	var y = e.pageY - offset.top;
    	    current_point = findNearestPoint([x,y]);
    	    draw();
        	target.trigger("graphclick", [current_point]);
        }
        
      }
    
    $.graph = function(target, data, options) {
         var graph = new Graph(target, data, options);
         return graph
    }
})(jQuery);