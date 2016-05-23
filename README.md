# Dash

[![Build Status](https://travis-ci.org/alanplotko/Dash.svg?branch=master)](https://travis-ci.org/alanplotko/Dash)
[![Dependency Status](https://img.shields.io/david/alanplotko/Dash.svg?style=flat)](https://david-dm.org/alanplotko/Dash)
[![devDependencies Status](https://img.shields.io/david/dev/alanplotko/Dash.svg?style=flat)](https://david-dm.org/alanplotko/Dash#info=devDependencies)

Dash highlights the information and news you care about. Rather than opening up various tabs to catch up on what's going on, Dash will bring the information to you. Users will be able to connect various social media sites and opt to highlight specific content (e.g. Facebook pages, Facebook group posts, subreddits, Twitter users, emails, etc.) Users will also have the option to sort sources into custom catagories. The interface design will be minimal and will potentially follow material design standards.

# Setup

1) Download the latest development version of [Dash](https://github.com/alanplotko/Dash/archive/develop.zip) and extract it to a directory of your choosing. Alternatively, feel free to fork the repo and create a local clone.

2) Install the latest version of [Node.js](https://nodejs.org/en/).

3) Now you can cd into the directory that Dash is located in and run `npm install` to set up dependencies.

4) Run the app with `node app.js dev`. Passing in 'dev' will use the defined database in config.js for the development environment. You will need to set up MongoDB on your computer, create a database, and overwrite the database URI.

Optional: If you plan on making changes to the files, consider using nodemon. Nodemon restarts your app whenever it detects changes. To use nodemon, run the app with `nodemon app.js dev` instead.

Note: There are environment variables in the settings.js file. You will need to create your own test apps to fill in the missing information for connections. You will also need to create your own MongoDB database and update the MongoDB details accordingly. If you'd like to add a new connection, take a look at the existing connections as an example. You'll need to add the associated tokens and secrets in the settings.js file.

# Contributing

Dash is in early stages right now and is undergoing development, so there's not much to contribute so far. However, feel free to post suggestions and ideas (see [CONTRIBUTING.md](https://github.com/alanplotko/Dash/blob/master/CONTRIBUTING.md) for opening issues)! When Dash is a tad more mature (or if you're feeling adventurous and impatient), feel free to fork the repo and make a pull request.
