#!/usr/bin/env node
s=require('./split.js');
var offset=0;
var Readable = require('stream').Readable;
var rs = Readable();

//system process related.

var sys=require('sys');
var exec=require('child_process').exec;
var child;

//ttyrec related
var ttyrec = require('ttyrec');
var fs = require('fs');
var ttyplayStream = new ttyrec.PlayStream();

// ttyrecording - filename of ttyrec recording on disk.
var fname="ttyrecord" //"ttytest.rec";

//playbackSpeedAdjustment - default is 1 for realtime.
var pbsAdjust=1; // pbsAdjust adjusts the playback time based on the recording len
	       // if the value supplied is>1 then the playback time is faster.
	       // if  <1 and >0 then playback is slower.
	       // if 1 then playback runs at the same speed as was recorded.
	       // <=0 is invalid.
	       // Roughly:
	       // playback time = actual_recorded_seconds/pbsAdjust
	  

// process output
function puts(err, stdout, stderr) {
	sys.puts(stdout);
}

function puts2(err, stdout, stderr) {
	ttyPlayStream(pbsAdjust,stdout);
}

function ttyPlayFile(pba,fn) {
	// set the playback speed.
	var fileStream = fs.createReadStream(fn);
	ttyplayStream.setSpeed(pba);
	fileStream.pipe(ttyplayStream);
	ttyplayStream.pipe(process.stdout);
}
function ttyPlayStream(pba,str) {
	
	ttyplayStream.setSpeed(pba);
	str.pipe(ttyplayStream);
	ttyplayStream.pipe(process.stdout);
}

function shExec(cmd) {
	var tmpcmd="ttyrec -e '" + cmd + " && exit' 2>&1 "; 
// ttytest3.shexec && cat ttytest3.shexec";
 
	exec(tmpcmd, puts);
}
/*
	shExec("echo Hello There!");
	shExec("ls -la && ps -aef");
*/
function testTTY(fn,pba) {

var fileStream = fs.createReadStream(fn);
ttyplayStream.setSpeed(pba);
fileStream.pipe(ttyplayStream);

ttyplayStream.pipe(s())
	.on('data',
	function(line) {
		console.log(line);
	});
}
testTTY( fname, pbsAdjust);
/*
fs.createReadStream(file)
	.pipe(split())
	.on('data',
	function(line) {
		console.log(line);
	});
}*/
