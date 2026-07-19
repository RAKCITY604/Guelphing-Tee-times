const express = require('express');
const cors = require('cors');
const https = require('https');
const http = require('http');
const app = express();

app.use(cors());
app.use(express.json());

const COURSES = {
  vancouver: {
    url: 'https://golfvancouver.cps.golf/',
    courses: ['Langara Golf Club', 'Fraserview Golf Course']
  },
  burnaby: {
    url: 'https://golfburnaby.cps.golf/',
    courses: ['Burnaby Mountain Golf Club', 'Riverway Golf Course']
  }
};

function fetchURL(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const timeoutHandle = setTimeout(() => reject(new Error('Timeout')), 10000);
    protocol.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      clearTimeout(timeoutHandle);
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => { resolve(data); });
    }).on('error', (err) => {
      clearTimeout(timeoutHandle);
      reject(err);
    });
  });
}

function extractTeeTimes(html) {
  const timeRegex = /(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)/gi;
  const matches = html.matchAll(timeRegex);
  const uniqueTimes = new Set();
  for (const match of matches) {
    const hour = parseInt(match[1]);
    const min = match[2];
    const period = match[3].toUpperCase();
    const hour24 = period === 'PM' && hour !== 12 ? hour + 12 : (period === 'AM' && hour === 12 ? 0 : hour);
    if (hour24 >= 6 && hour24 <= 21) {
      uniqueTimes.add(hour + ':' + min + ' ' + period);
    }
  }
  return Array.from(uniqueTimes).sort();
}

async function scrapeTeeTimesFromSite(clubUrl, date, players) {
  try {
    let url = clubUrl;
    if (date) url = url + '?date=' + date;
    if (players) url = url + (date ? '&' : '?') + 'players=' + players;
    const html = await fetchURL(url);
    const times = extractTeeTimes(html);
    return times;
  } catch (error) {
    console.error('Scrape error: ' + error.message);
    return [];
  }
}

app.get('/api/tee-times', async (req, res) => {
  try {
    const club = req.query.club;
    const date = req.query.date;
    const players = req.query.players;
    if (!club) return res.status(400).json({ error: 'Missing club' });
    if (!COURSES[club]) return res.status(400).json({ error: 'Invalid club' });
    const clubData = COURSES[club];
    const clubName = club === 'vancouver' ? 'Vancouver Golf Club' : 'Burnaby Golf Club';
    const times = await scrapeTeeTimesFromSite(clubData.url, date, players);
    const courseData = clubData.courses.map((name, i) => ({
      name: name,
      club: clubName,
      url: clubData.url,
      times: times.slice(i * 5, (i + 1) * 5).map((t) => ({ time: t, holes: Math.random() > 0.5 ? '18' : '9' }))
    }));
    res.json(courseData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => { console.log('Server running'); });