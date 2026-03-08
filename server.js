const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

const SONGS_DIR = path.join(__dirname, "songs");

// Serve static files
app.use("/songs", express.static(SONGS_DIR));
app.use(express.static("public"));

// Get all songs
function getSongs() {
    if (!fs.existsSync(SONGS_DIR)) return [];

    return fs.readdirSync(SONGS_DIR)
        .filter(f => fs.statSync(path.join(SONGS_DIR, f)).isDirectory())
        .map(folder => {
            const infoPath = path.join(SONGS_DIR, folder, "info.json");
            if (!fs.existsSync(infoPath)) return null;

            try {
                const info = JSON.parse(fs.readFileSync(infoPath));
                return {
                    id: folder,
                    name: info["song name"] || "Unknown",
                    artist: info.artist || "Unknown",
                    album: info.album || "Unknown"
                };
            } catch {
                return null;
            }
        })
        .filter(Boolean);
}

// Home page
app.get("/", (req, res) => {
    const songs = getSongs();

    if (songs.length === 0) {
        return res.send("<h1>No songs found. Add subfolders in 'songs/' with info.json and mp3 files.</h1>");
    }

    const list = songs.map(song =>
        `<div class="song">
            ${song.id}: ${song.name} 
            <a href="/${song.id}">→ Play</a>
        </div>`
    ).join("");

    res.send(`
    <html>
    <head>
        <title>Kthyrea Musics</title>
        <link rel="stylesheet" href="/style.css">
    </head>
    <body>
        <h1>Kthyrea Musics</h1>
        <div class="songs">
            ${list}
        </div>
    </body>
    </html>
    `);
});

// Song page
app.get("/:id", (req, res) => {
    const id = req.params.id;
    const songDir = path.join(SONGS_DIR, id);

    if (!fs.existsSync(songDir)) return res.status(404).send("Song not found");

    const infoPath = path.join(songDir, "info.json");
    if (!fs.existsSync(infoPath)) return res.status(404).send("info.json missing");

    let info;
    try {
        info = JSON.parse(fs.readFileSync(infoPath));
    } catch {
        return res.status(500).send("Error reading info.json");
    }

    const mp3 = fs.readdirSync(songDir).find(f => /\.mp3$/i.test(f));
    if (!mp3) return res.status(404).send("MP3 missing");

    res.send(`
    <html>
    <head>
        <title>${info["song name"]}</title>
        <link rel="stylesheet" href="/style.css">
    </head>
    <body>
        <a class="back" href="/">← Back</a>
        <div class="player">
            <h2>${info["song name"]}</h2>
            <p>Artist: ${info.artist}</p>
            <p>Album: ${info.album}</p>
            <audio controls autoplay>
                <source src="/songs/${id}/${mp3}" type="audio/mpeg">
            </audio>
        </div>
    </body>
    </html>
    `);
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
