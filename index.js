const express = require('express')
const app = express()
const cors = require('cors')
const mongoose = require('mongoose');
const mongodb = require('mongodb');
const bodyParser = require('body-parser');
require('dotenv').config();

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
const UserSchema = new mongoose.Schema({
  username: String,
});

const User = mongoose.model('User',UserSchema);

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

// Get all users
app.get('/api/users', async (req, res) => {
  try{
    const users = await User.find({});
    if(users.length == 0){
      return res.status(404).json({ error: 'No users found' });
    }
    res.status(200).json(users);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: 'Sever error...' });
  }
  
});

// Delete all users
app.get('/api/users/delete', async (req, res) => {
  try{
    await User.deleteMany({});
    await Exercise.deleteMany({});
    res.status(200).json({ message: 'Successfully deleted' });
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
      userId: userExist._id, 
      username: userExist.username,
      description: description,
      duration: parseInt(duration), 
      date: date ? new Date(date) : new Date(),
    });

    const data = await newExercise.save();
    res.status(201).json({ 
      username: userExist.username, 
      description: data.description,
      duration: data.duration, 
      date: new Date(data.date).toDateString(),
      _id: data.userId, 
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({ error: 'Sever error...' });
  }  
});

// Get exercise logs
app.get("/api/users/:_id/logs", async (req, res) => {
  try{
    const userId = req.params._id;
    const from = req.query.from || new Date(0);
    const to = req.query.to || new Date(Date.now());
    const limit = Number(req.query.limit) || 0;

    const user =await User.findById(userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' })
      return;
    }
    let parsedDatesLog = {}

    if (from){
      parsedDatesLog["$gte"] = new Date(from)
    }
    if (to){
      parsedDatesLog["$lte"] = new Date(to)
    }

    let filter = { userId: userId }
    if(from || to){
      filter.date = parsedDatesLog;
    }
    let exercises = await Exercise.find(filter).select("-_id -userId -_v");
    if (limit > 0) {
      exercises = exercises.slice(0, limit);
    }

    const log = exercises.map((exercise) => ({
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date.toDateString(),
    }));
    
    res.status(200).json({
      username: user.username, 
      count: exercises.length, 
      _id: user._id, 
      log
    });
    console.log(from, to, limit);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: 'Sever error...' });
  }  
});


const listener = app.listen(process.env.PORT || 3050, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
