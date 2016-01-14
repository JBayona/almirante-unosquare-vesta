var unirest = require('unirest');
var moment = require('moment');

var date = moment().add('days',1);
var month = date.format('MM');
var day   = date.format('DD');
var year  = date.format('YYYY');
var fromDate = moment(year+"-"+month+"-"+day+"T00:00:00").utc().toISOString();
var toDate = moment(year+"-"+month+"-"+day+"T23:59:00").utc().toISOString();
console.log(fromDate);
console.log(toDate);
var url = 'https://api.parse.com/1/classes/Events?include=user&order=startsAt&where={"startsAt":{"$gte":{"__type":"Date","iso":"'+fromDate+'"}},"endsAt":{"$lte":{"__type":"Date","iso":"'+toDate+'"}}}';
unirest.get(url)
.headers({
	'X-Parse-Application-Id': 'HMgEYiz7FYsYo4yymyJzcjkIzBuxo5SZDfKKBAoJ',
	'X-Parse-REST-API-Key': 'N9aoa2aWcwYWmNjKNc0DuTHALh28YHzVf2C8S4QW',
	'Content-Type':'application/json'
})
.end(function(response){
	var results = response.body.results;
	for(var i=0;i<results.length;i++){
		//filter results for today only
		var currentUser = results[i].user;
		var name = currentUser.first_name+' '+currentUser.last_name;
		console.log(name);
	}
});