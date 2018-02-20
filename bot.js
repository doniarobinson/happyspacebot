// on Heroku, use environment variables; if on localhost, use config-private file that does not get deployed
var configfile = (process.env.consumer_key === undefined) ? './config-private.js' : './config.js';
var config = require(configfile);

var database = require("./database.json");

var image_downloader = require('image-downloader');
var request = require('superagent');

var Twit = require('twit');
var T = new Twit(config);

var cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: config.cloud_name,
  api_key: config.api_key,
  api_secret: config.api_secret
});

/**
 * Calculates a random date between today and the date passed in
 * @method getRandomDateString
 * @param {number} year
 * @param {number} month
 * @param {number} day
 * @return {String} portion of the date that contains YYYY-MM-DD
 */
function getRandomDateString(year, month, day) {

  const millisecondsinday = 24 * 60 * 60 * 1000;

  var earliestseconds = new Date(year, month, day).getTime();
  var todayseconds = Date.now();

  var elapseddays = (todayseconds - earliestseconds) / millisecondsinday;

  // now randomly pick a number between 1 and elapseddays
  var randomnum = Math.floor((Math.random() * elapseddays) + 1);
  var randomseconds = earliestseconds + (randomnum * millisecondsinday);
  var randomdate = new Date(randomseconds);

  var datestringarray = randomdate.toISOString().split('T');

  return datestringarray[0];
}

/**
 * Requests a photo from NASA's API
 * @method getPhotoInfoFromNasa
 */
var getPhotoInfoFromNasa = function() {
  return new Promise(function(resolve, reject) {
    // date  YYYY-MM-DD  The date of the APOD image to retrieve; defaults to today
    // APOD has images back to 1995, but higher quality images are more recent
    // generate random date between now and 2005

    // month is 0 indexed
    var shortrandomdate = getRandomDateString(2005, 0, 1);
    var imgurl = "https://api.nasa.gov/planetary/apod?api_key=" + config.nasa_api_key + "&date=" + shortrandomdate;

    request
      .get(imgurl)
      .end(function(nasaerror, nasaresult) {
        // if result of http request to NASA returns no error
        if (nasaresult.error === false) {
          resolve(nasaresult.body);
        } else {
          reject(nasaresult.error);
        }
      });
  })
}

/**
 * Downloads the photo to the server
 * @method downloadPhoto
 * @param {} photoinfo
 */
var downloadPhoto = function(photoinfo) {
  return new Promise(function(resolve, reject) {

    // Set options for image_downloader
    var options = {
      url: photoinfo,
      dest: 'tmp',
      done: function(err, filename, image) {
        if (err) {
          reject(err);
        } else {
          resolve(filename);
        }
      }
    };

    image_downloader(options);
  });
}

var getQuote = function(quoteinfo) {
  return new Promise(function(resolve, reject) {

    var currentTime = new Date().getHours();

    // tweet quotes from women between midnight and 8am
    if (currentTime < 8) {
      var randomindex = Math.floor((Math.random() * database.length));
      var quoteresult = database[randomindex];

      if (quoteresult) {
        resolve(quoteresult);
      } else {
        reject(Error('Could not retrieve quote from JSON file'));
      }
    } else {
      var quoteurl = "http://api.forismatic.com/api/1.0/?method=getQuote&format=json&lang=en";

      /*known issue - I'm guessing API must send back json response using single quotes in structure; thus, single quotes inside of the response text, like this:
      
      Don't worry when you are not recognized, but strive to be worthy of recognition.

      cause a json error. I may look for a different quote API at some point.
      */
      request
        .get(quoteurl)
        .end(function(quoteerror, quoteresult) {
          if (quoteresult) {
            resolve(quoteresult.body);
          } else {
            reject(quoteerror);
          }
        });
    }
  });
}

function tweetMessage(filename, tweettext) {

  T.postMediaChunked({
    file_path: filename
  }, function(err, data, response) {

    var idstring = data.media_id_string;
    var params = {
      status: tweettext,
      media_ids: [idstring]
    };

    T.post('statuses/update', params, function(twittererror, tweet, twitterresponse) {
      if (twitterresponse) {
        if (twittererror) {
          console.log('Twitter returned this error: ', twittererror);
        } else {
          console.log('Tweet was posted');
        }
      }
    });
  });
}

/**
 * Main function to try getting a quote, getting a photo URL from NASA, downloading that photo, and tweeting a message, gracefully handling errors when possible
 * @method bot
 */
function bot() {

  // try getting a quote
  return getQuote().then(function(quoteinfo) {

    //try getting a photo URL
    return getPhotoInfoFromNasa().then(function(photoinfo) {

      var quoteandattrib = quoteinfo.quoteText + "\n-" + quoteinfo.quoteAuthor + "\n@happyspacebot\n";

      var updatedcopyright = (typeof photoinfo.copyright == 'undefined') ? "Public Domain" : photoinfo.copyright;

      var imgcredittext = "Image Credits: " + updatedcopyright;

      var potentialfulltweet = quoteandattrib + imgcredittext;

      // send the image to Cloudinary, put the text directly onto the image, download it to the server, and that is the photo we'll tweet
      console.log("Tweet: " + potentialfulltweet + "\n" + photoinfo.url);

      //var textoption0 = "text:Merriweather_40_stroke:" + quoteandattrib;
      var textoption0 = "text:Overlock_50_stroke:" + quoteandattrib;

      /* the standard comma interferes with Cloudinary's code, so it needs to be replaced in the quote text with %252C -- https://support.cloudinary.com/hc/en-us/community/posts/200788162-Using-special-characters-in-Text-overlaying-
       */

      var textoption1 = textoption0.replace(/,/g, '%252C');
      var textoption = textoption1.replace(/—/g, '-');


      var eager_options = {
        width: 600,
        gravity: 'south_east',
        x: 8,
        y: 8,
        color: 'white',
        overlay: textoption,
        flags: 'no_overflow',
        crop: 'fit',
        border: '4px_solid_rgb:333333'
      };

      cloudinary.uploader
        .upload(photoinfo.url, { tags: "NASA", eager: eager_options })
        .then(function(result) {

          return downloadPhoto(result.eager[0].url).then(function(filename) {
            tweetMessage(filename, imgcredittext);
          }).catch(function(error) {
            console.log('More than 140 char - downloadPhoto() error: ', error.message);
          });
        }).catch(function(error) {
          console.log('cloudinary error: ', error.message);
        });

    }).catch(function(getphotoerror) {
      console.log('getPhotoInfoFromNasa() error: ', getphotoerror.message);
    });

  }).catch(function(quoteerror) {
    console.log('getQuote() error: ', quoteerror.message);
  });
}

function main() {
  try {
    bot();
  } catch (e) {
    console.log(e);
  }
}

// post immediately

main();

// then post every 8 hours
setInterval(function() {
  main();
}, 8 * 60 * 60 * 1000);