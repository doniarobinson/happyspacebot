// on Heroku, use environment variables; if on localhost, use config-private file that does not get deployed
var configfile = (process.env.consumer_key === undefined) ? './config-private.js' : './config.js';
var config = require(configfile);

var image_downloader = require('image-downloader');
var request = require('superagent');
var Twit = require('twit');

var T = new Twit(config);

/**
* Calculates a random date between today and the date passed in
* @method getRandomDateString
* @param {number} year
* @param {number} month
* @param {number} day
* @param {requestCallback} callback - The callback that handles the response.
* @return {String} some bool
*/

function getRandomDateString(year, month, day) {
  var todaysdate = new Date();
  var earliestdate = new Date(year, month, day);

  const millisecondsinday = 24*60*60*1000;

  var todayseconds = todaysdate.getTime();
  var earliestseconds = earliestdate.getTime();
 
  var elapseddays = (todayseconds - earliestseconds)/millisecondsinday;

  // now randomly pick a number between 1 and elapseddays
  var randomnum = Math.floor((Math.random() * elapseddays) + 1);
  var randomseconds = earliestseconds + (randomnum*millisecondsinday);
  var randomdate = new Date(randomseconds);

  var datestringarray = randomdate.toISOString().split('T');
  
  return datestringarray[0];

}


function tweetPhoto() {

  // date  YYYY-MM-DD  The date of the APOD image to retrieve; defaults to today
  // APOD has images back to 1995, but higher quality images are more recent
  // generate random date between now and 2005

  // month is 0 indexed
  var shortrandomdate = getRandomDateString(2005, 0, 1);

  var imgurl = "https://api.nasa.gov/planetary/apod?api_key=" + config.nasa_api_key + "&date=" + shortrandomdate;

  request
    .get(imgurl)
    .end(function(ajaxerror0, ajaxresult0) {
      if (ajaxresult0) {
        var copyrighttext = (ajaxresult0.body.copyright !== undefined) ? ajaxresult0.body.copyright : "Public Domain";

        // Download to a directory and save with the original filename 
        var options = {
          url: ajaxresult0.body.url,
          dest: 'tmp',
          done: function(err, filename, image) {
            if (err) {
              throw err;
            }
            // console.log('File saved to', filename);

            var filePath = filename;
            T.postMediaChunked({
              file_path: filePath
            }, function(err, data, response) {

              var quoteurl = "http://api.forismatic.com/api/1.0/?method=getQuote&format=json&lang=en"

              request
                .get(quoteurl)
                .end(function(ajaxerror, ajaxresult) {
                  if (ajaxresult) {
                    var tweettext = ajaxresult.body.quoteText + " -" + ajaxresult.body.quoteAuthor + "\nImage Credits: " + copyrighttext;
                    //check to see if full tweet text is going to be over 140 characters

console.log(tweettext.length);

if (tweettext.length > 140) {

}

console.log(tweettext);



                    var idstring = data.media_id_string;
                    var params = {
                      status: tweettext,
                      media_ids: [idstring]
                    };

                    T.post('statuses/update', params, function(twittererror, tweet, twitterresponse) {
                      if (twitterresponse) {
                        console.log('Tweet was posted');
                      }
                      if (twittererror) {
                        console.log('Twitter returned this error: ', twittererror);
                      }
                    });
                  } else {
                    console.log("There was an Ajax quote error.");
                  }
                });
            })
          }
        };
        image_downloader(options);
      } else {
        console.log("There was an Ajax photo error.");
      }
    });
}

//tweetPhoto();

// post every 8 hours
setInterval(function() {
  try {
    tweetPhoto();
  }
  catch (e) {
    console.log(e);
  }
}, 8*60*60*1000);