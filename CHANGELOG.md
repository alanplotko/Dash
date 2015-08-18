## Changelog

### Planned Features & Changes

- Redesign & Restructuring
  - Move to SVGs
  - Font changes (setup process)
  - Consider moving to Local Storage
  - Move to different server framework

- User Settings Page
  - Change name
  - Allow automatic updates at set intervals of time
  - Change mascot image

- Modify Installation Process
  - Collect information via forms instead of command prompt
  - Expand compatability to beyond Windows
  - Switch out module installation screen for a selection between two options. The default option is the standard installation, which will install all default modules that will be included with future versions of Dash (news, time, weather, and so on). The other option is a custom installation that will allow the user to choose what modules to install (including the modules that will come with Dash) and change the default user settings.

- Refreshing Modules
  - If files are missing (e.g. try-catch for missing settings.json file, etc.), report back the module as broken, remove the broken module from the dictionary, and create a unique link to reinstall that module from the dashboard instead of having to click the 'install new module' button.

- Module Repository
  - Create an online repository of modules that developers can submit to (perhaps a folder on GitHub under Dash that developers will send a pull request to). Dash will go to this repository for module installation. The user can search or select a module to install. Alternatively, the user can elect to install a custom module that he or she has written or downloaded manually.
    - Module verification
      - If a module is not in the repository, mark the module as unverified. One user setting will be to enable developer mode and allow custom modules.
  - Treat modules as individual or as bundles. For instance, modules that would be useful for Binghamton University students can be put in a Binghamton University bundle or pack that will allow installation of all modules in that pack. Bundles or packs can be suggested to users during the installation process to give them a foundation of modules to install.

- Default Modules
  - News
    - Grabs recent posts from websites you choose. The user can opt for certain news topics.
  - Time
    - Detects the user's time zone and reports the current time.
  - Weather
    - Detects the user's location and reports the current weather. The user can opt for a particular city, state, zip code, etc.

### v1.0.0 - 4/13/2014

- Initial Release
  - Bare-bones version (no modules included).
