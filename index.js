var express = require("express");
const cookieParser = require("cookie-parser");
var bodyParser = require("body-parser");
var Mongoose = require("mongoose");
const { application, response } = require("express");
const mongoPass = process.env.mongoPass;

const app = express();
let shouldPlay = false;
app.use(express.static("public"));
app.use(cookieParser());

Mongoose.connect(`mongodb+srv://namita123:${mongoPass}@cluster0.b6ahf.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`, 
{
  useNewUrlParser: true,
});

app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

var db = Mongoose.connection;

app.post("/signup", (req, res) => {
  var name = req.body.name;
  var email = req.body.email;
  var password = req.body.password;

  var data = {
    name: name,
    email: email,
    password: password,
    highestScore: 0
  };

  db.collection("players").insertOne(data, (err, collection) => {
    if (err) {
      throw err;
    }
    console.log("Record Inserted Successfully");
  });

  return res.redirect("signupS.html");
});

app.get("/guest", (req, res) => {
  res.cookie('userEmail', "");
  res.redirect('game.html');
});

app.get('/getHS', async(req, res) => {
  let emailx  = req.query.userEmail;
  const obj = await db.collection("players").findOne({ email: emailx });
  const HS = obj.highestScore;
  res.send(obj);
  //res.send(req.query.hs + req.query.uname);
  });

  app.get('/setHS', async (req, res) => {
    await db.collection("players").updateOne({ email: req.query.userEmail }, {$set: {highestScore : req.query.score}});
    res.send("done");
  })

app.post("/signin", async (req, res) => {
  try 
  {
    const email1 = req.body.email;
    const password1 = req.body.password;
    const userEmail = await db.collection("players").findOne({ email: email1 });

 
    if (userEmail.password === password1) 
    {
      res.cookie('userEmail', email1);
      res.redirect('game.html');
     
      console.log("user valid and game started");
      
      shouldPlay = true;
    } 
    else 
    {
      console.log(userEmail.password);
      console.log("invalid user");
      res.redirect("SignInFailed.html");
      shouldPlay = false;
    }
  } 
  
  catch (error) 
  {
    console.log(error);
    res.redirect("SignInFailed.html");
  }

});




app.get("/signup", (req, res) => {
  return res.redirect("signup.html");
});

app.get("/game",(req,res)=>{
  return res.redirect("game.html");
})

app.get("/SignInFailed",(req,res)=>{
  return res.redirect("SignInFailed.html");
})
app
  .get("/", function (req, res) {
    res.redirect("index.html");
  })
  .listen(3000);

console.log("LISTENING TO PORT");