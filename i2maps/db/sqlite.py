import django.contrib.gis.geos as geos
import sqlite3

import i2maps
import database

sqlite3.register_converter("datetime", i2maps.datestring_to_datetime)
sqlite3.register_converter("GEOMETRY", geos.GEOSGeometry)
sqlite3.register_adapter(geos.Point, str)
sqlite3.register_adapter(geos.Polygon, str)
sqlite3.register_adapter(geos.GeometryCollection, str)
sqlite3.register_adapter(geos.LineString, str)
sqlite3.register_adapter(geos.LinearRing, str)
sqlite3.register_adapter(geos.MultiLineString, str)
sqlite3.register_adapter(geos.MultiPoint, str)
sqlite3.register_adapter(geos.MultiPolygon, str)

class Sqlite(database.Database):
    
    def __init__(self, path):
        self.connection = sqlite3.connect(database=path, detect_types=sqlite3.PARSE_DECLTYPES)
        parsers = [i2maps.datestring_to_datetime, geos.GEOSGeometry]
        def parse(v):
            if isinstance(v, basestring):
                for p in parsers:
                    try:
                        v = p(v)
                        break
                    except Exception, e:
                        continue
            return v
        
        def row_factory(cursor, row):
            row = list(row)
            for idx, v in enumerate(row):
                row[idx] = parse(v)
            return sqlite3.Row(cursor, tuple(row))
        
        self.connection.row_factory = row_factory
        
    def query(self, query, params=()):
        rows = self.connection.execute(query, params)
        return rows
        
    def modify(self, query, params=()):
        with self.connection:
            self.connection.execute(query, params)
                
    def has_table(self, table):
        """
        Returns True if this SQLite database has a table with the provided
        name.
        """
        con = self.connection
        cur = con.cursor()
        res = cur.execute("""SELECT COUNT(*) FROM sqlite_master
            WHERE type='table' AND name='%s'""" % table)
        tcnt = cur.fetchall()
        cur.close()
        if tcnt[0][0] > 0:
            return True
        else:
            return False
        
    def columns(self, table):
        """
        Returns a dictionary containing the column names as keys and the
        types as values.
        """
        cur = self.connection.cursor()
        res = cur.execute("PRAGMA TABLE_INFO(%s)" % table)
        columns = {}
        for row in res:
            columns[row[1]] = row[2]
        return columns
        