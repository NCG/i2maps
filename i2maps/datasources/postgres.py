from django.shortcuts import render_to_response, get_object_or_404
from django.http import HttpResponse, HttpResponseRedirect, HttpResponseServerError
import i2maps.settings as settings
from django.core.urlresolvers import reverse
from django.contrib.gis.geos import GEOSGeometry, Point
from django.contrib.gis.gdal import SpatialReference, CoordTransform
import urllib
import datetime
import time
import os
import re
import json
import decimal

try:
    import psycopg2
except:
    print("You don't have psycopg2 installed.")
    print("You can still use i2maps, but some features won't work.")



class Postgres():
    def __init__(self, config):
        if config.has_key('port') == False:
            config['port'] = 5432
        self.connection = psycopg2.connect(database=config['database'], \
                                user=config['user'], \
                                password=config['password'], \
                                host=config['host'], \
                                port=config['port'])
        self.cursor = self.connection.cursor()
                                
    def feature_query(self, query, parameters = {}):
        def printDecimal(d):
            n = 3 # Number of decimal places
            s = str(d)
            s = s[:s.find('.') + 1 + n]
            return '|' + s + '|'
        
        for k in parameters:
            query = query.replace("${%s}"%k, str(parameters[k]))
        
        cur = self.cursor
        rows = self.query(query)
        cols = cur.description
        id_col = -1
        geometry_col = -1
        for i in range(0, len(cols)):
            if cols[i][0] == 'id':
                id_col = i
            if cols[i][0] == 'geometry':
                geometry_col = i
        result = {}
        result['type'] = 'FeatureCollection'
        features = []
        for m in rows:
            feature = {}
            feature['type'] = 'Feature'
            if geometry_col > -1:
                geometry = GEOSGeometry(m[geometry_col])
                # Google Projection
                proj = '+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +no_defs'
                geometry.transform(SpatialReference(proj))
                feature['geometry'] = json.loads(geometry.json, parse_float=decimal.Decimal)
            if id_col > -1: feature['id'] = m[id_col]
            properties = {}
            for i in range(0, len(cols)):
                if i != geometry_col: properties[cols[i][0]] = str(m[i]) # this throws a UnicodeEncodeError with unicode strings
            feature['properties'] = properties
            features.append(feature)
        result['features'] = features
        properties = {}
        properties['count'] = len(features)
        result['properties'] = properties
        return result
        
    def query(self, query):
        try:
            cur = self.cursor
            cur.execute(query)
            self.connection.commit()
            if cur.rowcount > 0:
                rows = cur.fetchall()
            else:
                rows = []
            return rows
        except psycopg2.IntegrityError, e:
            print(e)
            self.connection.rollback()
            raise Exception('duplicate key')
        except Exception, e:
            print(e)
            self.connection.rollback()
            raise
    
    def has_table(self, table):
        tables = self.query("select tablename from pg_tables where schemaname='public' and tablename='%s'"% table)
        return len(tables) > 0
        
