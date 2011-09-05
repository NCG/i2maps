import json
from datetime import datetime, timedelta
import time

import numpy as np

import pico

def load(filename):
    a = np.load(filename + '.npy', mmap_mode='r+')
    ref = json.load(open(filename + '.json'))
    ref['memmapped_filename'] = filename
    return SpatialArray(a, ref['envelope'], ref=ref)

def save(filename, a):
    if not a.ref.has_key('memmapped_filename'):
        np.save(filename + '.npy', a)
    json.dump(a.ref, open(filename + '.json', 'w'))

        
class SpatialArray(np.ndarray):
    
    def __new__(cls, input_array, envelope, ref={}):
        # Input array is an already formed ndarray instance
        # We first cast to be our class type
        obj = np.asarray(input_array).view(cls)
        obj.reshape(input_array.shape)
        # add the new attribute to the created instance
        obj.envelope = envelope
        obj.ref = ref
        # Finally, we must return the newly created object:
        return obj
    
    def __array_finalize__(self, obj):
        if obj is None: return
        if hasattr(obj, 'new_envelope'):
            self.envelope = obj.new_envelope
            del obj.new_envelope
        elif hasattr(obj, 'envelope'):
            self.envelope = obj.envelope
        if hasattr(obj, 'ref'):
            self.ref = obj.ref
    
    @property
    def bbox(self):
        #[left, bottom, right, top]
        return [self.envelope[1][0], self.envelope[0][1], self.envelope[1][1], self.envelope[0][0]]

    @property
    def nodata(self):
        return (self.ref.get('nodata', None) or -999.0)
                
    def __getslice__(self, i, j):
        idx = (slice(i,j, None),)
        self.new_envelope = self._new_envelope(idx)
        idx = self._convert_indices(idx)
        i, j = idx[0].start, idx[0].stop
        return np.ndarray.__getslice__(self, i, j)
    
    def __getitem__(self, idx):
        if not isinstance(idx, tuple):
            idx = (idx,)
        self.new_envelope = self._new_envelope(idx)
        idx = self._convert_indices(idx)
        return np.ndarray.__getitem__(self, idx)
        
    def __setitem__(self, idx, value):
        if not isinstance(idx, tuple):
            idx = (idx,)
        idx = self._convert_indices(idx)
        return np.ndarray.__setitem__(self, idx, value)
    
    def __setslice__(self, i, j, value):
        idx = (slice(i,j, None),)
        idx = self._convert_indices(idx)
        i, j = idx[0].start, idx[0].stop
        return np.ndarray.__setitem__(self, i, j, value)
    
    def _new_envelope(self, idx):
        envelope = map(lambda x: [x[0], x[1]], self.envelope)
        for dim, s in enumerate(idx):
            if type(s) == slice:
                if s.start is None or type(s.start) is int:
                    envelope[dim][0] = self._index_to_spatial(dim, s.start) if s.start else envelope[dim][0]
                    envelope[dim][1] = self._index_to_spatial(dim, s.stop-1) if s.stop else envelope[dim][1]
                else:
                    envelope[dim][0] = s.start if s.start else envelope[dim][0]
                    envelope[dim][1] = s.stop if s.stop else envelope[dim][1]
            else:
                if type(s) is int:
                    g = self._index_to_spatial(dim, s)
                    envelope[dim] = [g, g]
                else:
                    envelope[dim] = [s, s]
        return envelope
        
    def _convert_indices(self, idx):
        idx = list(idx)
        for dim, s in enumerate(idx):
            if type(s) == slice:
                start, stop, step = s.start, s.stop, s.step
                if s.start and type(s.start) is not int:
                    start = self._spatial_to_index(dim, s.start)
                if s.stop and type(s.stop) is not int:
                    stop = self._spatial_to_index(dim, s.stop)
                s = slice(start, stop, step)
                idx[dim] = s
            else:
                if type(s) is not int:
                    idx[dim] = self._spatial_to_index(dim, s)
        return tuple(idx)
    
    @property
    def ndims(self):
        """
        Returns the number of dimensions.
        """
        return len(self.shape)
        
    @property
    def resolution(self):
        return tuple([(self.size[i] / self.shape[i]) for i in range(0, self.ndims)])
        
    @property
    def size(self):
        """
        The size of the raster in real world coordinates for each dimension.
        """
        e = self.envelope[:]
        size = [e[i][1] - e[i][0] if isinstance(e[i][0], (float,int,long, datetime)) else len(e[i]) for i in range(0, self.ndims)]
        return tuple(size)
    
    def _index_to_spatial(self, dimension, index):
        if isinstance(self.envelope[dimension][0], (float,int,long)):
            return ((float(index) + 0.5) * self.resolution[dimension]) + self.envelope[dimension][0]
        elif type(self.envelope[dimension][0]) is str:
            return self.envelope[dimension][index]
        elif type(self.envelope[dimension][0]) is datetime:
            (index * self.resolution[dimension]) + self.envelope[dimension][0]
        else:
            return -1
    
    def _spatial_to_index(self, dimension, spatial):
        env = self.envelope[dimension]
        r = self.resolution[dimension]
        if type(spatial) is float:
            return int(np.floor((spatial - env[0]) / r))
        elif type(spatial) is str:
            return env.index(spatial)
        elif type(spatial) is datetime:
            return int(np.floor((time.mktime(spatial.timetuple()) - time.mktime(env[0].timetuple())) / r.seconds))
        else:
            return spatial
        
    
    def pixel_to_spatial(self, px):
        """
        Converts pixel coordinates to spatialgraphic space coordinates.
        Returns the coordinate at the centre of the pixel.
        """
        spatial = []
        for i in range(0, min(self.ndims, len(px))):
            spatial.append(self._index_to_spatial(i, px[i]))
        return tuple(spatial)
        
        
    def spatial_to_pixel(self, spatial):
        """
        Converts real-world coordinates to pixel coordinates.
        """
        resolution = self.resolution[:]
        envelope = self.envelope[:]
        px = []
        for i in range(0, min(self.ndims, len(spatial))):
            px.append(self._spatial_to_index(i, spatial[i]))
        return tuple(px)
    
    @property
    def json(self):
        properties = {}
        properties.update(self.ref.get('properties', None) or {})
        response = {}
        response['bbox'] = self.bbox #[l, b, r, t]
        response['shape'] = self.shape
        response['data'] = np.around(self.view(np.ndarray), decimals=2)
        response['properties'] = properties
        return pico.to_json(response)
    
    def iteritems(self):
        r_i, r_j = self.resolution
        xs = np.arange(self.envelope[0][0], self.envelope[0][1], r_i)
        ys = np.arange(self.envelope[1][0], self.envelope[1][1], r_j)
        for i in range(0, self.shape[0]):
            for j in range(0, self.shape[1]):
                y, x = ys[j], xs[i]
                z = self[i,j]
                yield np.array([x,y,z])
    
    def items(self):
        r_i, r_j = self.resolution
        xs, ys = np.mgrid[self.envelope[0][0]:self.envelope[0][1]:r_i, self.envelope[1][0]:self.envelope[1][1]:r_j]
        xs = xs.flatten()
        ys = ys.flatten()
        values = self.ravel()
        a = np.zeros((len(values), 3))
        a[:,0] = ys
        a[:,1] = xs
        a[:,2] = values
        return a
        
    
    def save(self, filename=None):
        ref = self.ref
        ref['envelope'] = self.envelope
        if ref.has_key('memmapped_filename'):
            filename = ref['memmapped_filename']
            del ref['memmapped_filename']
            json.dump(ref, open(filename + '.json', 'w'))
        elif filename:
            np.save(filename + '.npy', self)
            json.dump(ref, open(filename + '.json', 'w'))
            
    def reload(self):
        filename = self.ref['memmapped_filename']
        self.ref = json.load(open(filename + '.json', 'r'))