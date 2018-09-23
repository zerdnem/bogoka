const spawn = require('child_process').spawn;
const path = require('path');
const process = require('process');
const fs = require('fs');
const os = require('os');

const request = require('request');
const chalk = require('chalk');
const tpb = require('thepiratebay');
const inquirer = require('inquirer');

const tparse = require('./torrent-parse');
const yts = require('./yts');
const nyaa = require('./nyaa');

const peerflix_player = '';
const subtitle_language = 'eng';

let torrent_provider;

const providers = [
  {name: 'tpb', message: 'Search movie or tv show: '},
  {name: 'yts', message: 'Search movie: '},
  {name: 'nyaa', message: 'Search anime: '},
];

function selectTorrentProvider() {
  'use strict';
  inquirer
    .prompt([
      {
        type: 'list',
        message: 'Select torrent provider: ',
        name: 'torrent_provider',
        choices: providers.map(provider => provider.name),
      },
    ])
    .then(answer => {
      const query = answer.torrent_provider;
      providers.map(provider => {
        if (query == provider.name) {
          startProvider(provider.name, provider.message);
        }
      });
    });
}

function startProvider(provider, message) {
  'use strict';
  inquirer
    .prompt([
      {
        type: 'input',
        message: message,
        name: 'name',
      },
    ])
    .then(answers => {
      const query = answers.name;
      torrent_provider = query;
      switch (provider) {
        case 'tpb':
          tpb
            .search(query)
            .then(data => selectTorrent(data))
            .catch(e => console.log(chalk.red('[-] ') + e));
          break;
        case 'yts':
          yts
            .search(query)
            .then(data => selectTorrent(data))
            .catch(e => console.log(chalk.red('[-] ') + e));
          break;
        case 'nyaa':
          nyaa
            .search(query)
            .then(data => selectTorrent(data))
            .catch(e => console.log(chalk.red('[-] ') + e));
          break;
      }
    });
}

function selectTorrent(data) {
  const choices = [];
  data.map(torrent => {
    const name = torrent.name;
    const seeders = torrent.seeders;
    const size = torrent.size;
    choices.push(name);
    choices.push({
      name: `${chalk.gray(seeders)} Seeds, ${chalk.gray(size)}`,
      disabled: 'Info',
    });
  });
  const select_torrent = 'Press enter to choose torrent.';
  const questions = [
    {
      type: 'list',
      name: 'torrent',
      message: select_torrent,
      choices: choices,
    },
  ];
  inquirer.prompt(questions).then(answer => {
    const choice = answer.torrent;
    data.map(torrent => {
      if (choice === torrent.name) {
        if (torrent.url) {
          download(torrent.url, choice, 'torrent', file =>
            parseTorrent(file, choice),
          );
        } else {
          parseTorrent(torrent.magnetLink || torrent.torrent_link, choice);
        }
      }
    });
  });
}

function parseTorrent(torrent, query) {
  tparse.parseTorrent(torrent).then(data => {
    if (data) {
      console.log(chalk.green('[+] ') + 'Multiple torrent file detected.');
      let torrent_count = 1;

      data.map(torrents => {
        console.log(`${torrent_count}. ${torrents}`);
        torrent_count++;
      });
      inquirer
        .prompt([
          {
            type: 'input',
            name: 'torrent',
            message: chalk.green(
              'Select file in torrent to stream (eg. 1, 2, 3..) or (b)ack or (e)xit: ',
            ),
            validate: value => {
              if (value > data.length) {
                return (
                  'Please enter a valid file number (1-' + data.length + ')'
                );
              } else if (!value) {
                return (
                  'Please enter a valid file number (1-' + data.length + ')'
                );
              } else if (!value.match(/\d+/g)) {
                return (
                  'Please enter a valid torrent number (1-' + data.length + ')'
                );
              } else {
                return true;
              }
            },
          },
        ])
        .then(answer => {
          if (answer.torrent === 'b') {
            start(options);
          } else if (answer.torrent === 'e') {
            exit();
          } else {
            const torrent_index = answer.torrent - 1;
            const torrent_title = data[torrent_index];
            console.log('Streaming ' + chalk.green(torrent_title));
            spawn('peerflix', [torrent, `--i=${torrent_index}`, '--mpv']);
          }
        })
        .catch(e => console.log(chalk.red(e)));
    } else {
      if (torrent_provider == 'tpb') {
        const subtitle = opensubtitle
          .fetchSub(subtitle_language, query)
          .then(data => data)
          .catch(e => console.log(chalk.red(e)));
        if (subtitle) {
          const subtitle_file = path.resolve(subtitle);
          spawn('peerflix', [torrent, `--subtitles=${subtitle_file}`, '--mpv']);
        }
        spawn('peerflix', [torrent, '--mpv']);
      }

      spawn('peerflix', [torrent, '--mpv']);
    }
  });
}

function exit() {
  console.log(chalk.red('Exiting app...'));
  process.exit(0);
}

function download(url, filename, ext, cb) {
  request.get(url).on('response', res => {
    const file = path.resolve(
      `${os.tmpdir()}/${filename.split(' ').join('-')}.${ext}`,
    );
    const fws = fs.createWriteStream(torrent);
    res.pipe(fws);
    res.on('end', () => {
      return cb(file);
    });
  });
}

selectTorrentProvider();
