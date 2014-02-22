from vendor.bottle import *
from vendor.beaker import middleware
import os.path

# Set up bottle
TEMPLATE_PATH.insert(0, 'files')
TEMPLATE_PATH.insert(0, 'files/install')
dashboard = Bottle()
session = {
    'session.type': 'file',
    'session.data_dir': './session/',
    'session.auto': True,
}
dash = middleware.SessionMiddleware(dashboard, session)

# Session variables can be found at request.session
@hook('before_request')
def setup_request():
	request.session = request.environ['beaker.session']

# Set dashboard as default
with dashboard:

    assert dashboard is default_app()

    @error(404)
    def error404(error):
        return 'Nothing here, sorry'

    # Static routes for serving files in the assets directory    
    @get('/<filename:re:.*\.js>')
    def scripts(filename):
        return static_file(filename, root='files/assets/js')
    @get('/<filename:re:.*\.css>')
    def stylesheets(filename):
        return static_file(filename, root='files/assets/css')
    @get('/<filename:re:.*\.(jpg|png|gif)>')
    def images(filename):
        return static_file(filename, root='files/assets/img')
    @get('/<filename:re:.*\.(ico)>')
    def favicons(filename):
        return static_file(filename, root='files/assets/ico')
    @get('/<filename:re:.*\.(eot|ttf|woff|svg)>')
    def fonts(filename):
        return static_file(filename, root='files/assets/fonts')

    def install():
        if not os.path.exists('files/install') or \
           os.path.exists('files/install/.lock'):
            return False
        return True
        
    @route('/')
    def setup():
        if(install()):
            return template('install')
        return 'Welcome back.'

if __name__ == "__main__":
    run(dash, host='localhost', port=8080, server='cherrypy', debug=True, reloader=True)
