const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/tee-times', (req, res) => {
  res.json([
    {
      name: 'Langara Golf Club',
      club: 'Vancouver Golf Club',
      url: 'https://golfvancouver.cps.golf/',
      times: [
        { time: '7:00 AM', holes: '18' },
        { time: '7:15 AM', holes: '18' },
        { time: '7:30 AM', holes: '9' }
      ]
    },
    {
      name: 'Fraserview Golf Course',
      club: 'Vancouver Golf Club',
      url: 'https://golfvancouver.cps.golf/',
      times: [
        { time: '8:00 AM', holes: '18' },
        { time: '8:15 AM', holes: '9' }
      ]
    }
  ]);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Server running');
});
