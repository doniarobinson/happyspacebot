# happyspacebot

This bot uses AJAX to pull a photo from the NASA photo API and a quote from api.forismatic.com to tweet.

## Set Up Config File

Copy *config.js.example* to *config-private.js*

Set up accounts and API access, and fill in API keys in *config-private.js* file; when running locally, the bot will use the settings in the *config-private.js* file, but will not deploy this file in Git repos

1. Request Twitter API Access
    * Set up an account for your bot at dev.twitter.com
    * Take the API key and token information generated for you and fill in consumer_key, consumer_secret, access_token, and access_token_secret

2. Request NASA API Key
    * Set up an account for your bot at api.nasa.gov
    * Take the API key information generated for you and fill in nasa_api_key

## Run Locally

Once all config variables have been set, type `node bot.js` to run the bot.  Keep in mind that out-of-the-box, the code runs indefinitely every 4 hours and does NOT tweet at time zero.  (This is to avoid spamming your followers every single time you restart the bot.)  If you want to tweet immediately, uncomment the second line of:
```
// post immediately
// bot();
```

in *bot.js*.

If the tweet is successful, you will see the message **Tweet was posted** in the terminal.

## Deploy to Heroku

TODO: Describe how to deploy to Heroku

## Credits

Projects that provided inspiration for happyspacebot:

http://www.zachwhalen.net/posts/how-to-make-a-twitter-bot-with-google-spreadsheets-version-04/

https://github.com/dariusk/examplebot

## License

MIT License

Copyright (c) 2016-2017 Donia Robinson

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.