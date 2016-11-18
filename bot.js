var request = require('superagent');
var Twit = require('twit');
var cloudinary = require('cloudinary');

var config = require('./config.js');

var T = new Twit(config);

function tweetPhoto() {

  // date  YYYY-MM-DD  The date of the APOD image to retrieve; defaults to today
  // APOD has images back to 1995, but higher quality images are more recent
  // generate random date between now and 2005

  var todaysdate = new Date();
  var earliestdate = new Date(2005, 0, 1);

  const millisecondsinday = 24*60*60*1000;

  var todayseconds = todaysdate.getTime();
  var earliestseconds = earliestdate.getTime();
 
  var elapseddays = (todayseconds - earliestseconds)/millisecondsinday;

  // now randomly pick a number between 1 and elapseddays
  var randomday = Math.floor((Math.random() * elapseddays) + 1);
  var randomseconds = earliestseconds + (randomday*millisecondsinday);
  var randomdate = new Date(randomseconds);

  var datestringarray = randomdate.toISOString().split('T');
  var shortrandomdate = datestringarray[0];

  var imgurl = "https://api.nasa.gov/planetary/apod?api_key=" + config.nasa_api_key + "&date=" + shortrandomdate;
  //console.log(imgurl);

  request
    .get(imgurl)
    .end(function(ajaxerror0, ajaxresult0) {
      if (ajaxresult0) {
        var imagelocation = ajaxresult0.body.url;
     console.log(imagelocation);     
          cloudinary.uploader.upload(imagelocation, function(result) { 
            console.log(imagelocation); 
          });

            var filePath = filename;
            T.postMediaChunked({
              file_path: filePath
            }, function(err, data, response) {

              var copyrighttext = "";
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
                    var tweettext = ajaxresult.body.quoteText + " -" + ajaxresult.body.quoteAuthor;// + "\nImage Credits: " + copyrighttext;
                    //check to see if full tweet text is going to be over 140 characters

                    //var idstring = data.media_id_string;
                    var params = {
                      status: tweettext,
                      //media_ids: [idstring]
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

      } else {
        console.log("There was an Ajax photo error.");
      }
    });
}

tweetPhoto();

/*setInterval(function() {
  try {
    tweetPhoto();
  }
  catch (e) {
    console.log(e);
  }
}, 60000*60);*/