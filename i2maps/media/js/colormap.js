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
function getCategoryColor(i, n)
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