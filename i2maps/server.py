import sys
import i2maps
import pico

try:
    import IPython
    try:
        embed = IPython.Shell.IPShellEmbed()
    except:
        embed = IPython.frontend.terminal.embed.InteractiveShellEmbed()
except:
    def embed():
        print("IPython is required to run the interactive shell!")
embed.private = True
i2maps.projects_directory = None

@pico.private
def run():
    if i2maps.projects_directory:
        i2maps.modules_directory = i2maps.projects_directory + 'modules/'
        if i2maps.modules_directory not in sys.path: sys.path.insert(0, i2maps.modules_directory)
        views_directory = i2maps.projects_directory + 'views/'
    else:
        views_directory = './'
        i2maps.projects_directory = './'
    media_directory = i2maps.path + 'media/'
    
    urls = [
        ('^/(.*)$', views_directory),
        ('^/media/(.*)$', media_directory),
        ('^/$', media_directory + 'index.html'),
    ]
    
    pico.static_url_map = urls
    
    if len(sys.argv) > 1 and sys.argv[1] == 'shell':
        embed()
    else:
        pico.main()

if __name__ == '__main__':
    run()