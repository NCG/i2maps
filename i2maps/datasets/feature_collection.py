import json        
import django.contrib.gis.geos as geos
import i2maps.output

class FeatureCollection(list):
    
    def __init__(self, data, column_names):
        temp = []
        for row in data:
            row = list(row)
            for i, col in enumerate(row):
                try:
                    row[i] = geos.GEOSGeometry(col)
                except Exception:
                    pass
            row = dict(zip(column_names, row))
            temp.append(row)
        list.__init__(self, temp)
        self.column_names = column_names
    
    @property
    def json(self):
        result = {}
        result['type'] = 'FeatureCollection'
        features = []
        for row in self:
            feature = {}
            feature['type'] = 'Feature'
            properties = {}
            for col in row:
                if isinstance(row[col], geos.GEOSGeometry):
                    feature['geometry'] = json.loads(row[col].json)
                else:
                    properties[col] = row[col]
            feature['properties'] = properties
            features.append(feature)
        result['features'] = features
        return i2maps.output.to_json(result)
    
    def __getslice__(self, i, j):
        return FeatureCollection(list.__getslice__(self, i, j), self.column_names)
