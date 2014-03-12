from vendor.bottle import *
from vendor.beaker import middleware
import lib.install
import os.path
import sys

""" Set up bottle """
TEMPLATE_PATH.insert(0, 'files')            # templates for dashboard
TEMPLATE_PATH.insert(0, 'files/install')    # templates for installation
session_opts = {
    'session.type': 'file',
    'session.data_dir': './session/',
    'session.auto': True,
}
dash = middleware.SessionMiddleware(app(), session_opts)

""" Call once before each request """
@hook('before_request') # Session variables can be found at request.session
def setup_request():
    request.session = request.environ['beaker.session']

""" Redirect to error page if page not found """
@error(404)
def error404(error):
    return 'Nothing here, sorry'
    # return template('404') # make 404 template

""" Static routes for serving files in the assets directory """
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

""" Check if Dash needs to be installed """
@route('/')
def isNewInstall():
    if os.path.exists('files/install') and not os.path.exists('files/install/.lock'):
        redirect('/install', code=302)  
    else:
        return 'Welcome back.'
        # return template('dashboard') # make dashboard template

@route('/install', method='GET')
def install():
    if 'stage' in request.session:
        page = lib.install.getTemplate(request.session['stage'])
    else:
        page = lib.install.getTemplate(0)
    return template(page, **request.session) # Send session variables to template for parsing

@route('/install', method='POST')
def install():
    parameters = lib.install.doStep(request.forms)
    
    # Create session variables if dictionary isn't empty
    if len(parameters['session_vars']) != 0:
        for key, item in parameters['session_vars'].items():
            request.session[key] = item
            
    # Update the stage, which is the user's current step in the installation process
    if 'stage' in request.session:
        page = lib.install.getTemplate(request.session['stage'])
    else:
        page = lib.install.getTemplate(0)
    
    # Check for errors
    if 'installation_error' in request.session:
        error = request.session.pop('installation_error') # Error cleanup        
        return template(page, error=error, **request.session)
    return template(page, **request.session)

if __name__ == "__main__":
    run(app=dash, host='localhost', port=8080, server='cherrypy', debug=True, reloader=True)
