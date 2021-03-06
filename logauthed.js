var Log={};
var redis_psub;
var redis_pub;
var redis=require("redis");
var channelname="*"; //this is the redis subscribe_to channel name, will likely be passed into here in the future.
var socketeventname="fromserver"; //this is the name associated with the socket client msg handler
var socketio=require('socket.io');

var s=require('split');

var offset=0;
var Readable = require('stream').Readable;
var rs = Readable();

var sys=require('sys');
var exec=require('child_process').exec;
var child;

//ttyrec related
var ttyrec = require('ttyrec');
var fs = require('fs');

var fname="ttyrecord" //"ttytest.rec";
// control playbackspeed - playback time=recordedseconds/pbsAdjust
var pbsAdjust=1; 

Log.initialize=function(app){
  Log.socketio = socketio.listen(app.server);

  Log.socketio.sockets.on('connection', function (socket) {
     redis_psub = redis.createClient(); 
     redis_pub = redis.createClient();
     redis_psub.psubscribe(channelname);

      redis_psub.on('pmessage', function(pattern,channel,message) {
        console.log("Sending Results:" + JSON.stringify(message) + " - from server to client");
        socket.emit(channel, "FromRedisLog: " + JSON.stringify( message) );
      });

      redis_psub.on("error", function (err) {
        console.log("Error " + err);
      });

      socket.on('fromclient', function(data) {
        // body...
        redis_pub.publish(channelname,data);
      });
      
      socket.on('ttyplay',function(data) {
          var ttyplayStream = new ttyrec.PlayStream();
          var ansi_up=require('ansi_up');
          var fileStream = fs.createReadStream(fname,
          {'flags': 'r','encoding': null, 'fd': null, 'mode': 0666,'autoClose': true});
          ttyplayStream.setSpeed(pbsAdjust);
          fileStream.pipe(ttyplayStream);

          ttyplayStream.pipe(s())
            .on('data',
            function(line) {
              //console.log("ttyplayback: " + line);
              socket.emit("fromserver",ansi_up.ansi_to_html(line));

            });
      });

      socket.on('disconnect',function() {
        console.log("Client disconnected");
        redis_psub.punsubscribe(channelname);
        redis_psub.end();
        redis_pub.end();
      });
    });
}


module.exports=Log;
