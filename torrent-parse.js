var readTorrent = require("read-torrent");

module.exports = {
  parseTorrent: torrent => {
    var torrent_count = 0;
    var data_content = {};
    var torrent_content = [];

    return new Promise((resolve, reject) => {
      //dont bother checking if magnet link
      if (torrent.indexOf("magnet:?xt=urn:") > -1) {
        //we can't check magnet links for multiple files so skip
        resolve(false);
      } else {
        readTorrent(torrent, (err, torrent) => {
          if (typeof torrent.files !== undefined) {
            torrent.files.forEach(function(torrent_files) {
              torrent_content.push(torrent_files.name);

              var StreamFormats = [".mp4", ".mkv", ".avi"],
                length = StreamFormats.length;
              while (length--) {
                //figure out how many streamable files there are
                if (torrent_files.name.indexOf(StreamFormats[length]) != -1) {
                  if (torrent_files.name.indexOf("sample") == -1) {
                    torrent_count++;
                  }
                }
              }
            });
          } else {
            //single file torrent
            resolve(false);
          }

          if (torrent_count > 1) {
            //more than one streamable files
            resolve(torrent_content);
          } else {
            //single file torrent
            resolve(false);
          }
        });
      }
    });
  }
};
