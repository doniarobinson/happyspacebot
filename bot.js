// on Heroku, use environment variables; if on localhost, use config-private file that does not get deployed
var configfile = (process.env.consumer_key === undefined) ? './config-private.js' : './config.js';
var config = require(configfile);

var image_downloader = require('image-downloader');
var request = require('superagent');
var Twit = require('twit');

var T = new Twit(config);

var copyrighttext = "";


/**
 * Calculates a random date between today and the date passed in
 * @method getRandomDateString
 * @param {number} year
 * @param {number} month
 * @param {number} day
 * @return {String} portion of the date that contains YYYY-MM-DD
 */
function getRandomDateString(year, month, day) {
  var todaysdate = new Date();
  var earliestdate = new Date(year, month, day);

  const millisecondsinday = 24 * 60 * 60 * 1000;

  var todayseconds = todaysdate.getTime();
  var earliestseconds = earliestdate.getTime();

  var elapseddays = (todayseconds - earliestseconds) / millisecondsinday;

  // now randomly pick a number between 1 and elapseddays
  var randomnum = Math.floor((Math.random() * elapseddays) + 1);
  var randomseconds = earliestseconds + (randomnum * millisecondsinday);
  var randomdate = new Date(randomseconds);

  var datestringarray = randomdate.toISOString().split('T');

  return datestringarray[0];
}


/**
 * Generates a random date, within the known dates of the available photos on NASA's API, and requests the photo from that data
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
          if (nasaresult.body.copyright !== undefined) {
            copyrighttext = nasaresult.body.copyright;
          } else {
            copyrighttext = "Public Domain";
          }

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
      url: photoinfo.url,
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


/**
 * Requests a quote from the Forismatic quotes API, then attempts to tweet it and the photo
 * @method tweetMessage
 * @param {string} filename 
 */
function tweetMessage(filename) {

    T.postMediaChunked({
      file_path: filename
    }, function(err, data, response) {

      var quoteurl = "http://api.forismatic.com/api/1.0/?method=getQuote&format=json&lang=en";

      request
        .get(quoteurl)
        .end(function(ajaxerror, ajaxresult) {

          if (ajaxresult.error === false) {
            var tweettext = ajaxresult.body.quoteText + " -" + ajaxresult.body.quoteAuthor + "\nImage Credits: " + copyrighttext;

            var idstring = data.media_id_string;
            var params = {
              status: tweettext,
              media_ids: [idstring]
            };

// TODO: if the string is longer than 140 characters, put the text directly onto the image using Cloudinary
            T.post('statuses/update', params, function(twittererror, tweet, twitterresponse) {
              if (twitterresponse) {
                console.log('Tweet was posted');
              }
              if (twittererror) {
                console.log('Twitter returned this error: ', twittererror);
              }
            });
//            resolve(ajaxresult);
          } /*else {
            reject(ajaxresult.error);
          }*/
        });
    });
}


/**
 * Main function to try getting a photo URL from NASA, try downloading that photo, and try tweeting a message
 * @method bot
 */
function bot() {

  getPhotoInfoFromNasa().then(function(photoinfo) {
    downloadPhoto(photoinfo).then(function(filename) {
      tweetMessage(filename);
    }).catch(function(error) {
      console.log('downloadPhoto() error: ', error.message);
    });
  }).catch(function(error) {
    console.log('getPhotoFromNasa() error: ', error.message);
  });
}

// post immediately
//bot();

// post every 8 hours
setInterval(function() {
  try {
    bot();
  }
  catch (e) {
    console.log(e);
  }
}, 8*60*60*1000);