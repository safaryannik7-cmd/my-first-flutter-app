const users = [];
const chats = {};

function registerUser(name, email, password) {
  const existingUser = users.find(
    (user) => user.email === email
  );

  if (existingUser) {
    return {
      success: false,
      message: 'Այս email-ով հաշիվ արդեն կա։'
    };
  }

  const user = {
    id: users.length + 1,
    name: name,
    email: email,
    password: password,
    plan: 'free',
    role: 'user'
  };

  users.push(user);
  chats[user.id] = [];

  return {
    success: true,
    message: 'Հաշիվը ստեղծվեց։',
    user: user
  };
}

function loginUser(email, password) {
  const user = users.find(
    (user) =>
      user.email === email &&
      user.password === password
  );

  if (!user) {
    return {
      success: false,
      message: 'Email-ը կամ գաղտնաբառը սխալ է։'
    };
  }

  return {
    success: true,
    message: 'Մուտքը հաջողվեց։',
    user: user
  };
}

function saveChat(userId, userMessage, aiMessage) {
  if (!chats[userId]) {
    chats[userId] = [];
  }

  chats[userId].push({
    user: userMessage,
    ai: aiMessage,
    date: new Date().toISOString()
  });

  return chats[userId];
}

function getChatHistory(userId) {
  return chats[userId] || [];
}

module.exports = {
  registerUser,
  loginUser,
  saveChat,
  getChatHistory
};