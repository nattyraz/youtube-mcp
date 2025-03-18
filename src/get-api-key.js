#!/usr/bin/env node
import { google } from 'googleapis';
import express from 'express';
import open from 'open';
import http from 'http';

const oauth2Client = new google.auth.OAuth2(
  process.env.YOUTUBE_CLIENT_ID,
  process.env.YOUTUBE_CLIENT_SECRET,
  'http://localhost:3000/oauth2callback'
);

const scopes = [
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/youtube.force-ssl'
];

const app = express();
const server = http.createServer(app);

app.get('/oauth2callback', async (req, res) => {
  const { code } = req.query;
  if (code) {
    try {
      const { tokens } = await oauth2Client.getToken(code);
      console.log('\nCredentials:\n', JSON.stringify(tokens, null, 2));
      res.send('Authorization successful! You can close this window.');
      server.close();
    } catch (err) {
      console.error('Error getting tokens:', err);
      res.status(500).send('Error getting tokens');
    }
  } else {
    res.status(400).send('No code provided');
  }
});

const url = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: scopes
});

server.listen(3000, () => {
  console.log('Server is running at http://localhost:3000');
  console.log('\nOpening browser for authorization...');
  open(url);
});