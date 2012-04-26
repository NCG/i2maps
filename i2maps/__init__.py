import os
import datetime
import time
import json
import django.contrib.gis.geos as geos
import django.contrib.gis.gdal as gdal

path = os.path.dirname(os.path.normpath(__file__)) + "/"

def datetime_to_timestamp(d):
    """Convert datetime.datetime object to an int (number of seconds since the epoch)."""
    return int(time.mktime(d.timetuple()))

def datetime_to_datestring(d):
    """Convert datetime.datetime object to a datestring, "YYYY-mm-dd HH:MM:SS"."""
    return str(d)[:19]

def timestamp_to_datetime(d):
    """Convert an int to a datetime.datetime object."""
    return datetime.datetime.utcfromtimestamp(d)

def datestring_to_datetime(s):
    """Convert a datestring, "YYYY-mm-dd HH:MM:SS", to a datetime.datetime object."""
    return datetime.datetime.strptime(s, '%Y-%m-%d %H:%M:%S')

def datestring_to_timestamp(s):
    """Convert a datestring, "YYYY-mm-dd HH:MM:SS", to an int (number of seconds since the epoch)."""
    return datetime_to_timestamp(datestring_to_datetime(s))

def geoms_from_json(f, key=None):
    if hasattr(f, 'read'):
        d = json.load(f)
    else:
        d = json.loads(f)
    if key==None and 'geom' in d.itervalues().next():
        key = 'geom'
    if key==None and 'geometry' in d.itervalues().next():
        key = 'geometry'
    for k in d:
        if key:
            d[k] = geos.GEOSGeometry(json.dumps(d[k][key]))
        else:
            d[k] = geos.GEOSGeometry(json.dumps(d[k]))
    return d

def geoms_from_shapefile(filename, id=None):
    ds = gdal.DataSource(filename)
    layer = ds[0]
    id_column = lambda f: f.get(id) if id else f.fid
    geoms = {id_column(f): geos.GEOSGeometry(f.geom.wkt) for f in layer}
    return geoms
