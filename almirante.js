var commands = {};

var queue = [];
var string2array = function(urls){
  var url = urls.split("\n");
  for(var i=0;i< url.length;i++){
  	url[i] = url[i].replace(/\</g, '');
  	url[i] = url[i].replace(/\>/g, '');
  }
  return url;
}

commands['lista'] = function(user,channel,message){
	var urls = string2array(message);
	if(urls.length<1){
		return;
	}
	var count=0;
	var interval = setInterval(function() {
		if(count< urls.length){
			channel.send(urls[count]);	
			count++
		} else{
			clearInterval(interval);
		}
	}, 500);
};

commands['queue'] = function(user,channel,message){
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
			count++
		} else{
			clearInterval(interval);
		}
	}, 500);
};

commands['ficha'] = function(user,channel,message){
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

commands['next'] = function(user,channel,message){
	if(queue.length<1){
		channel.send('Queue is empty');
		return;
	}
	var queueUser = String(queue[0].user);
	if(queueUser === user.name){
		//TODO: check here for more than 10 minutes
		var now = new Date();
		var timeDiff = (now.getTime() - queue[0].start_at.getTime())/1000;
		console.log(timeDiff);
		if(timeDiff>600){
			channel.send('Thanks for the donuts '+queueUser+', time updating:'+timeDiff/60);
		}
		queue.shift();
		if(queue.length<1){
			channel.send('Queue is empty');
		}else{
			queueUser = String(queue[0].user);
			channel.send(queueUser+' is next in the queue');	
		}
	}else{
		channel.send(queueUser+' is updating please wait.');
	}
};

commands['voy'] = function(user,channel,message){
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
		channel.send('You have 10 minutes to update');
		queue[0].start_at = new Date();
	}else{
		channel.send(queueUser+' is updating');
	}
};

commands['parking'] = function(user,channel,message){
	var url = 'https://api.parse.com/1/classes/Events?include=user&order=startsAt&where={\"endsAt\":{\"$gte\":{\"__type\":\"Date\",\"iso\":\"'+moment().toISOString()+'\"}}}';
	unirest.get(url)
	.headers({
		'X-Parse-Application-Id': 'HMgEYiz7FYsYo4yymyJzcjkIzBuxo5SZDfKKBAoJ',
		'X-Parse-REST-API-Key': 'N9aoa2aWcwYWmNjKNc0DuTHALh28YHzVf2C8S4QW',
	  'Content-Type':'application/json'
	})
	.end(function(response){
		for(var i=0;i<response.body.results.length;i++){
			if(moment(response.body.results[i].startsAt.iso).isBefore(moment())){
				var name = response.body.results[i].user.first_name +' '+response.body.results[i].user.last_name; 
				channel.send(name);
			}
		}
	})
}

//export commands
module.exports = commands;
