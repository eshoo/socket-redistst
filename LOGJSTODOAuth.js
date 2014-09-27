// ********************************************************************************************************
// * LOG W\Authentication + Authorization for privates                                                    *
// ********************************************************************************************************
var config = require('./config');
var Okapi = require('okapi');
var db = require('./db');
var async=require('async');
var Log={};
var redis_psub;
var redis=require("redis");
var channelname="*"; //this is the redis subscribe_to channel name, will likely be passed into here in the future.
var socketeventname="fromserver"; //this is the name associated with the socket client msg handler
var passportSocketIo = require("passport.socketio");
var dbgkey = "debugLogJs";

Log.initialize=function(app){
  
  var rt=function (uname,channel,onComplete) {
   db.sqlQuery("select username,repo from repo where private=0 union all select username, repo from repo where private=1 and username=?username? and 'builds-' + username +'/'+repo+'/' order by 1, 2"
       ,{"username": uname, "channel": channel}
       , onComplete);
   }


  var routeList ={};
  function getRoutes(uname) {
    if (Log.routeList && Log.routeList.refreshdate && Log.routeList.routes) {
       var currEpoch=new Date().getTime()-new Date().getMilliseconds()/1000;
       var listAge=currEpoch-Log.routeList.refreshdate;
       if (listAge>=(5*60)*1000) { //if older that 5 minutes;
         return Log.setRoutes(uname);
       } else {
         return Log.routeList.routes;
       }

    // check privatelist.refreshtime - if older than a reasonable age, then refreshlist
    } else {
      //No previous list
      //CreateOne\Update privatelist here
      return Log.setRoutes(uname);
    }
  
  }
  function setRoutes(uname) {
   return Log.dbFetchRoutes(uname,function(err,res) {
      if (!err) {
        Log.routeList.routes=res;
        Log.routeList.refreshdate=new Date().getTime()-new Date().getMilliseconds()/1000;
      } else {
        console.log("ERR in setRoutes:" + err);
      }
      return Log.routeList;
    });
  }
  Log.socketio = require('socket.io').listen(app.server);
Log.routeList=routeList;
Log.getRoutes=getRoutes;
Log.setRoutes=setRoutes;
Log.dbFetchRoutes=rt;
 var redislog =function (k,v) { //k  key redis db key logs will be stored temporarily
                               //v  value - string redist set - this should be valid json pls
  //    redis.createClient().rpush(k,JSON.stringify(v));
      showMessage(k + ":" + v.toString());
  };
  
  Log.rlog=redislog;
  Log.socketio.use(passportSocketIo.authorize({
    cookieParser: app.cookieParser,
    key:  'connect.sid',
    secret: app.sessionSecret,
    store: app.sessionStore,
    success: onAuthSuccess,
    fail: onAuthFail,
    }));
  //implement onAuthSuccess and onAuthFail
  function onAuthSuccess(data,accept) {
    Log.rlog(dbgkey, {"AuthResult": {"status": "SUCCESS", "userinfo": data.user }}) ;
    //accept();
    onAuthCompleted(data,accept); 
  }
  function onAuthFail(data, message, error, accept) {
    // Only ever need to fail if repo.private and vUserName!-repo.usernaem, this probably doesn't matter a whole at this point, 
    // All is really needed is to set the username of the socket owner to the username or "*anonymous*"
     

    // Deny client if there is an error, otherwise goAhead and accept it.
     if(error) return cb(new Error(message));
     //accept();
     
     Log.rlog(dbgkey, {"AuthResult": {"status": "FAIL", "data": data }});
      
     onAuthCompleted(data,accept);
  }
 
  function showMessage(message) {

    console.log("--------------------------------AUTH-DATA---------------------------------------------------------");  
    console.log(message);
    console.log("----------------------------END-AUTH-DATA---------------------------------------------------------");  
  
  }
  Log.showMessage=showMessage;
  function onAuthCompleted(data,cb) {
   
    showMessage("log auth Result\nAuth Data:\n" + JSON.stringify(data.user));
    cb();
  }
  Log.sessionStore=app.sessionStore;
  Log.socketio.sockets.on('connection', function (socket) {
      var uname="*anonymous*";
      var UserObj={};
      if (socket.request.user) {
        UserObj.user=socket.request.user;
      } else {
        UserObj.user.username="*anonymous*";
      }
      Log.setRoutes(UserObj.user.username);

      redis_psub = redis.createClient();
      redis_psub.psubscribe(channelname);
      
      redis_psub.on("pmessage",function(pattern,channel,message) {
        // get the possible channel portions of the channel together:
        var arChanInfo=channel.replace("builds-","").split("/");
       // check channel for being blocked.
                 
        //message situations :
        //message is to /username/
        //  Listenting for repos here, make sure that either !repo.private or ! repo.private socket.request.user.username=arChanInfo[0]
        
        //message is to /username/reponame/
        //message is to /username/reponame/buildid

       // console.log("PMESSAGE for channel:" + channel + " msg: " + JSON.stringify(message));
        var myRoutes=Log.getRoutes(UserObj.user.username).routes;
      /*  var isValid=myRoutes.routes.filter(function (val,index,myRoutes.routes) {
          if
        }).length>0;
        */
        Log.showMessage("HERE IN PMESSAGE!!!!");
        Log.showMessage("ROUTES:" + myRoutes.toString());
        Log.rlog(dbgkey,{"pmessage": {"channel": channel , "message": message}});
        socket.emit(channel, message ); 
      });
      
      redis_psub.on("error", function (err) {
        Log.rlog(dbgkey,{"redis_psubOnError": {"err": err}});
        console.log("Error " + err);
      });
      
      socket.on('disconnect',function() {
        console.log("Client disconnected");
        redis_psub.punsubscribe(channelname);
        redis_psub.end();
      });
  });
}

module.exports=Log;
