from django.conf.urls.defaults import *
import i2maps.settings as settings
import tempfile
error_path = tempfile.gettempdir() + '/'

handler500 = 'i2maps.views.error500'
handler404 = 'i2maps.views.error404'


urlpatterns = patterns('',
    (r'^media/(?P<path>.*)$', 'django.views.static.serve',
            {'document_root': settings.PROJECT_PATH + 'media/'}),
    (r'^projects/(?P<path>.*)$', 'django.views.static.serve',
        {'document_root': settings.I2MAPS_PATH + 'views'}),
    (r'^error/(?P<path>.*)$', 'django.views.static.serve',
        {'document_root': error_path}),                  
)
urlpatterns += patterns('i2maps.views',
    (r'^query/$', 'query'),
    (r'^datasource/$', 'datasource'),
    (r'^call/$', 'call'),
    (r'^vector/(?P<operation>.*)$', 'complex_vector'),
    (r'^$', 'index'),
)