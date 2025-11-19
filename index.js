import fetch from "node-fetch";

// كل المسارات المتاحة
const categories = [
  "waifu", "neko", "shinobu", "megumin",
  "bully", "cuddle", "cry", "hug",
  "awoo", "kiss", "lick", "pat",
  "smug", "bonk", "yeet", "blush",
  "smile", "wave", "highfive", "handhold",
  "nom", "bite", "glomp", "slap",
  "kill", "kick", "happy", "wink",
  "poke", "dance", "cringe"
];

// دالة تجيب رابط واحد بدون GIF
async function getImage(type) {
  try {
    const api = `https://api.waifu.pics/sfw/${type}`;
    const data = await fetch(api).then(r => r.json());
    if (!data || !data.url) return null;

    if (data.url.endsWith(".gif")) return null;

    return data.url;

  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  try {
    const randomType = categories[Math.floor(Math.random() * categories.length)];
    const images = [];

    while (images.length < 10) {
      const img = await getImage(randomType);
      if (img) images.push(img);
    }

    res.status(200).json({
      status: "ok",
      type: randomType,
      count: images.length,
      results: images
    });

  } catch (err) {
    res.status(500).json({
      status: "error",
      message: err.message
    });
  }
}
