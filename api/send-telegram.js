// api/send-telegram.js
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { message, audio, fileName } = req.body;

        if (!message || !audio) {
            return res.status(400).json({ error: 'Message and audio are required' });
        }

        const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
        const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

        if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
            return res.status(500).json({ error: 'Telegram credentials not configured' });
        }

        // Send text message
        const textResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: message,
                parse_mode: 'HTML'
            })
        });

        if (!textResponse.ok) {
            throw new Error('Failed to send text message');
        }

        // Convert base64 back to buffer
        const audioBuffer = Buffer.from(audio, 'base64');
        
        // Create FormData for audio upload
        const formData = new FormData();
        formData.append('chat_id', TELEGRAM_CHAT_ID);
        formData.append('audio', new Blob([audioBuffer], { type: 'audio/mpeg' }), fileName);
        formData.append('caption', `🎤 Recording from ${fileName.split('_')[0]} ${fileName.split('_')[1]}`);

        // Send audio file
        const audioResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendAudio`, {
            method: 'POST',
            body: formData
        });

        if (!audioResponse.ok) {
            const errorText = await audioResponse.text();
            throw new Error(`Failed to send audio: ${errorText}`);
        }

        res.status(200).json({ success: true, message: 'Recording sent to Telegram' });
    } catch (error) {
        console.error('Error sending to Telegram:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}
