var tpb = require('./thepiratebay');
var inquirer = require('inquirer');
var tparse = require('./torrent_parse');
var subtitles = require('./subtitles');
var peerflix_path = "";
var peerflix_player = "--mpv";
var peerflix_command = "peerflix";
var peerflix_port = "--port=8888";
var subtitle_language = "eng";
var spawn = require('cross-spawn-async');
var chalk = require('chalk');
var query = '';


function Start() {
  'use strict';
  inquirer.prompt([
    {
      type: 'input',
      message: 'Movie or tv show: ',
      name: 'name'
    }
  ]).then(function (answers) {
    query = answers.name;
    tpb.search(query).then(
      function(data){
        onResolve(data);
      }, function(err) {
        onReject(err);
        console.log(chalk.red('[-] ') + 'Can\'t help you right now.');
      }
    );
  });
}

function onResolve(data) {
  selectTorrent(data);
}

function onReject(err) {
  console.log(err);
}

function selectTorrent(data) {
  var choices = [];
  for (var idx in data) {
    var torrent = data[idx];
    var title = torrent.title;
    var seeds = torrent.seeds;
    var size = torrent.size;
    var number = torrent.torrent_num;
    choices.push(title);
    choices.push({name: chalk.gray(seeds) + ' ' + chalk.gray(size), disabled: 'Info'});
  }
  var select_torrent = "Press enter to choose torrent.";
  var questions = [
    {
      type: 'list',
      name: 'torrent',
      message: select_torrent,
      choices: choices,
    }
  ];
  inquirer.prompt(questions).then(function (answer){
    var magnet;
    torrent_title = answer.torrent;
    var torrent = data.map(function(link){
      if (link.title === torrent_title) {
        magnet = link.torrent_link;
        return magnet;
      }
    });
    parseTorrent(magnet, torrent_title);
  });
}

function parseTorrent(torrent, torrent_title) {
  tparse.parseTorrent(torrent).then(function(data){
    if(data !== false){
      console.log(chalk.green('[+] ') + 'Multiple torrent file detected.');
      var torrent_count = 1;

      data.forEach(function(torrents){
          console.log(torrent_count + torrents);
          torrent_count++;
      });
      inquirer.prompt([
        {
         type: "input",
         name: "torrent",
         message: chalk.green(select_file),
         validate: function( value ) {
           if(value > data.length){
             return "Please enter a valid file number (1-"+data.length+")";
           }else if(!value){
             return "Please enter a valid file number (1-"+data.length+")";
           }else if(!value.match(/\d+/g)){
             return "Please enter a valid torrent number (1-"+data.length+")";
           } else {
             return true;
           }
         }
        }
         ], function( answer ) {
           number = answer.t;
           torrent_index = answer.torrent-1;
           torrent_title = data[torrent_index];
           streamTorrent_sub(torrent);
         });
      } else if (data === false) {
        subtitles.fetchSub(subtitle_language, torrent_title).then(function(data){
          peerflix_subtitle = data;
          streamTorrent_sub(torrent);
        });
      }
  });
}

function streamTorrent_sub(torrent){
  var argsList =  [torrent, "--subtitles=" + peerflix_subtitle, peerflix_player];
  osSpecificSpawn(peerflix_command, argsList);
}

function osSpecificSpawn(command, argsList){
  if(peerflix_path){
    argsList.push('--path=' + peerflix_path + '');
  }
  spawn(peerflix_command, argsList, {stdio:'inherit'});
}

Start(query);
