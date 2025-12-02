// api/telegram.js
const fetch = require('node-fetch');
const FormData = require('form-data');

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Handle OPTIONS request (preflight)
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, audio, fileName, studentInfo, setInfo } = req.body;

    if (!message || !audio) {
      return res.status(400).json({ error: 'Message and audio are required' });
    }

    // Get environment variables
    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      console.error('Missing Telegram environment variables');
      return res.status(500).json({ 
        error: 'Server configuration error. Please check environment variables.' 
      });
    }

    console.log('Sending to Telegram for chat:', TELEGRAM_CHAT_ID);

    // 1. Send text message
    const textMessage = `
🎤 IELTS Speaking Test Completed!

👤 Student: ${studentInfo.firstName} ${studentInfo.surname}
👥 Group: ${studentInfo.group}
📚 Set: ${setInfo.name}
📅 Date: ${studentInfo.date}
⏰ Time: ${studentInfo.time}

${message}
    `.trim();

    const textResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: textMessage,
        parse_mode: 'HTML'
      })
    });

    const textResult = await textResponse.json();
    
    if (!textResponse.ok) {
      console.error('Telegram text error:', textResult);
      throw new Error(`Failed to send text: ${textResult.description || 'Unknown error'}`);
    }

    // 2. Send audio file
    // Convert base64 to buffer
    const audioBuffer = Buffer.from(audio, 'base64');
    
    const form = new FormData();
    form.append('chat_id', TELEGRAM_CHAT_ID);
    form.append('audio', audioBuffer, {
      filename: fileName || 'recording.mp3',
      contentType: 'audio/mpeg'
    });
    form.append('caption', `🎤 Recording from ${studentInfo.firstName} ${studentInfo.surname}`);

    const audioResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendAudio`, {
      method: 'POST',
      body: form
    });

    const audioResult = await audioResponse.json();
    
    if (!audioResponse.ok) {
      console.error('Telegram audio error:', audioResult);
      throw new Error(`Failed to send audio: ${audioResult.description || 'Unknown error'}`);
    }

    console.log('Successfully sent to Telegram');
    res.status(200).json({ 
      success: true, 
      message: 'Recording sent successfully to Telegram',
      messageId: textResult.result?.message_id
    });

  } catch (error) {
    console.error('Error in Telegram API:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Internal server error'
    });
  }
};
