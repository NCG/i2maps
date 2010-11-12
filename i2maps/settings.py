import os
I2MAPS_WORKING_DIRECTORY = ''
if os.environ.has_key('i2maps_working_directory'):
    I2MAPS_WORKING_DIRECTORY = os.environ['i2maps_working_directory'] #working directory - location of projects, etc
    if I2MAPS_WORKING_DIRECTORY[-1] != '/': I2MAPS_WORKING_DIRECTORY += '/'
PROJECT_PATH = os.path.dirname(os.path.normpath(__file__)) + "/"
I2MAPS_PATH = I2MAPS_WORKING_DIRECTORY
DEVELOPMENT = False


# Django settings for i2maps project.

DEBUG = False
TEMPLATE_DEBUG = DEBUG

DATABASE_ENGINE = 'sqlite3'  


HTTP_PROXY = ""
#HTTP_PROXY = "http://proxy3.nuim.ie:3128"

# Local time zone for this installation. Choices can be found here:
# http://en.wikipedia.org/wiki/List_of_tz_zones_by_name
# although not all choices may be available on all operating systems.
# If running in a Windows environment this must be set to the same as your
# system time zone.
TIME_ZONE = 'Europe/Dublin'

# Language code for this installation. All choices can be found here:
# http://www.i18nguy.com/unicode/language-identifiers.html
LANGUAGE_CODE = 'en-us'

SITE_ID = 1

# If you set this to False, Django will make some optimizations so as not
# to load the internationalization machinery.
USE_I18N = False

# Make this unique, and don't share it with anybody.
SECRET_KEY = '@*%tv+66lyva^1wm^u%%4n=+*z&-)$a^9iraiujdbpfd(euxv*'

ADMIN_MEDIA_PREFIX = '/admin/media/'
# List of callables that know how to import templates from various sources.

MEDIA_URL = 'media/'

MEDIA_ROOT = PROJECT_PATH + 'media/'


TEMPLATE_LOADERS = (
    'django.template.loaders.filesystem.load_template_source',
    'django.template.loaders.app_directories.load_template_source',
#     'django.template.loaders.eggs.load_template_source',
)

MIDDLEWARE_CLASSES = (
    'django.middleware.gzip.GZipMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
)

ROOT_URLCONF = 'i2maps.urls'
APPEND_SLASH = True
TEMPLATE_DIRS = (
	PROJECT_PATH + "templates/"
)

INSTALLED_APPS = (
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.sites',
    'i2maps',
)
os.environ["http_proxy"] = HTTP_PROXY
os.environ["MPLCONFIGDIR"] = PROJECT_PATH + "tmp/"
