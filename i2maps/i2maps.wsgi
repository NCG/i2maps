import os
import sys
sys.stdout = sys.stderr # sys.stdout access restricted by mod_wsgi
os.environ['DJANGO_SETTINGS_MODULE'] = 'i2maps.settings'
import django.core.handlers.wsgi
application = django.core.handlers.wsgi.WSGIHandler()
