//BASIC SETUP
//===============================================
var express = require('express'),
    app = express(),
    bodyParser = require('body-parser'),
    morgan = require('morgan'),
    mongoose = require('mongoose'),
    jwt = require('jsonwebtoken'),
    superSecret = 'fsayieuygiuvfugvuyctf23rj54376fkh@&^&^THGftdfjhsdhvi',
    port = process.env.PORT || 9000;

var User = require('./models/user');

//connect to database
mongoose.connect('mongodb://localhost:27017/app');

//APP CONFIGURATION -----------------------------
//body parser grabbing information from POST requests
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

//config to handle CORS requests
app.use(function(req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type, \
 Authorization');
 next();
});

//logging all requests to the console
app.use(morgan('dev'));


//ROUTES FOR API
//================================

//basic route for the index
app.get('/',function(req,res){
  res.send('Home page');
});

var apiRouter = express.Router();


//route for authentication
apiRouter.post('/authenticate', function(req,res){
  //find the user
  //select the name username and password explicitly
  User.findOne({
    username: req.body.username
  }).select('name username password').exec(function(err, user){
    if(err) throw err;

    //no user with that username was found
    if(!user){
      res.json({
        success: false,
        message: 'Authenication failed. User not found.'
      });
    }else if(user){

      //check is password matches
      var validPassword = user.comparePassword(req.body.password);
      if(!validPassword){
        res.json({
          success: false,
          message: 'Authenication failed. Wrong password.'
        });
      }else{

        //if user is found and password is correct
        //create a token
        var token = jwt.sign({
          name: user.name,
          username: user.username
        }, superSecret,{
          expiresIn: '24h' //set expiration time to 24 hours
        });

        //return the info including token in JSON

        res.json({
          success:true,
          message: 'Auth Success!',
          token: token
        });
      }
    }
  });
});

//middleware to verify a token
apiRouter.use(function(req,res,next){

//check header or url parameters or post parameters for token
var token = req.body.token || req.query.token || req.headers['x-access-token'];

//decode token
if(token){

  //verify secret and checks expiration
  jwt.verify(token, superSecret, function(err, decoded){
    if(err){
      return res.status(403).send({
        success: false,
        message: 'Failed to authenticate token.'
      });
    }else{
      //save to request for use in other routes
      req.decoded = decoded;
      next();
    }
  });
}else{
  //if no token return HTTP 403(access forbidden)
  return res.status(403).send({
    success: false,
    message: 'No token provided.'
  });
}
  //debug
  //console.log('Visitor');
  //next();
});

// access GET http://localhost:9000/api
apiRouter.get('/', function(req,res){
  res.json({message: 'testing working'});
});

//other routes here

//routes with /users
//--------------------------------------
apiRouter.route('/users')
    //user creation POST http://localhost:9000/api/users
    .post(function(req,res){
      //User model instance
      var user = new User();

      //user info
      user.name = req.body.name;
      user.username = req.body.username;
      user.password = req.body.password;

      //save user and error callback
      user.save(function(err){
        if(err){
          //duplication entry
          if(err.code==11000)
            return res.json({ success: false, message: 'A user with that\ username already exists. '});
          else
            return res.send(err);
        }
        res.json({message: 'User created!'});
      });
    })

//get all users GET http://localhost:9000/api/users
    .get(function(req,res){
      User.find(function(err, users){
        if(err)res.send(err);

        //return the users
        res.json(users);
      });
    });

//routes with /users/:user_id
//--------------------------------------
apiRouter.route('/users/:user_id')

  //get user with id GET http://localhost:9000/api/users/:user_id
  .get(function(req,res){
    User.findById(req.params.user_id, function(err,user){
      if(err) res.send(err);

      //return user
      res.json(user);
    });
  })

  //update user id PUT http://localhost:9000/api/users/:user_id
  .put(function(req,res){
    //find user with the user model
    User.findById(req.params.user_id, function(err,user){
      if(err)res.send(err);

      //update the user info only if its new
      if(req.body.name)user.name = req.body.name;
      if(req.body.username)user.username = req.body.username;
      if(req.body.password)user.password = req.body.password;

      //save the user
      user.save(function(err){
        if(err)res.send(err);

        //return a message
        res.json({message: 'User updated!'});
      });
    });
  })

  //delete the user with its id DELETE http://localhost:9000/api/users/:user_id
  .delete(function(req,res){
    User.remove({
      _id: req.params.user_id
    },function(err,user){
      if(err) return res.send(err);
      res.json({message: 'Successfully deleted'});
    });
  });

//api endpoint to get user info
apiRouter.get('/me',function(req,res){
  res.send(req.decoded);
});

//REGISTER ROUTES ----------------------
app.use('/api',apiRouter);


//START THE SERVER
//======================================
app.listen(port);
console.log('serving on http://localhost:'+port);
