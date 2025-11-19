import fetch from "node-fetch";

// كل المسارات
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

// جلب صورة واحدة بدون GIF
async function getImage(type) {
  try {
    const url = `https://api.waifu.pics/sfw/${type}`;
    const data = await (await fetch(url)).json();

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

    let tries = 0;

    // نسمح بـ 40 محاولة فقط (علشان ما يعلق)
    while (images.length < 10 && tries < 40) {
      const img = await getImage(randomType);
      if (img) images.push(img);

      tries++;
    }

    if (images.length === 0) {
      return res.status(500).json({
        status: "error",
        message: "لم يتم العثور على صور (كل النتائج GIF)"
      });
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
