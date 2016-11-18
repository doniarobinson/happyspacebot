var request = require('superagent');
var Twit = require('twit');
var emoji = require('node-emoji');
var image_downloader = require('image-downloader');

var config = require('./config.js');

var T = new Twit(config);

function tweetPhoto() {

  var imgurl = "https://api.nasa.gov/planetary/apod?api_key=" + config.nasa_api_key;
  // date  YYYY-MM-DD  today The date of the APOD image to retrieve

  request
    .get(imgurl)
    .end(function(ajaxerror0, ajaxresult0) {
      if (ajaxresult0) {
        let imagelocation = ajaxresult0.body.url;


        // Download to a directory and save with the original filename 
        var options = {
          url: imagelocation,
          dest: 'downloads',
          done: function(err, filename, image) {
            if (err) {
              throw err;
            }
            // console.log('File saved to', filename);

            var filePath = filename;
            T.postMediaChunked({
              file_path: filePath
            }, function(err, data, response) {

              let copyrighttext = "";
              if (ajaxresult0.body.copyright !== "") {
                copyrighttext = ajaxresult0.body.copyright;
              } else {
                copyrighttext = "Public Domain";
              }

              var quoteurl = "http://api.forismatic.com/api/1.0/?method=getQuote&format=json&lang=en"

              request
                .get(quoteurl)
                .end(function(ajaxerror, ajaxresult) {
                  if (ajaxresult) {
                    let tweettext = ajaxresult.body.quoteText + " -" + ajaxresult.body.quoteAuthor + "\nImage Credits: " + copyrighttext;

                    let idstring = data.media_id_string;
                    let params = {
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

tweetPhoto();