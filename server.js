const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;
const USERS_FILE = path.join(__dirname, 'users.json');

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());

// Helper function to read users from file
const readUsersFromFile = () => {
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify([])); // Create the file with an empty array
  }
  const data = fs.readFileSync(USERS_FILE, 'utf-8');
  return JSON.parse(data);
};

// Helper function to write users to file
const writeUsersToFile = (users) => {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
};

// Handle registration form submission
app.post('/register', (req, res) => {
    const { username, email, password, confirmPassword, state={} } = req.body;
   
    // Validate username length
    if (username.length < 3) {
      return res.status(400).json({ message: 'Username must be at least 3 characters long!' });
    }
  
    // Validate email format using regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format!' });
    }

     // Validate password length
  if (password.length < 5) {
    return res.status(400).json({ message: 'Password must be at least 5 characters long!' });
  }
  
    // Check if passwords match
    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match!' });
    }
  
    const users = readUsersFromFile();
    const existingUser = users.find(user => user.email === email);
    
    // Check if the user already exists
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists!' });
    }
  
    const newUser = { username, email, password, state };
    
    // Add the new user to the list and save it to the file
    users.push(newUser);
    writeUsersToFile(users);
  
    res.status(201).json({ message: 'Registration successful!' });
  });

// Handle login form submission
app.post('/login', (req, res) => {
    const { email, password } = req.body;
  
    // Validate email format using regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format!' });
    }

     // Validate password length
    if (password.length < 5) {
        return res.status(400).json({ message: 'Password must be at least 5 characters long!' });
    }
  
    // Check if the email exists and the password matches
    const users = readUsersFromFile();
    const user = users.find(user => user.email === email);
    if (!user || user.password !== password) {
      return res.status(401).json({ message: 'Invalid email or password!' });
    }

    // Send success response with the user object
    res.status(200).json({ message: 'Login successful!', user });
  });

// Get all users
app.get('/users', (req, res) => {
  const users = readUsersFromFile();
  res.status(200).json(users);
});

// Get a single user by email
app.get('/users/:email', (req, res) => {
  const { email } = req.params;
  const users = readUsersFromFile();
  const user = users.find(user => user.email === email);

  if (!user) {
    return res.status(404).json({ message: 'User not found!' });
  }

  res.status(200).json(user);
});

// Update a user by email
app.put('/users/:email', (req, res) => {
  const { email } = req.params;
  const { username, password, state } = req.body;

  const users = readUsersFromFile();
  const userIndex = users.findIndex(user => user.email === email);

  if (userIndex === -1) {
    return res.status(404).json({ message: 'User not found!' });
  }

  const updatedUser = { ...users[userIndex], username, password, state };
  users[userIndex] = updatedUser;
  writeUsersToFile(users);

  res.status(200).json({ message: 'User updated successfully!', updatedUser });
});

// Update only the state of a user by email
app.put('/users/:email/updateState', (req, res) => {
  const { email } = req.params;
  const newState = req.body; // Directly take the request body as the state object

  const users = readUsersFromFile();
  const userIndex = users.findIndex(user => user.email === email);

  if (userIndex === -1) {
    return res.status(404).json({ message: 'User not found!' });
  }

  users[userIndex].state = newState; // Replace the existing state with the new state
  writeUsersToFile(users);

  res.status(200).json({ message: 'User state updated successfully!', state: newState });
});

// Route to add a new bot to activeTradingBots for a user by email
app.post('/users/:email/addActiveBot', (req, res) => {
  console.log(req.params);
  const { email } = req.params;
  const newBot = req.body; // The new bot object sent in the request body

  const users = readUsersFromFile();
  const userIndex = users.findIndex(user => user.email === email);

  if (userIndex === -1) {
    return res.status(404).json({ message: 'User not found!' });
  }

  // Ensure the activeTradingBots array exists, or initialize it if it doesn't
  if (!users[userIndex].state.activeTradingBots) {
    users[userIndex].state.activeTradingBots = [];
  }

  users[userIndex].state.activeTradingBots.push(newBot); // Add the new bot to the array
  writeUsersToFile(users);

  res.status(200).json({ message: 'Bot added to activeTradingBots successfully!', bot: newBot });
});


// Delete a user by email
app.delete('/users/:email', (req, res) => {
  const { email } = req.params;

  const users = readUsersFromFile();
  const userIndex = users.findIndex(user => user.email === email);

  if (userIndex === -1) {
    return res.status(404).json({ message: 'User not found!' });
  }

  users.splice(userIndex, 1);
  writeUsersToFile(users);

  res.status(200).json({ message: 'User deleted successfully!' });
});

// Remove an active bot by ID and move it to completed bots
app.put('/users/:email/moveBot/:botId', (req, res) => {
  const { email, botId } = req.params;
  const users = readUsersFromFile();
  const userIndex = users.findIndex(user => user.email === email);

  if (userIndex === -1) {
    return res.status(404).json({ message: 'User not found!' });
  }

  const user = users[userIndex];
  const activeBots = user.state.activeTradingBots || [];
  const completedBots = user.state.completedTradingBots || [];

  const botIndex = activeBots.findIndex(bot => bot.id == botId);
  if (botIndex === -1) {
    return res.status(404).json({ message: 'Active bot not found!' });
  }

  // Remove the bot from active and add it to completed
  const [movedBot] = activeBots.splice(botIndex, 1);
  completedBots.push(movedBot);

  // Update user's state
  user.state.activeTradingBots = activeBots;
  user.state.completedTradingBots = completedBots;

  // Save the updated users array
  users[userIndex] = user;
  writeUsersToFile(users);

  res.status(200).json({ message: 'Bot moved to completed successfully!', movedBot });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
