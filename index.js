const express = require('express')
const app = express()
const cors = require('cors')
const mongoose = require('mongoose');
const mongodb = require('mongodb');
const bodyParser = require('body-parser');
require('dotenv').config()

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.json());

// Connect to database
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

// Connect succesful
const connection = mongoose.connection;
connection.once('open', () => {
  console.log("MongoDB database connection established successfully");
});
// Connect failed
connection.on('error', console.error.bind(console, 'MongoDB connection error:')); 

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

// User schema
const userSchema = new mongoose.Schema({
  username: String,
});

const User = mongoose.model('User',userSchema);

// Exercise schema
const exerciseSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  description: { type: String, required: true },
  duration: { type: Number, min: 1, required: true },
  date: Date,
});

const Exercise = mongoose.model('Exercise',exerciseSchema);

// Create new user
app.post('/api/users', async (req, res) => {
  try{
    const { username } = req.body;

    const userExist = await User.findOne({ username: username });
    if (userExist) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    const newUser = new User({username: username});
    const data = await newUser.save();

    res.status(201).json({ username: data.username, _id: data._id });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: 'Sever error...' });
  }  
});

// Add exercise for a user
app.post('/api/users/:_id/exercises', async (req, res) => {
  try{
    const userId = req.params._id;
    const { description, duration, date } = req.body;

    const userExist = await User.findOne({ _id: userId});
    if (!userExist) {
      return res.status(404).json({ error: 'User not found' });
    }

    const newExercise = new Exercise({ 
      userId: userId, 
      description: description,
      duration: duration, 
      date: date ? new Date(date) : new Date(),
    });
    const data = await newExercise.save();
    res.status(201).json({ 
      username: data.username, 
      description: data.description,
      duration: data.duration, 
      _id: data.userId, 
      date: data.date.toDateString() 
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({ error: 'Sever error...' });
  }  
});

// Get exercise logs
app.get('/api/users/:_id/logs', async (req, res) => {
  try{
    const userId = req.params._id;
    const from = req.query.from ? new Date(req.query.from) : new Date(0);
    const to = req.query.to ? new Date(req.query.to) : new Date();
    const limit = req.query.limit ? parseInt(req.query.limit) : 0;

    const userExist = await User.findOne({ _id: userId});
    if (!userExist) {
      return res.status(404).json({ error: 'User not found' });
    }

    const exercises = await Exercise.find({ userId: userId, date: { $gte: from, $lte: to } }).limit(limit);
    const count = await Exercise.countDocuments({ userId: userId, date: { $gte: from, $lte: to } });

    res.status(200).json({username: userExist.username, _id: userExist._id, count: count, log: exercises});
  } catch (err) {
    res.status(500).json({ error: 'Sever error...' });
  }  
});


const listener = app.listen(process.env.PORT || 3050, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
