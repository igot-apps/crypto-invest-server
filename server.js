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
  console.log(req.body);

  const users = readUsersFromFile();
  const userIndex = users.findIndex(user => user.email === email);

  if (userIndex === -1) {
    return res.status(404).json({ message: 'User not found!' });
  }

  const updatedUser = { ...users[userIndex],state };
  users[userIndex] = updatedUser;
  writeUsersToFile(users);

  res.status(200).json({ message: 'User updated successfully!', updatedUser });
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

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
