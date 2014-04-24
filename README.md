#Dash

Dash keeps you updated with what's happening.

Dash is the name of the mascot character for the python program, which will allow any developer to create modules (e.g. the episode tracker project ported to work with this project) and hook them into the program. The program will utilize Bottle to create a dashboard on localhost, which can be set as the home page for the end user's browser of choice.

Upon executing the program, the dashboard will open up and provide access to a variety of information retrieved through the modules that the end user opts in to use.

#Future Plans

- User settings page
  - Change name
  - Allow automatic updates at set intervals of time
  - Change mascot image

- Modify installation process
  - Collect information via forms instead of command prompt
  - Expand compatability to beyond Windows
  - Switch out module installation screen for a selection between two options. The default option is the standard installation, which will install all default modules that will be included with future versions of Dash (news, time, weather, and so on). The other option is a custom installation that will allow the user to choose what modules to install (including the modules that will come with Dash) and change the default user settings.

- Refreshing modules
  - If files are missing (e.g. try-catch for missing settings.json file, etc.), report back the module as broken, remove the broken module from the dictionary, and create a unique link to reinstall that module from the dashboard instead of having to click the 'install new module' button.


- Module repository
  - Create an online repository of modules that developers can submit to (perhaps a folder on GitHub under Dash that developers will send a pull request to). Dash will go to this repository for module installation. The user can search or select a module to install. Alternatively, the user can elect to install a custom module that he or she has written or downloaded manually.
    - Module verification
      - If a module is not in the repository, mark the module as unverified. One user setting will be to enable developer mode and allow custom modules.
  - Treat modules as individual or as bundles. For instance, modules that would be useful for Binghamton University students can be put in a Binghamton University bundle or pack that will allow installation of all modules in that pack. Bundles or packs can be suggested to users during the installation process to give them a foundation of modules to install.

- Default modules
  - News
    - Grabs recent posts from websites you choose. The user can opt for certain news topics.
  - Time
    - Detects the user's time zone and reports the current time.
  - Weather
    - Detects the user's location and reports the current weather. The user can opt for a particular city, state, zip code, etc.

#Changelog

####v1.0.0 - 4/13/2014

- Initial Release
  - Bare-bones version (no modules included).

#Screenshots

##Installation Front Page

![Installation Front Page](https://s3.amazonaws.com/fvd-data/notes/166489/1397438991-umRI4o/screen.png "Installation Front Page")

##Dashboard

![Dashboard](https://s3.amazonaws.com/fvd-data/notes/166489/1397439198-dQrxeo/screen.png "Dashboard")
