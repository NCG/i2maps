from django.conf.urls.defaults import *
import i2maps.settings as settings
from django.contrib import admin

handler500 = 'i2maps.views.error500'
handler404 = 'i2maps.views.error404'

urlpatterns = patterns('django.views.generic.simple',
    (r'^$', 'redirect_to', {'url': 'http://ncg.nuim.ie/i2maps/docs/'}),
    (r'^projects/*$', 'redirect_to', {'url': 'http://ncg.nuim.ie/i2maps/docs/index.php?page=examples'})
)

urlpatterns += patterns('',
    (r'^media/(?P<path>.*)$', 'django.views.static.serve',
            {'document_root': settings.PROJECT_PATH + 'media/'}),
    (r'^projects/(?P<path>.*)$', 'django.views.static.serve',
        {'document_root': settings.I2MAPS_PATH + 'views'}),
    # (r'^errors/(?P<path>.+)$', 'django.views.static.serve',
    #     {'document_root': error_path}),                  
)
urlpatterns += patterns('i2maps.views',
    (r'^query/$', 'query'),
    (r'^datasource/$', 'datasource'),
    (r'^call/$', 'call'),
    (r'^vector/(?P<operation>.*)$', 'complex_vector'),
    (r'^errors/(?P<key>.*)$', 'errors'),
    # (r'^$', 'index'),
)
urlpatterns += patterns('',
    (r'^sentry/', include('sentry.urls')),
)
# urlpatterns += patterns('',
#     (r'^admin/', include(admin.site.urls)),
# )

