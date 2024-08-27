const { addonBuilder } = require("stremio-addon-sdk");

const manifest = {
  id: "com.jweaker.cinemabox",
  version: "1.0.0",

  name: "CinemaBox",
  description: "Support for cinema.albox.co",

  icon: "https://utfs.io/f/eaef4361-5b38-4b5f-b7c8-11eadf9bec57-4o63ls.webp",

  resources: ["stream"],
  types: ["movie", "series", "anime", "other"],
  catalogs: [],

  // prefix of item IDs (ie: "tt0032138")
  idPrefixes: ["tt"],
};

const builder = new addonBuilder(manifest);

builder.defineStreamHandler(async function (args) {
  const splitId = args.id.split(":");
  const dbId = splitId[0];
  const season = splitId[1];
  const ep = splitId[2];
  const mvdb = await (
    await fetch(`https://www.omdbapi.com/?i=${dbId}&apikey=ed6364ce`)
  ).json();
  const name = mvdb.Title;

  const info = await (
    await fetch(
      `https://cinema.albox.co/api/v4/search?term=${encodeURI(name)}&page_number=1&page_size=1`,
    )
  ).json();

  const id = info.results[0].id;
  const year = info.results[0].year;
  const vidInfo = await (
    await fetch(`https://cinema.albox.co/api/v4/shows/shows/dynamic/${id}`)
  ).json();

  let vidId = vidInfo.post_info.episode_id;
  if (season) {
    const currentSeason = vidInfo.post_info.current_season_id;
    const seasons = vidInfo.sections[1].data;
    const seasonId = seasons[season - 1];
    if (currentSeason === seasonId) {
      const episodes = vidInfo.sections[2].data;
      vidId = episodes[ep - 1].id;
    } else {
      const vidInfo2 = await (
        await fetch(
          `https://cinema.albox.co/api/v4/shows/shows/dynamic/${id}?season_id=${seasonId}`,
        )
      ).json();
      const episodes = vidInfo2.sections[2].data;
      vidId = episodes[ep - 1].id;
    }
  }

  const files = await (
    await fetch(`https://cinema.albox.co/api/v4/shows/episodes/${vidId}/files`)
  ).json();

  const streams = files.videos.map((v) => ({
    title: name + " (" + year + ")",
    name: "CinemaBox " + v.quality,
    url: v.url,
    type: files.show_type.toLowerCase(),
  }));

  return { streams };
});

module.exports = builder.getInterface();
