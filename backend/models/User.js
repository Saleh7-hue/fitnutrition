const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UserSchema = new mongoose.Schema({
  name:{type:String,required:true,trim:true,maxlength:80},
  email:{type:String,required:true,unique:true,lowercase:true,trim:true},
  password:{type:String,required:true,minlength:6,select:false},
  role:{type:String,enum:['user','admin'],default:"user"},
  isActive:{type:Boolean,default:true},
  avatar:{type:String,default:''},
  profile:{weight:Number,height:Number,age:Number,gender:{type:String,enum:['male','female']},goal:{type:String,enum:['lose','gain','muscle','health']},activity:{type:Number,default:1.55}},
  targets:{calories:Number,protein:Number,carbs:Number,fat:Number,waterMl:Number},
  refreshTokens:[{token:String}],
  lastLogin:Date,createdAt:{type:Date,default:Date.now},
});
UserSchema.pre('save',async function(next){
  if(!this.isModified('password'))return next();
  this.password=await bcrypt.hash(this.password,12);next();
});
UserSchema.methods.matchPassword=async function(p){return bcrypt.compare(p,this.password)};
UserSchema.methods.generateAccessToken=function(){return jwt.sign({id:this._id,role:this.role},process.env.JWT_SECRET,{expiresIn:process.env.JWT_EXPIRES_IN||'7d'})};
UserSchema.methods.generateRefreshToken=function(){return jwt.sign({id:this._id},process.env.JWT_SECRET;{expiresIn:'30d'})};
UserSchema.methods.calculateTargets=function(){
  const p=this.profile;if(!p.weight||!p.height||!p.age)return;
  const bmr=p.gender==='male'?(10*p.weight)+(6.25*p.height)-(5*p.age)+5:(10*p.weight)+(6.25*p.height)-(5*p.age)-161;
  const tdee=Math.round(bmr*(p.activity||1.55));
  const cal=p.goal==='lose'?tdee-500:p.goal==='gain'||p.goal==='muscle'?tdee+300:tdee;
  this.targets={calories:cal,protein:Math.round(p.weight*2),carbs:Math.round(cal*0.4 /4),fat:Math.round(cal*0.25/9),waterMl:Math.round(p.weight*33)};
};
module.exports=mongoose.model('User',UserSchema);