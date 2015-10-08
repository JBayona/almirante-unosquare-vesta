var express = require('express');
var cluster = require('cluster');
var Slack = require('slack-client');
var unirest = require('unirest');
var moment = require('moment');
var commands = require('./almirante.js');

//configure cluster to restart on exit
if (cluster.isMaster) {
  cluster.fork();

  cluster.on('exit', function(worker, code, signal) {
    cluster.fork();
  });
}

//configure slack actions in cluster 
if (cluster.isWorker) {
  var app = express();

	app.set('port', (process.env.PORT || 5000));

	app.use(express.static(__dirname + '/public'));

	// views is directory for all template files
	app.set('views', __dirname + '/views');
	app.set('view engine', 'ejs');

	app.get('/', function(request, response) {
	  response.render('pages/index');
	});

	app.listen(app.get('port'), function() {
	  console.log('Node app is running on port', app.get('port'));
	});

	 
	var token = 'xoxb-11553187460-5btAgwM0Slpl5Nx1CARHUQII';
	var slack = new Slack(token, true, true);
	

	slack.on('open', function () {
    var channels = Object.keys(slack.channels)
        .map(function (k) { return slack.channels[k]; })
        .filter(function (c) { return c.is_member; })
        .map(function (c) { return c.name; });
 
    var groups = Object.keys(slack.groups)
        .map(function (k) { return slack.groups[k]; })
        .filter(function (g) { return g.is_open && !g.is_archived; })
        .map(function (g) { return g.name; });
 
    console.log('Welcome to Slack. You are ' + slack.self.name + ' of ' + slack.team.name);
 
    if (channels.length > 0) {
        console.log('You are in: ' + channels.join(', '));
    }
    else {
        console.log('You are not in any channels.');
    }
 
    if (groups.length > 0) {
       console.log('As well as: ' + groups.join(', '));
    }
	});

	var makeMention = function(userId) {
	  return '<@' + userId + '>';
	};

	var isDirect = function(userId, messageText) {
    var userTag = makeMention(userId);
    return messageText &&
           messageText.length >= userTag.length &&
           messageText.substr(0, userTag.length) === userTag;
	};

	slack.on('message', function(message) {
    var channel = slack.getChannelGroupOrDMByID(message.channel);
    var user = slack.getUserByID(message.user);

    if (message.type === 'message' && isDirect(slack.self.id, message.text)) {
      var msgtext = String(message.text);
      msgtext = msgtext.substring(14,msgtext.length);     
      msgtext = msgtext.trim();
	    if (msgtext.indexOf("/") != 0){
	    	channel.send('Please enter a valid command, type ##queue to get the full list of available commands')
	    	console.log('not a command');
	    	return false;
	    }
	    var endPos = msgtext.indexOf(" ") !== -1 ? msgtext.indexOf(" ") : msgtext.length;
	    var command = msgtext.substring(1, endPos);
	    if (commands[command] == null){
	    	console.log('not a valid command');
	    	channel.send('Please enter a valid command, type ##queue to get the full list of available commands')
	    	return false;
	    }
	    var messageBody = msgtext.indexOf(" ") !== -1 ? msgtext.substring(msgtext.indexOf(" ")+1,msgtext.length) : '';
	    console.log(command);
	    commands[command](user,channel,messageBody);
    }
	});
	 
	slack.login();

}