var unirest = require('unirest');
var moment = require('moment');
/**
 * Object that holds almirante's functions and behaviours
 * @namespace
 */
var commands = {};

/**
 * Array to manage status queue
 * @param {Array} queue
 */
var queue = [];

/**
 * Array of admin users
 * @param {Array} admins
 */
var admins = ['cesar.hernandez','miguel.mora','edgar.garcia'];

/**
 * Variable holding timeout to kick users if they don't start updating
 * @param {Object} waitingTimeout
 */
var waitingTimeout;

/** 
 * Timeout in seconds to kick users when they're next in queue
 * @constant {number} 
 */
var TIMEOUT_SECONDS = 180;

/**
 * Parses urls in a string to an array.
 * @function
 * @name string2array
 * @param {string} urls - String with urls
 */
var string2array = function(urls){
  var url = urls.split("\n");
  for(var i=0;i< url.length;i++){
    //slack sends urls with < and > they should be removed
    url[i] = url[i].replace(/</g, '');
    url[i] = url[i].replace(/>/g, '');
  }
  return url;
};

/**
 * Starts timeout to kick users if they don't start their turn after 3 minutes when someone called /next
 * @function
 * @name startWaiting
 * @param {object} channel - Slack channel to send notification
 */
var startWaiting = function(channel){
  waitingTimeout = setTimeout(function(){
    if(queue.length>0){
        channel.send('@'+queue[0].user+' has been kicked after 3 minutes of inactivity.');
        queue.shift();
    }
  },TIMEOUT_SECONDS*1000);
};

/**
 * Ends waiting timeout when user calls /voy
 * @function
 * @name stopWaiting
 */
var stopWaiting = function(){
    clearTimeout(waitingTimeout);
};

/**
 * Parses urls to single links and send them every 500 ms, slack channel doesn't support more than 10 send calls without waiting.
 * @function
 * @name commands.lista
 * @memberof commands
 * @param {object} user - slack user
 * @param {object} channel - slack channel
 * @param {string} message - message sent to slackbot
 */
commands.lista = function(user,channel,message){
    var urls = string2array(message);
    if(urls.length<1){
        return;
    }
    var count=0;
    var interval = setInterval(function() {
        if(count< urls.length){
            channel.send(urls[count]);  
            count++;
        } else{
            clearInterval(interval);
        }
    }, 1500);
};

/**
 * Sends status queue every 500 ms, slack channel doesn't support more than 10 send calls without waiting.
 * @function
 * @name commands.queue
 * @memberof commands
 * @param {object} user - slack user
 * @param {object} channel - slack channel
 * @param {string} message - message sent to slackbot
 */
commands.queue = function(user,channel,message){
    if(queue.length<1){
        channel.send('Queue is empty');
        return;
    }
    var count=0;
    var interval = setInterval(function() {
        if(count< queue.length){
            channel.send(
                queue[count].user+'\n'+
                'Requested time:'+queue[count].reqeuested_at+'\n'+
                'Start time:'+queue[count].start_at
                );  
            count++;
        } else{
            clearInterval(interval);
        }
    }, 500);
};

/**
 * Request status turn.
 * @function
 * @name commands.ficha
 * @memberof commands
 * @param {object} user - slack user
 * @param {object} channel - slack channel
 * @param {string} message - message sent to slackbot
 */
commands.ficha = function(user,channel,message){
    if(queue.length<1){
        //if no one in the queue, assing turn immediately 
        queue.push({
            user: String(user.name),
            reqeuested_at: new Date(),
            start_at: new Date()
        });
        channel.send('Queue is empty you are free to update in the next 10 minutes, there\'s no need to call /voy');
    }else{
        //check if doesn't exist in queue already
        for (var i=0;i<queue.length;i++) {
            console.log(queue[i].user);
          if (queue[i].user === String(user.name)){
            channel.send(user.name+' is in the queue already, call /queue to view the queue');
            return;
          }
        }
        queue.push({
            user: user.name,
            reqeuested_at: new Date(),
            start_at: undefined
        });
        channel.send(user.name+' has been added to the queue');
    }
};

/**
 * Ends status turn
 * @function
 * @name commands.next
 * @memberof commands
 * @param {object} user - slack user
 * @param {object} channel - slack channel
 * @param {string} message - message sent to slackbot
 */
