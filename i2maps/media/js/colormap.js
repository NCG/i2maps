function getColor(value, min, max, hex)
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