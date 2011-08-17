import re
import json
from datetime import datetime, timedelta
import dateutil.parser
import django.contrib.gis.geos as geos

import raster_cube

import pico

class RasterCube(pico.Pico):
    
    def __init__(self, filename):
        self.path = 'data/'
        self.raster_cube = raster_cube.load(self.path + filename)
    
    @pico.caching.cacheable
    def surface(self, time=None):
        self.raster_cube.reload()
        if not time:
            times = self.raster_cube.times()
            time = times[-1]
        surface = self.raster_cube.surface(time)
        return surface
    
    def timeline(self, geo_x, geo_y):
        self.raster_cube.reload()
        timeline = self.raster_cube.timeline(geo_x, geo_y)
        times = sorted(timeline.keys())
        timeline = dict(zip(times, map(timeline.get, times)))
        return timeline
    
    def times(self):
        return self.raster_cube.times()
