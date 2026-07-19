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
    const timeout = setTimeout(() => reject(new Error('Timeout')), 10000);
    
    protocol.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    }, (res) => {
      clearTimeout(timeout);
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', err => {
      clearTimeout(timeout);
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
      uniqueTimes.add(`${hour}:${min} ${period}`);
    }
  }
  
  return Array.from(uniqueTimes).sort();
}

async function scrapeTeeTimesFromSite(clubUrl, date, players) {
  try {
    let url = clubUrl;
    if (date) url += `?date=${date}`;
    if (players) url += (date ? '&' : '?') +
