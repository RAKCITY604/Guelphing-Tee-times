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
    const timeoutHandle = setTimeout(() => {
      reject(new Error('Request timeout'));
    }, 10000);
    
    protocol.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    }, (res) => {
      clearTimeout(timeoutHandle);
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve(data);
      });
    }).on('error', (err) => {
      clearTimeout(timeoutHandle);
      reject(err);
    });
  });
}

function extractTeeTimes(htmlContent) {
  const timeRegex = /(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)/gi;
  const matches = htmlContent.matchAll(timeRegex);
  const uniqueTimes = new Set();
  
  for (const match of matches) {
    const hour = parseInt(match[1]);
    const min = match[2];
    const period = match[3].toUpperCase();
    const hour24 = period === 'PM' && hour !== 12 ? hour + 12 : (period === 'AM' && hour === 12 ? 0 : hour);
    
    if (hour24 >= 6 && hour24 <= 21) {
      uniqueTimes.add(`${hour}:${min} ${period}`);
    }
  }
  
  return Array.from(uniqueTimes).sort();
}

async function scrapeTeeTimesFromSite(clubUrl, date, players) {
  try {
    let urlWithParams = clubUrl;
    if (date) {
      urlWithParams = clubUrl + '?date=' + date;
    }
    if (players) {
      urlWithParams = urlWithParams + (date ? '&' : '?') + 'players=' + players;
    }
    
    console.log('Fetching: ' + urlWithParams);
    const htmlContent = await fetchURL(urlWithParams);
    const times = extractTeeTimes(htmlContent);
    console.log('Found ' + times.length + ' tee times');
    return times;
  } catch (error) {
    console.error('Scraping error: ' + error.message);
    return [];
  }
}

app.get('/api/tee-times', async (req, res) => {
  try {
    const club = req.query.club;
    const date = req.query.date;
    const players = req.query.players;

    if (!club) {
      return res.status(400).json({ error: 'Missing club parameter' });
    }

    if (!COURSES[club]) {
      return res.status(400).json({ error: 'Invalid club' });
    }

    const clubData = COURSES[club];
    const clubName = club === 'vancouver' ? 'Vancouver Golf Club' : 'Burnaby Golf Club';
    
    const times = await scrapeTeeTimesFromSite(clubData.url, date, players);

    const courseData = clubData.courses.map((courseName, index) => {
      return {
        name: courseName,
        club: clubName,
