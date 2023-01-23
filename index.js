const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const bodyParser = require('body-parser');
const mongoose = require("mongoose");
mongoose.set('strictQuery', true);
const async = require('async')

const Database = require("../database.js");
const MONGO_URI = process.env['MONGO_URI']
new Database(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

const logSchema = new mongoose.Schema({
  description: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    required: true
  },
  date: {
    type: String
  }
}, {_id: false})
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  log: [{
    type: logSchema
  }]
})
const user = new mongoose.model("user", userSchema)

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.use('/api/users', bodyParser.urlencoded({ extended: false }));
app.post("/api/users", (req, res) => {
  const username = req.body.username
  console.log(username)
  new user({
    username: username
    /*,
    log: [{
      description: "a simple description",
      duration: 1
    }]*/
  }).save((err, data) => {
    if (err) {
      console.log("Error on saving database entry")
      console.log(err)
      return
    }
    console.log("Databse entry successfully saved")
    console.log(data)
    res.json({username: data.username, _id: data._id})
  })
})

app.get("/api/users", (req, res) => {
  user.find({}).select({__v: 0, log: 0}).exec((err, users) => {
    if (err) {
      console.log("Error on saving database entry")
      console.log(err)
      return
    }
    res.json(users)
  })
})

app.post("/api/users/:_id/exercises", (req, res) => {
  const id = req.params._id
  let {description, duration, date} = req.body
  console.log(description, duration, date)

  user.findOne({_id: id}).exec((err, user) => {
    if (err) {
      console.log("Error on saving database entry")
      console.log(err)
      return
    }
    console.log(user)
    if (!date) {
      date = new Date().toDateString()
    }
    else {
      date = new Date(date).toDateString()
    }
    console.log("user is" + user)
    let newLog = {
      description: description,
      duration: Number(duration),
      date: date
    }
    user.log.push(newLog)
    user.save((err, updatedUser) => {
      if (err) {
        console.log(err); console.log("Error occured on updating user")
        res.json({error: "Error on updating user"})
        return
      }
      console.log("Updated user successfully")
    })
    res.json({username: user.username, ...newLog, _id: id})
  })
  //console.log(id, description, duration)
})

app.get("/api/users/:_id/logs", (req, res) => {
  const _id = req.params._id
  let to = req.query.to
  let from = req.query.from
  let limit = req.query.limit
  if (to) {
    to = new Date(to)
    console.log(to)
  }
  if (from) {
    from = new Date(from)
    console.log(from)
  }
  let logs;
  /*const func = (x) => {
   console.log(Date.parse(x.date))
   return true
  }*/
   const func1 = (callback) => {
    user.findOne({_id}).select({log: 1, _id: 0}).limit(2).exec((err, data) => {
    logs = data.log.filter(x => {
      console.log("In")
      let date = new Date(x.date)
      if (from && date < from) {
        console.log("here 1")
        return false
      }
      if (to && date > to) {
        console.log("here 2")
        return false
      }
      return true
      }).sort((x , y) => {
        let date1 = new Date(x.date)
        let date2 = new Date(y.date)
        return date1 - date2
      })
      if (limit) {
        logs = logs.slice(0, limit) 
      }
      console.log(logs)
      callback(null, logs)
    })
  }
  const func2 = (logs, callback) => {
    console.log("Hereeee")
    user.findOne({_id}).exec((err, user) => {
      if (err) {
        console.log("Error on saving database entry")
        console.log(err)
        return
      }
      let count = user.log.length
      console.log("Hereeee")
      //res.json({username: user.username, count, _id, log: logs})
      callback(null, {username: user.username, count, _id, log: logs})
      //res.type('json').send(JSON.stringify({username: user.username, count, _id, log: user.log}, null, 2) + "\n");
      })
      //callback(null, "All done!")
  }
  async.waterfall([func1, func2], function(err, results) {
    if (err) return console.log(err)
    res.json(results)
    console.log(results)
  })
  /*function waterfall(funcs) {
    return funcs.reduce((acc, func) => acc.then(func), Promise.resolve());
  }*/
  //waterfall([func1, func2])
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
