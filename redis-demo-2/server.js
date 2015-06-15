var app = require('express')(),
    http = require('http').Server(app),
    redis = require("redis"),
    redisClient = redis.createClient(),
    io = require('socket.io')(http);

http.listen(3000, function(){
  console.log('listening on *:3000');
});

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket){

  redisClient.subscribe("nuevo usuario");
    
  redisClient.on("message", function(channel, message){
    io.emit("nuevo usuario", message);
  });

});