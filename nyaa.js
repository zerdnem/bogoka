const request = require("request");
const parser = require("xml2json");

module.exports = {
  search: (query, nyaa_url = "https://nyaa.si", cat, page, limit) => {
    const torrent_search = query;
    const search_query = torrent_search.split(" ").join("+");

    const search_url = nyaa_url + "/?page=rss&q=" + search_query;

    const torrent_content = [];

    let count = 1;
    let data_content = {};

    return new Promise((resolve, reject) => {
      request(search_url, (err, response, body) => {
        if (!err && response.statusCode === 200) {
          const json = JSON.parse(parser.toJson(body));

          if (Object.keys(json.rss.channel.item).length > 0) {
            for (const torrent in json.rss.channel.item) {
              data = json.rss.channel.item;
              const title = data[torrent].title;
              const torrent_link = data[torrent].link;
              const seeds = data[torrent]["nyaa:seeders"];
              const leechs = data[torrent]["nyaa:leechers"];
              const size = data[torrent]["nyaa:size"];

              data_content = {
                torrent_num: count,
                name: title,
                seeders: seeds,
                leechs: leechs,
                size: size,
                torrent_link: torrent_link,
                date_added: ""
              };

              torrent_content.push(data_content);

              resolve(torrent_content);
              // like break
              if (++count > limit) {
                return false;
              }
            }
          } else {
            deferred.reject("No torrents found");
          }
        } else {
          reject("There was a problem loading Nyaa");
        }
      });
    });
  }
};