commands.next = function(user,channel,message){
    //return if queue is empty
    if(queue.length<1){
        channel.send('Queue is empty');
        return;
    }
    var queueUser = String(queue[0].user);
    if(queueUser === user.name){
        //user never called /voy
        if(!queue[0].start_at){
            channel.send('Please call /voy before calling /next');
            return;
        }
        //check if user took more than 10 minutes to update
        var now = new Date();
        var timeDiff = (now.getTime() - queue[0].start_at.getTime())/1000;
        if(timeDiff>600){
            channel.send('Thanks for the donuts '+queueUser+', time updating:'+timeDiff/60);
        }
        queue.shift();
        if(queue.length<1){
            channel.send('Thanks for updating, queue is empty');
        }else{
            queueUser = String(queue[0].user);
            channel.send('@'+queueUser+' is next in the queue and has 3 minutes to start updating.');   
            //start waiting 3 minutes for user to get its turn.
            startWaiting(channel);
        }
    }else{
        //someone else tried to update
        channel.send(queueUser+' is updating please wait.');
    }
};

/**
 * performs a pop action to the queue
 * @function
 * @name commands.kick
 * @memberof commands
 * @param {object} user - slack user
 * @param {object} channel - slack channel
 * @param {string} message - message sent to slackbot
 */
commands.kick = function(user,channel,message){
    //only admin users should perform this action
    if(admins.indexOf(String(user.name)) !== -1){
        var queueUser = String(queue[0].user);
        channel.send(queueUser+' has been removed for inactivity');
        queue.shift();
        if(queue.length<1){
            channel.send('Queue is empty');
        }else{
            queueUser = String(queue[0].user);
            channel.send(queueUser+' is next in the queue');    
        }
    }else{
        channel.send('You are not authorized to perform this action');
    }
};

/**
 * Starts status turn
 * @function
 * @name commands.voy
 * @memberof commands
 * @param {object} user - slack user
 * @param {object} channel - slack channel
 * @param {string} message - message sent to slackbot
 */
commands.voy = function(user,channel,message){
    //return if queue is empty
    if(queue.length<1){
        channel.send('Queue is empty');
        return;
    }
    var queueUser = String(queue[0].user);
    if(queueUser === user.name){
        if(queue[0].start_at){
            channel.send('You requested a turn already, your time started at:'+queue[0].start_at);  
            return;
        }
        stopWaiting();
        channel.send('You have 10 minutes to update');
        queue[0].start_at = new Date();
    }else{
        channel.send(queueUser+' is updating');
    }
};

/**
 * Sends parking slots from unojaq
 * @function
 * @name commands.parking
 * @memberof commands
 * @param {object} user - slack user
 * @param {object} channel - slack channel
 * @param {string} message - message sent to slackbot
 */
commands.parking = function(user,channel,message){
    var today = moment().utc().add(-6,'hours');
    today = today.add(1,'day');
    var month = today.format('MM');
    var day   = today.format('DD');
    var year  = today.format('YYYY');
    var fromDate = moment(year+"-"+month+"-"+day+"T00:01:00").utc().toISOString();
    var nextDay = today.add(1,'day');
    month = today.format('MM');
    day   = today.format('DD');
    year  = today.format('YYYY');
    var toDate = moment(year+"-"+month+"-"+day+"T00:01:00").utc().toISOString();
    var url = 'https://api.parse.com/1/classes/Events?include=user&order=startsAt&where={"startsAt":{"$gte":{"__type":"Date","iso":"'+fromDate+'"}},"endsAt":{"$lte":{"__type":"Date","iso":"'+toDate+'"}}}';
    console.log(url);
    unirest.get(url)
    .headers({
        'X-Parse-Application-Id': 'HMgEYiz7FYsYo4yymyJzcjkIzBuxo5SZDfKKBAoJ',
        'X-Parse-REST-API-Key': 'N9aoa2aWcwYWmNjKNc0DuTHALh28YHzVf2C8S4QW',
        'Content-Type':'application/json'
    })
    .end(function(response){
        console.log('Success call and getting values');
        var results = response.body.results;
        console.log(results);
        for(var i=0;i<results.length;i++){
            //filter results for today only

            var currentUser = results[i].user;
            var name = currentUser.first_name+' '+currentUser.last_name;
            console.log('USer'+name);
            channel.send(name);
        }
    });
};

/**
 * Commands module
 * @module commands
 */
module.exports = commands;
