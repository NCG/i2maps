import sys
import i2maps
import pico

i2maps.projects_directory = ''

def run():
    i2maps.modules_directory = i2maps.projects_directory + 'modules/'
    if i2maps.modules_directory not in sys.path: sys.path.insert(0, i2maps.modules_directory)
    
    urls = [
        ('^/(.*)$', i2maps.projects_directory + 'views/'),
        ('^/media/(.*)$', i2maps.path + 'media/'),
        ('^/$', i2maps.path + 'media/index.html'),
    ]
    
    pico.static_url_map = urls
    pico.main()


if __name__ == '__main__':
    run()