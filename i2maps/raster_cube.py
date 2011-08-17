import datetime
import os
import numpy as np

import spatial_array

def load(filename):
    a = RasterCube(spatial_array.load(filename))
    return a
    
class RasterCube():
    
    
    def __init__(self, input_spatial_array=None, filename=None, shape=None, envelope=None):
        if input_spatial_array is not None:
            self.spatial_array = input_spatial_array
        elif filename: 
            a = spatial_array.SpatialArray(np.zeros(shape), envelope)
            a.save(filename)
            self.spatial_array = spatial_array.load(filename)
        if not self.spatial_array.ref.has_key('times'):
            self.spatial_array.ref['times'] = {}
    
    def insert(self, surface, time):
        max_length = self.spatial_array.shape[2]
        times = self.spatial_array.ref['times']
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
        self.spatial_array[:,:,idx] = surface
        self.spatial_array.ref['times'] = times
        self.spatial_array.save()
        return idx
        
    def surface(self, time=None):
        times = np.array(self.times())
        if not time: time = times[-1]
        time_key = times[times.searchsorted(time) - 1]
        idx = self.spatial_array.ref['times'][time_key]
        if idx > -1:
            self.spatial_array.ref['properties'] = {'time': time_key}
            surface = self.spatial_array[:,:,idx]
            return surface
        else:
            return {}
    
    def remove(self, time):
        self.spatial_array.ref['times'].pop(time)
        self.spatial_array.save()
    
    def timeline(self, geo_x, geo_y):
        py, px = self.spatial_array.spatial_to_pixel((geo_y, geo_x))
        values = self.spatial_array[py,px,:]
        times = self.spatial_array.ref['times']
        keys = sorted(times.keys())
        times_values = dict(zip(keys, map(lambda t: values[t], map(times.get, keys))))
        return times_values
    
    def times(self):
        return sorted(self.spatial_array.ref['times'].keys())
    
    def save(self, filename=None):
        self.spatial_array.save(filename)
    
    def reload(self):
        self.spatial_array.reload()