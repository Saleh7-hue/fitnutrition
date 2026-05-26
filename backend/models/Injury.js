const mongoose = require('mongoose');

const InjurySchema = new mongoose.Schema({
  user:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true,index:true},
  title:{type:String,required:true},
  location:{type:String,enum:['knee','shoulder','wrist','ankle','back','neck','elbow','hip','other'],required:true},
  type:{type:String,enum:['sprain','strain','fracture','tendinitis','bruise','tear','other']},
  status:{type:String,enum:['active',recovering','healed','chronic'],default:'active'},
  recoveryPct:{type:Number,default:0,min:0,max:100},
  painLevel:{type:Number,min:0,max:10,default:5},
  description:String,cause:String,
  injuredAt:{type:Date,default:Date.now},
  healedAt:Date,dateKey:String,
},{timestamps:true});
InjurySchema.index({user:1,status:1});
module.exports=mongoose.model('Injury',InjurySchema);