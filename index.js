// Importing required modules
const express = require('express');
const app = express();
const cors = require('cors');
const bodyParser = require('body-parser');  // To parse form data
const mongoose = require('mongoose');
require('dotenv').config();

// Middleware
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static('public'));

// Connect to MongoDB (Make sure to replace with your DB URL if needed)
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost/exerciseTracker', { useNewUrlParser: true, useUnifiedTopology: true });

// Define the generateId function (replacing the use of uuid)
const generateId = () => Date.now().toString();

// Create the User schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  exercises: [{
    description: String,
    duration: Number,
    date: String
  }]
});

// Create the User model
const User = mongoose.model('User', userSchema);

// Routes
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// POST /api/users to create a new user
app.post('/api/users', (req, res) => {
  const { username } = req.body;

  // Check if username is provided
  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }

  const newUser = new User({
    username,
    exercises: []
  });

  newUser.save()
    .then(user => res.json({ username: user.username, _id: user._id }))
    .catch(err => res.status(500).json({ error: 'Failed to create user' }));
});

// GET /api/users to get a list of all users
app.get('/api/users', (req, res) => {
  User.find()
    .then(users => res.json(users))
    .catch(err => res.status(500).json({ error: 'Failed to retrieve users' }));
});

// POST /api/users/:_id/exercises to add exercises to a user
app.post('/api/users/:_id/exercises', (req, res) => {
  const userId = req.params._id;
  const { description, duration, date } = req.body;

  // Check if all required fields are provided
  if (!description || !duration) {
    return res.status(400).json({ error: 'Description and duration are required' });
  }

  const exercise = {
    description,
    duration: Number(duration),
    date: date ? new Date(date).toDateString() : new Date().toDateString()  // Default to current date if no date is provided
  };

  User.findById(userId)
    .then(user => {
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      user.exercises.push(exercise);
      return user.save();
    })
    .then(user => res.json({
      username: user.username,
      _id: user._id,
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date
    }))
    .catch(err => res.status(500).json({ error: 'Failed to add exercise' }));
});

// GET /api/users/:_id/logs to retrieve a full exercise log of a user
app.get('/api/users/:_id/logs', (req, res) => {
  const userId = req.params._id;
  const { from, to, limit } = req.query;

  let filter = {};
  if (from) filter.date = { $gte: new Date(from).toDateString() };
  if (to) filter.date = { ...filter.date, $lte: new Date(to).toDateString() };

  User.findById(userId)
    .then(user => {
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      let log = user.exercises.map(ex => ({
        description: ex.description,
        duration: ex.duration,
        date: new Date(ex.date).toDateString()
      }));

      if (from) log = log.filter(ex => new Date(ex.date) >= new Date(from));
      if (to) log = log.filter(ex => new Date(ex.date) <= new Date(to));
      if (limit) log = log.slice(0, parseInt(limit));

      res.json({
        username: user.username,
        _id: user._id,
        count: log.length,
        log
      });
    })
    .catch(err => res.status(500).json({ error: 'Failed to retrieve logs' }));
});

// Start server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`App is running on port ${port}`);
});
