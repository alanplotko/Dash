# Dash

Dash highlights the information and news you care about. Rather than opening up various tabs to catch up on what's going on, Dash will bring the information to you. Users will be able to connect various social media sites and opt to highlight specific content (e.g. Facebook pages, Facebook group posts, subreddits, Twitter users, emails, etc.) Users will also have the option to sort sources into custom catagories. The interface design will be minimal and will potentially follow material design standards.

# Setup

1) Download the latest version of [Dash](https://github.com/alanplotko/Dash/archive/master.zip) and extract it to a directory of your choosing. Alternatively, feel free to fork the repo and create a local clone.

2) Install the latest version of [Node.js](https://nodejs.org/en/).

3) Now you can cd into the directory that Dash is located in and run `npm install` to set up dependencies.

4) Run the app with `node app.js dev`. Passing in 'dev' will use the defined database in config.js for the development environment. You will need to set up MongoDB on your computer, create a database, and overwrite the database URI.

Optional: If you plan on making changes to your files, I recommend installing nodemon globally. Nodemon restarts your app when it detects changes. If you have nodemon installed, run `nodemon app.js dev` to run the app.

# Plans

There are various sites Dash could potentially connect with, such as Google+, Facebook, Twitter, and Reddit. There needs to be a central account in the database that is connected with all of these sites. For instance, the user logs into Dash. They have no connected accounts. I can have options for displaying the weather, time, and so on. I can use the GitHub API to pull in latest commits or updates, so that users can "subscribe" to latest developments in Dash. These "basic modules" are defaults that the user can opt in to see aside from their content.

The user then decides to connect with Facebook. Each site will have their own series of pages for setting up and modifying what information Dash can pull and display. For every site that the user connects with, Dash will undergo the authentication process and pull the information.

The stream of content will be vertical with new content at the top. Minimal border colors and frames can signify where the content was pulled from. Everything should flow well together to provide a consistent user experience. An important feature will be the filters - the user should be able to filter by site, a custom category they created, or a particular identity. Filtering by site just highlights all content from a single site (e.g. show Facebook content only). Users will also have the option to create custom categories such as technology and news. Filtering by a category will only show content that the user tagged as belonging to that category. For instance, a user specifies showing all posts from subreddit A and Facebook group B. The user tags A and B as "tech". The user then adds a Twitter feed C and tags it as "news". Filtering by "tech" will show content from A and B only. C will be hidden from that filter's view. Filtering by identity is useful for a company or person across multiple accounts. Adding that same identity's Facebook page, Twitter feed, and subreddit as a single identity will work in the same way as tagging them as a category. You can add content to a category or identity. Categories are meant for subject matter whereas identities are meant for specific people and organizations.

Many people have various sources of information that they subscribe to, but that can cause information overload. Another possible problem is finding specific information from everything else. When setting up a site, users will be able to go as far as to walk through and tag everything, or just highlight specfic things they may care about. Dash can act as a sorter or highlighter for that site. Some sites will have default filters attached that the user can opt in to. For example, a "friends" filter for a social network would highlight posts from friends and hide all other content.

# Contributing

Dash is in early stages right now and is undergoing development, so there's not much to contribute so far. However, feel free to post suggestions and ideas (i.e. open up an issue and tag it as an enhancement)! When Dash is a tad more mature (or if you're feeling adventurous and impatient), feel free to fork the repo and make a pull request.
