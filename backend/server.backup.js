require('dotenv').config();

const express = require('express');
const cors = require('cors');

const {
  registerUser,
  loginUser,
  saveChat,
  getChatHistory,
} = require('./auth');

const app = express();
const chatHistory = new Map();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Niko AI backend is working!' });
});

app.post('/register', (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Լրացրու բոլոր դաշտերը։',
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
  return res.json({ ...result, user: safeUser });
});

app.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Լրացրու էլ․ փոստն ու գաղտնաբառը։',
    });
  }

  const result = loginUser(email.trim().toLowerCase(), password);

  if (!result.success) {
    return res.status(401).json(result);
  }

  const { password: hiddenPassword, ...safeUser } = result.user;
  return res.json({ ...result, user: safeUser });
});

app.get('/history/:userId', (req, res) => {
  const userId = Number(req.params.userId);

  if (!Number.isInteger(userId) || userId < 1) {
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

app.post('/chat', async (req, res) => {
  const { userId, message } = req.body;

  if (!userId || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Գրիր հաղորդագրություն և օգտատիրոջ ID։',
    });
  }

  try {
    const response = await fetch('http://127.0.0.1:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'qwen2.5:3b',
        stream: false,
        think: false,
        options: {
  temperature: 0.2,
  num_predict: 120,
        },
        messages: [
          {
            role: 'system',
            content: `Դու Niko AI-ն ես՝ օգտակար և բարեհամբույր օգնական։
Պատասխանիր օգտատիրոջ լեզվով։
Հայերեն հարցերին պատասխանիր պարզ, բնական արևելահայերենով։
Օգտագործիր կարճ, ճիշտ և հասկանալի նախադասություններ։
Մի հորինիր փաստեր։ Եթե վստահ չես, ասա դա։`,
          },
          {
            role: 'user',
            content: message.trim(),
          },
        ],
      }),
    });

    if (!response.ok) {
  throw new Error(`Ollama error: ${response.status}`);
}

const aiResponse = await response.json();

const reply =
  aiResponse.message?.content || 'Չկարողացա պատասխանել։';

const history = chatHistory.get(Number(userId)) || [];

history.push(
  { role: 'user', content: message.trim() },
  { role: 'assistant', content: reply }
);

chatHistory.set(Number(userId), history);

return res.json({
  success: true,
  reply,
});
} catch (error) {
    console.error('Niko AI error:', error);

    return res.status(500).json({
      success: false,
      message: 'Niko AI-ի սխալը՝ ' + error.message,
    });
  }
});