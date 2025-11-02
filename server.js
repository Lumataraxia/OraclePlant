const axios = require('axios');
require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static('public'));

// Globals
let latestData = {};
let lastMood = '';
let lastAiMessage = '';
let isGeneratingAudio = false;
let audioVersion = 0;
let lastGenerationTime = 0;
const COOLDOWN = 20000; // 20s cooldown

app.post('/sensor', async (req, res) => {
  const { temperature, humidity, light, moisture } = req.body;

  // Determine mood
  let mood = '';
  if (temperature > 28 && light > 800) mood = 'Energetic';
  else if (temperature < 20) mood = 'Chilly';
  else if (humidity < 40 || moisture < 30) mood = 'Thirsty';
  else mood = 'Happy';

  latestData = { temperature, humidity, light, moisture, mood };
  res.json({
    status: 'ok',
    mood,
    aiMessage: lastAiMessage || 'Generating...',
    audioVersion
  });

  const now = Date.now();

  if (mood !== lastMood && !isGeneratingAudio && now - lastGenerationTime > COOLDOWN) {
    lastMood = mood;
    isGeneratingAudio = true;
    lastGenerationTime = now;

    const prompt = `My plant has moisture ${moisture}, temperature ${temperature}, humidity ${humidity}, and light ${light}. Write a fun, short message in the plant's voice about its mood.`;

    try {
      console.log('🪴 Sending prompt to Gemini...');
      const geminiResp = await axios.post(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
        {
          contents: [{
            parts: [
              { text: 'You are a cute, fun, and talkative plant that describes its mood based on moisture, temperature, humidity, and light.' },
              { text: prompt }
            ]
          }]
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': process.env.GEMINI_API_KEY
          }
        }
      );

      const aiMessage =
        geminiResp.data?.candidates?.[0]?.content?.parts?.[0]?.text || 'I feel okay!';
      lastAiMessage = aiMessage;
      console.log('🌱 Gemini message:', aiMessage);

      console.log('🎤 Sending message to ElevenLabs...');
      const audioResp = await axios.post(
        `https://api.elevenlabs.io/v1/text-to-speech/GUDYcgRAONiI1nXDcNQQ`,
        {
          text: aiMessage,
          model_id: 'eleven_multilingual_v1'
        },
        {
          headers: {
            'xi-api-key': process.env.ELEVEN_API_KEY,
            'Content-Type': 'application/json'
          },
          responseType: 'arraybuffer'
        }
      );

      const audioPath = path.join(__dirname, 'public', 'plant_mood.mp3');
      fs.writeFileSync(audioPath, audioResp.data);
      audioVersion++;
      console.log('🎧 New plant audio saved!');
    } catch (err) {
      if (err.response) {
        console.error('❌ API error:', err.response.status, err.response.data);
      } else {
        console.error('❌ Request failed:', err.message);
      }
    } finally {
      isGeneratingAudio = false;
    }
  }
});

app.get('/status', (req, res) => {
  res.json({ ...latestData, aiMessage: lastAiMessage, audioVersion });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, '0.0.0.0', () =>
  console.log(`✅ Server running at http://0.0.0.0:${port}`)
);
