from vendor.bottle import *
from vendor.beaker import middleware
import lib.install
import os.path

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

""" Return 404 template if page not found """
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
        redirect('/install')  
    else:
        redirect('/dashboard')

# GET: Returning to an installation or refreshing the page
@route('/install', method='GET')
def install():
    if 'stage' in request.session:
        page = lib.install.getTemplate(request.session['stage'])
        if page == 1:
            modules = lib.install.checkModules()
            request.session['modules'] = modules
    else:
        page = lib.install.getTemplate(0)
    return template(page, **request.session) # Send session variables to template for parsing

# POST: Running an installation
@route('/install', method='POST')
def install():
    parameters = lib.install.doStep(request)
    
    # Create session variables if dictionary isn't empty
    if parameters['session_vars'] is not None and len(parameters['session_vars']) > 0:
        for key, item in parameters['session_vars'].items():
            request.session[key] = item
            
    # Update the stage, which is the user's current step in the installation process
    if request.session is not None:
        if 'stage' in request.session:
            # Redirect to dashboard if installation is complete
            if request.session['stage'] == 3:
                redirect('/dashboard')
            else:
                page = lib.install.getTemplate(request.session['stage'])
        else:
            page = lib.install.getTemplate(0)

        # Check for errors
        if 'installation_error' in request.session:
            error = request.session.pop('installation_error') # Error cleanup        
            return template(page, error=error, **request.session)
        else:
            return template(page, **request.session)

# GET: Show dashboard
@route('/dashboard', method='GET')
def showDashboard():
    if os.path.exists('files/install') and not os.path.exists('files/install/.lock'):
        redirect('/install')  
    else:
        return template('dashboard', **request.session)

def updateDashboard():
    all_modules = request.session['modules']
    widgets = request.session['widgets']
    for name, properties in all_modules.items():
        if name in widgets.keys():
            if subprocess.call(['python', 'files/modules/' + properties['Directory'] + '/' + properties['Directory'] + '.py'], shell=False) == 0:
                with open("files/modules/" + properties['Directory'] + "/report.txt", 'r') as f:
                    widgets[properties['Module']] = f.readlines()
            else:
                widgets[properties['Module']] = 'An error occured during setup for this module.'
    request.session['widgets'] = widgets

# GET: Add new module
@route('/add-module', method='GET')
def addModuleScreen():
    request.session['modules'] = lib.install.checkModules() # Get all modules again
    return template('add-module', **request.session)

@route('/add-module', method='POST')
def addModules():
    request.session['modules'] = lib.install.checkModules() # Get all modules again
    all_modules = request.session['modules']

    widgets = request.session['widgets']
    wanted_modules = request.forms.getall('module')

    if len(wanted_modules) == 0:
        return template('add-module', error='Please select at least one module.', **request.session)
    else:
        for name, properties in all_modules.items():
            if name in wanted_modules:
                if subprocess.call('start /wait python ' + 'files/modules/' + properties['Directory'] + '/install.py', shell=True) == 0:
                    if subprocess.call(['python', 'files/modules/' + properties['Directory'] + '/' + properties['Directory'] + '.py'], shell=False) == 0:
                        with open("files/modules/" + properties['Directory'] + "/report.txt", 'r') as f:
                            widgets[properties['Module']] = f.readlines()
                else:
                    widgets[properties['Module']] = 'An error occured during setup for this module.'
        request.session['widgets'] = widgets
        return template('add-module', success=1, **request.session)

# GET: Show reset page
@route('/reset', method='GET')
def reset():
    return template('reset', **request.session)

@route('/refresh/<widget>')
def refreshWidget(widget):
    all_modules = request.session['modules']
    widgets = request.session['widgets']
    for name, properties in all_modules.items():
        if name == widget:
            if subprocess.call(['python', 'files/modules/' + properties['Directory'] + '/' + properties['Directory'] + '.py'], shell=False) == 0:
                with open("files/modules/" + properties['Directory'] + "/report.txt", 'r') as f:
                    widgets[properties['Module']] = f.readlines()
            else:
                widgets[properties['Module']] = 'An error occured during setup for this module.'
    request.session['widgets'] = widgets
    redirect('/dashboard')

@route('/uninstall/<widget>')
def uninstallWidget(widget):
    request.session['widgets'].pop(widget, None)
    # Add uninstall confirmation later on (announcement bar or entire template, former preferred over latter)
    redirect('/dashboard')

if __name__ == "__main__":
    run(app=dash, host='localhost', port=8080, server='cherrypy', debug=True, reloader=True)
