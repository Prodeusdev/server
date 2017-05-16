var mongoose = require('mongoose'),
    Schema = mongoose.Schema;
    bcrypt = require('bcrypt-nodejs');

//user schema
var UserSchema = new Schema({
  name:String,
  username: {type:String, required:true,index:{unique:true}},
  password: {type:String, required:true, select: false}
});

//hashing password
UserSchema.pre('save', function(next){
  var usr = this;
  //hash only password has cahnged or is new
  if (!usr.isModified('password')) return next();

  //generate the hash
  bcrypt.hash(usr.password, null,null,function(err,hash){
    if(err) return next(err);

    //cahnge password to hashed version
    usr.password = hash;
    next();
  });
});

//compare input pass to database hash
UserSchema.methods.comparePassword = function(password){
  var user = this;
  return bcrypt.compareSync(password,user.password);
};

//return the model
module.exports= mongoose.model('User', UserSchema);
