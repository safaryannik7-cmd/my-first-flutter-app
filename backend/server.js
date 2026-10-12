require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { GoogleGenAI } = require('@google/genai');
const { registerUser, loginUser } = require('./auth');

const app = express();
app.get('/health', (req, res) => {
  res.status(200).send('Niko AI backend is healthy');
});
const chatHistory = new Map();

app.use(cors());
app.use(express.json({ limit: '1mb' }));

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error('GEMINI_API_KEY is missing from environment variables.');
}

const ai = apiKey
  ? new GoogleGenAI({ apiKey })
  : null;

// Գլխավոր էջ
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Niko AI backend is healthy',
  });
});
// Առողջության ստուգում

// Գրանցում
app.post('/register', (req, res) => {
  const { name, email, password } = req.body || {};

  if (
    typeof name !== 'string' ||
    typeof email !== 'string' ||
    typeof password !== 'string' ||
    !name.trim() ||
    !email.trim() ||
    !password
  ) {
    return res.status(400).json({
      success: false,
      message: 'Լրացրու բոլոր դաշտերը։',
    });
  }

  try {
    const result = registerUser(
      name.trim(),
      email.trim().toLowerCase(),
      password
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    if (result.user) {
      const { password: hiddenPassword, ...safeUser } = result.user;

      return res.json({
        ...result,
        user: safeUser,
      });
    }

    return res.json(result);
  } catch (error) {
    console.error('Registration error:', error);

    return res.status(500).json({
      success: false,
      message: 'Գրանցման ժամանակ սխալ առաջացավ։',
    });
  }
});

// Մուտք
app.post('/login', (req, res) => {
  const { email, password } = req.body || {};

  if (
    typeof email !== 'string' ||
    typeof password !== 'string' ||
    !email.trim() ||
    !password
  ) {
    return res.status(400).json({
      success: false,
      message: 'Լրացրու էլ․ փոստն ու գաղտնաբառը։',
    });
  }

  try {
    const result = loginUser(
      email.trim().toLowerCase(),
      password
    );

    if (!result.success) {
      return res.status(401).json(result);
    }

    if (result.user) {
      const { password: hiddenPassword, ...safeUser } = result.user;

      return res.json({
        ...result,
        user: safeUser,
      });
    }

    return res.json(result);
  } catch (error) {
    console.error('Login error:', error);

    return res.status(500).json({
      success: false,
      message: 'Մուտքի ժամանակ սխալ առաջացավ։',
    });
  }
});

// Զրույցի պատմություն
app.get('/history/:userId', (req, res) => {
  const userId = Number(req.params.userId);

  if (!Number.isSafeInteger(userId) || userId < 1) {
    return res.status(400).json({
      success: false,
      message: 'Օգտատիրոջ ID-ն սխալ է։',
    });
  }

  return res.json({
    success: true,
    history: chatHistory.get(userId) || [],
  });
});

// Պատասխանի մաքրում
function cleanReply(text) {
  return String(text || '')
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .trim();
}

// Զրույց Niko AI-ի հետ
app.post('/chat', async (req, res) => {
  console.log('NIKO CHAT ROUTE REACHED');

  const { userId, message } = req.body || {};

  if (
    !Number.isSafeInteger(Number(userId)) ||
    Number(userId) < 1 ||
    typeof message !== 'string' ||
    !message.trim()
  ) {
    return res.status(400).json({
      success: false,
      message: 'Գրիր հաղորդագրություն և ճիշտ օգտատիրոջ ID։',
    });
  }

  const id = Number(userId);
  const userMessage = message.trim();

  if (userMessage.length > 10000) {
    return res.status(400).json({
      success: false,
      message: 'Հաղորդագրությունը չափազանց երկար է։',
    });
  }

  // Պարզ ողջույնի պատասխան
  const normalizedMessage = userMessage
    .toLowerCase()
    .replace(/[։.!՞?՝,\s]+/g, '');

  if (['բարև', 'բարեւ', 'բարիօր'].includes(normalizedMessage)) {
    const reply = 'Բարի օր։ Ինչո՞վ կարող եմ օգնել ձեզ։';

    const previousHistory = chatHistory.get(id) || [];

    previousHistory.push({
      user: userMessage,
      ai: reply,
      date: new Date().toISOString(),
    });

    chatHistory.set(id, previousHistory.slice(-30));

    return res.json({
      success: true,
      reply,
    });
  }

  if (!ai) {
    console.error('Gemini API key is not configured.');

    return res.status(503).json({
      success: false,
      message: 'AI ծառայությունը կարգավորված չէ։ Ստուգիր սերվերի կարգավորումները։',
    });
  }

  const systemInstruction = `
You are Niko AI, a helpful, accurate, multilingual AI assistant.

LANGUAGE RULES:
1. Identify the language of the user's latest message.
2. Reply entirely in that language.
3. Armenian messages must receive Armenian replies.
4. Russian messages must receive Russian replies.
5. English messages must receive English replies.
6. For every other language, reply in that same language.
7. Do not switch languages unless the user requests it.
8. Do not translate the user's message unless asked.
9. Be natural, clear, friendly, and relevant.
10. If the language is unclear, ask a short clarification in that language.
`;

  try {
    console.log('NIKO: GEMINI STARTING');

    const response = await ai.interactions.create({
  model: 'gemini-3.8-flash',
  input: `${systemInstruction}\n\nUser message:\n${userMessage}`,
});

const reply = cleanReply(response.output_text || '');

    if (!reply) {
      console.error('Gemini returned an empty response.');

      return res.status(502).json({
        success: false,
        message: 'AI-ն պատասխան չստեղծեց։ Փորձիր կրկին։',
      });
    }

    const previousHistory = chatHistory.get(id) || [];

    previousHistory.push({
      user: userMessage,
      ai: reply,
      date: new Date().toISOString(),
    });

    chatHistory.set(id, previousHistory.slice(-30));

    return res.json({
      success: true,
      reply,
    });
  } catch (error) {
    console.error('ERROR MESSAGE:', error?.message);
    console.error('ERROR STATUS:', error?.status);
    console.error('ERROR CODE:', error?.code);
    console.error('Gemini error details:', error);

    return res.status(502).json({
      success: false,
      message: 'AI-ի հետ կապի ժամանակ սխալ առաջացավ։ Ստուգիր սերվերի Terminal-ը։',
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Niko AI backend is running on port ${PORT}`);
});