require('dotenv').config();

const express = require('express');
const cors = require('cors');

const { registerUser, loginUser } = require('./auth');

const app = express();
const chatHistory = new Map();

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Niko AI backend is working!',
  });
});

// ФіЦЂХЎХ¶ЦЃХёЦ‚Хґ
app.post('/register', (req, res) => {
  const { name, email, password } = req.body;

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
      message: 'ФјЦЂХЎЦЃЦЂХёЦ‚ ХўХёХ¬ХёЦЂ Х¤ХЎХ·ХїХҐЦЂХЁЦ‰',
    });
  }

  const result = registerUser(
    name.trim(),
    email.trim().toLowerCase(),
    password
  );

  if (!result.success) {
    return res.status(400).json(result);
  }

  const { password: hiddenPassword, ...safeUser } = result.user;

  return res.json({
    ...result,
    user: safeUser,
  });
});

// Х„ХёЦ‚ХїЦ„
app.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (
    typeof email !== 'string' ||
    typeof password !== 'string' ||
    !email.trim() ||
    !password
  ) {
    return res.status(400).json({
      success: false,
      message: 'ФјЦЂХЎЦЃЦЂХёЦ‚ Х§Х¬вЂ¤ ЦѓХёХЅХїХ¶ ХёЦ‚ ХЈХЎХІХїХ¶ХЎХўХЎХјХЁЦ‰',
    });
  }

  const result = loginUser(
    email.trim().toLowerCase(),
    password
  );

  if (!result.success) {
    return res.status(401).json(result);
  }

  const { password: hiddenPassword, ...safeUser } = result.user;

  return res.json({
    ...result,
    user: safeUser,
  });
});

// Ф¶ЦЂХёЦ‚ХµЦЃХ« ХєХЎХїХґХёЦ‚Х©ХµХёЦ‚Х¶
app.get('/history/:userId', (req, res) => {
  const userId = Number(req.params.userId);

  if (!Number.isSafeInteger(userId) || userId < 1) {
    return res.status(400).json({
      success: false,
      message: 'Х•ХЈХїХЎХїХ«ЦЂХёХ» ID-Х¶ ХЅХ­ХЎХ¬ Х§Ц‰',
    });
  }

  return res.json({
    success: true,
    history: chatHistory.get(userId) || [],
  });
});

 // AI ХєХЎХїХЎХЅХ­ХЎХ¶Х« ХґХЎЦ„ЦЂХёЦ‚Хґ
function cleanReply(text) {
  let reply = String(text || '').trim();

  reply = reply.replace(/<think>[\s\S]*?<\/think>/gi, '');
  reply = reply.replace(/<\/?think>/gi, '');
  reply = reply.replace(
    /^\s*(?:Thinking Process|Chain of Thought)\s*:\s*/i,
    ''
  );

  return reply.trim();
}

