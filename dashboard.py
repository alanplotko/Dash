from vendor.bottle import *
from vendor.beaker import middleware
import os.path
import re

# Set up bottle
TEMPLATE_PATH.insert(0, 'files')
TEMPLATE_PATH.insert(0, 'files/install')
session_opts = {
    'session.type': 'file',
    'session.data_dir': './session/',
    'session.auto': True,
}
dash = middleware.SessionMiddleware(app(), session_opts)

# Session variables can be found at request.session
@hook('before_request')
def setup_request():
    request.session = request.environ['beaker.session']
    
@error(404)
def error404(error):
    return 'Nothing here, sorry'
    #return template('404') # make 404 template

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
    
@route('/')
def isNewInstall():
    if os.path.exists('files/install') or not os.path.exists('files/install/.lock'):
        redirect('/install', code=302)
    else:
        return 'Welcome back.'

@route('/install', method='GET')
def install():
    status = request.session.get('status', None)
    if status == 1:
        return template('modules', fname=request.session['fname'])
    else:
        return template('welcome')
        
@route('/install', method='POST')
def install():
    status = request.session.get('status', None)
    if status is None:
        name = request.forms.get('full-name')
        if name is not None:
            request.session['full-name'] = re.sub(' +',' ',name)
            request.session['fname'] = name.split(" ")[0]
            request.session['lname'] = name.split(" ")[1]
            request.session['status'] = 1
            return template('modules', fname=request.session['fname'])
        else:
            return template('welcome')
    elif status == 1:
        standard = request.forms.get('standard')
        if standard == 1:
            request.session['status'] = 2
            return template('install')
        else:
            return template('modules', fname=request.session['fname'])
    else:
        pass

if __name__ == "__main__":
    run(app=dash, host='localhost', port=8080, server='cherrypy', debug=True, reloader=True)
