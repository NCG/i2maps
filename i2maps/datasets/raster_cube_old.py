import datetime
import os
import numpy as np
import i2maps.datasets
class Raster_cube():
    
    
    def __init__(self, filename, **kwargs):
        if len(kwargs) > 0:
            print("New raster cube")
            ref = {}
            ref['shape'] = kwargs['shape'] + (kwargs['size'],)
            ref['bbox'] =  kwargs['bbox'] # [west, south, east, north]
            ref['envelope'] = [[ref['bbox'][0], ref['bbox'][2]], [ref['bbox'][1], ref['bbox'][3]], [0, 0]]
            ref['times'] = {}
            self.raster = i2maps.datasets.NDimRaster(filename, params=ref)
        else:
            if os.path.exists(filename + '.ndrst'):
                self.raster = i2maps.datasets.NDimRaster(filename)
            else:
                raise Exception('Raster cube with filename %s not found'%filename)
    
    def insert(self, surface, time):
        max_length = self.raster.ref['shape'][2]
        times = self.raster.ref['times']
        keys = sorted(times.keys())
        if time in times:
            idx = times.get(time)
        else:
            if len(keys) == max_length:
                oldest = keys.pop(0)
                idx = times[oldest]
                del times[oldest]
            else:
                # find an unused index within the allowable range
                idx = [i for i in range(max_length) if i not in times.values()][0]
            times[time] = idx
        keys = sorted(times.keys())
        # insert prediction_surface into NDimRaster
        self.raster[:,:,idx] = surface
        self.raster.ref['times'] = times
        # self.raster.ref['envelope'][-1] = [keys[0], keys[-1]]
        self.raster.save()
        return idx
        
    def surface(self, time):
        idx = self.raster.ref['times'].get(time, -1)
        if idx > -1:
            surface = self.raster[:,:,idx]
            # line below is a hack because the data is saved in the array the wrong way around. 
            surface = surface.T[range(surface.shape[1]-1, -1, -1),:]
            return surface
        else:
            raise Exception("No surface stored for time %s"%time)
    
    def remove(self, time):
        self.raster.ref['times'].pop(time)
    
    def timeline(self, geo_x, geo_y):
        px, py = self.raster.geo_to_pixel((geo_x, geo_y))
        values = self.raster[px,py,:]
        times = self.raster.ref['times']
        keys = sorted(times.keys())
        times_values = dict(zip(keys, map(times.get, keys)))
        return times_values
    
    def times(self):
        return sorted(self.raster.ref['times'].keys())
    
    def bbox(self):
        return self.raster.ref['bbox']