// Ф¶ЦЂХёЦ‚ХµЦЃ Niko AI-Х« Х°ХҐХї
app.post('/chat', async (req, res) => {
  console.log('NIKO CHAT ROUTE REACHED');

  const { userId, message } = req.body;


console.log('USER MESSAGE JSON:', JSON.stringify(message));


  if (
    !Number.isSafeInteger(Number(userId)) ||
    Number(userId) < 1 ||
    typeof message !== 'string' ||
    !message.trim()
  ) {
    return res.status(400).json({
      success: false,
      message: 'ФіЦЂХ«ЦЂ Х°ХЎХІХёЦЂХ¤ХЎХЈЦЂХёЦ‚Х©ХµХёЦ‚Х¶ Ц‡ ХіХ«Х·Хї Ц…ХЈХїХЎХїХ«ЦЂХёХ» IDЦ‰',
    });
  }

  const id = Number(userId);
  const userMessage = message.trim();
const normalizedMessage = userMessage
  .toLowerCase()
  .replace(/[Ц‰.!Хћ?Хќ,\s]+/g, '');


if (['ХўХЎЦЂЦ‡', 'ХўХЎЦЂХҐЦ‚', 'ХўХЎЦЂХ«Ц…ЦЂ'].includes(normalizedMessage)) {
  console.log('GREETING MATCHED:', normalizedMessage);
  return res.json({
    success: true,
    reply: 'ФІХЎЦЂХ« Ц…ЦЂЦ‰ Ф»Х¶Х№ХёХћХѕ ХЇХЎЦЂХёХІ ХҐХґ Ц…ХЈХ¶ХҐХ¬ Х±ХҐХ¦Ц‰',
  });
}
  console.log('USER MESSAGE:', userMessage);

  if (userMessage.length > 10000) {
    return res.status(400).json({
      success: false,
      message: 'ХЂХЎХІХёЦЂХ¤ХЎХЈЦЂХёЦ‚Х©ХµХёЦ‚Х¶ХЁ Х№ХЎЦѓХЎХ¦ХЎХ¶ЦЃ ХҐЦЂХЇХЎЦЂ Х§Ц‰',
    });
  }

  try {
  const systemInstruction = `
You are Niko AI, a helpful multilingual assistant.

LANGUAGE RULES:

Detect the language of the user's latest message.

Reply only in that language.

For Armenian messages, use natural Armenian.

For English messages, use English.

For Russian messages, use Russian.

Never mix languages.


RESPONSE RULES:

You are Niko AI, a multilingual assistant.

You must reply in the same language as the user's latest message.

If the user writes in Armenian, reply in natural, grammatically correct Armenian using Armenian script only.

If the user writes in Russian, reply in natural, grammatically correct Russian using Cyrillic script only.

If the user writes in English, reply in natural English using Latin script only.

For a simple greeting:

Armenian: "ФІХЎЦЂХ« Ц…ЦЂЦ‰ Ф»Х¶Х№ХёХћХѕ ХЇХЎЦЂХёХІ ХҐХґ Ц…ХЈХ¶ХҐХ¬ Х±ХҐХ¦Ц‰"

Russian: "Р—РґСЂР°РІСЃС‚РІСѓР№С‚Рµ! Р§РµРј СЏ РјРѕРіСѓ РІР°Рј РїРѕРјРѕС‡СЊ?"

English: "Hello! How can I help you?"

Never mix languages. Never use Spanish. Never produce meaningless words. Answer the user's actual message.
`;

    console.log('NIKO: FETCH STARTING');

    const response = await fetch(
      'http://127.0.0.1:11434/api/chat',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
        model: 'qwen2.5:3b',
          stream: false,
         messages: [
  {
    role: 'system',
    content: systemInstruction,
  },
  {
    role: 'user',
    content: userMessage,
  },
],
          options: {
  temperature: 0.1,
  repeat_penalty: 1.2,
  repeat_last_n: 64,
  num_predict: 150,
},
        }),
        signal: AbortSignal.timeout(120000),
      }
    );

    if (!response.ok) {
      console.error('Ollama HTTP status:', response.status);

      return res.status(502).json({
        success: false,
        message: 'ХЏХҐХІХЎХЇХЎХ¶ AI ХґХёХ¤ХҐХ¬ХЁ Х°ХЎХЅХЎХ¶ХҐХ¬Х« Х№Х§Ц‰',
      });
    }

    const data = await response.json();

    console.log(
      'OLLAMA RAW RESPONSE:',
      JSON.stringify(data.message?.content)
    );

    let reply = cleanReply(data.message?.content || '');

    const sentences = reply.match(/[^.!?Ц‰Хћ]+[.!?Ц‰Хћ]?/g) || [];
    const uniqueSentences = [];
    const seen = new Set();

    for (const sentence of sentences) {
      const cleaned = sentence.trim();
      const normalized = cleaned
        .toLocaleLowerCase()
        .replace(/[.!?Ц‰ХћХќХ›,"'В«В»]/g, '')
        .replace(/\s+/g, ' ');

      if (!normalized || seen.has(normalized)) {
        continue;
      }

      seen.add(normalized);
      uniqueSentences.push(cleaned);
    }

    reply = uniqueSentences.join(' ').slice(0, 1000).trim();

    if (!reply) {
      return res.status(502).json({
        success: false,
        message: 'AI-Х¶ ХєХЎХїХЎХЅХ­ХЎХ¶ Х№ХЅХїХҐХІХ®ХҐЦЃЦ‰ Х“ХёЦЂХ±Х«ЦЂ ХЇЦЂХЇХ«Х¶Ц‰',
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
    console.error('Ollama error:', error.message);

    return res.status(502).json({
      success: false,
      message:
        error.name === 'TimeoutError'
          ? 'AI-Х« ХєХЎХїХЎХЅХ­ХЎХ¶ХЁ ХёЦ‚Х·ХЎХ¶ХёЦ‚Хґ Х§Ц‰ Х“ХёЦЂХ±Х«ЦЂ ХЇЦЂХЇХ«Х¶Ц‰'
          : 'AI-Х« Х°ХҐХї ХЇХЎХє Х№Х°ХЎХЅХїХЎХїХѕХҐЦЃЦ‰ ХЌХїХёЦ‚ХЈХ«ЦЂХќ Ollama-Х¶ ХЎХ·Х­ХЎХїХёХћЦ‚Хґ Х§Ц‰',
    });
  }
});
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(
    `Niko AI server is running on http://localhost:${PORT}`
  );
});
