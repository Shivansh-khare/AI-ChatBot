const express = require('express');
const cors = require('cors');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { google } = require('googleapis');
const fs = require('fs').promises;

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Initialize Gemini AI (Free tier: 15 requests per minute)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'Secret');
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });



// In-memory conversation log
let conversationLog = [];

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Generate AI response
app.post('/api/chat', async (req, res) => {
  try {
    const { message, timestamp } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    console.log('Received message:', message);

    // Generate response using Gemini
    const prompt = `You are a helpful voice assistant. Respond conversationally and concisely to: "${message}"`;
    const result = await model.generateContent(prompt);
    const response = result.response;
    const aiReply = response.text();

    // Log conversation
    const logEntry = {
      timestamp: timestamp || new Date().toISOString(),
      userMessage: message,
      aiReply: aiReply,
      id: Date.now()
    };

    conversationLog.push(logEntry);


    // Also log to local file as backup
    await logToFile(logEntry);

    res.json({
      reply: aiReply,
      timestamp: logEntry.timestamp,
      id: logEntry.id
    });

  } catch (error) {
    console.error('Error generating response:', error);
    res.status(500).json({ 
      error: 'Failed to generate response',
      reply: 'Sorry, I encountered an error. Please try again.'
    });
  }
});

// Get conversation history
app.get('/api/history', (req, res) => {
  res.json(conversationLog);
});

// Log to local file
async function logToFile(logEntry) {
  try {
    const logData = JSON.stringify(logEntry) + '\n';
    await fs.appendFile('conversation_log.txt', logData);
  } catch (error) {
    console.error('Failed to log to file:', error);
  }
}

// Clear logs endpoint
app.delete('/api/clear-logs', (req, res) => {
  conversationLog = [];
  res.json({ message: 'Logs cleared' });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    sheetsConnected: !!sheets
  });
});

app.listen(PORT, () => {
  console.log(`Voice AI Demo server running on http://localhost:${PORT}`);
  console.log('Make sure to set your GEMINI_API_KEY environment variable');
});
