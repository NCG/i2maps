import os
import datetime
import time

path = os.path.dirname(os.path.normpath(__file__)) + "/"

def datetime_to_timestamp(d):
    return int(time.mktime(d.timetuple()))

def datetime_to_datestring(d):
    return str(d)[:19]

def timestamp_to_datetime(d):
    return datetime.datetime.utcfromtimestamp(d)

def datestring_to_datetime(s):
    return datetime.datetime.strptime(s, '%Y-%m-%d %H:%M:%S')

def datestring_to_timestamp(s):
    return datetime_to_timestamp(datestring_to_datetime(s))