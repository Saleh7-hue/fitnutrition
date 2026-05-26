const mongoose = require('mongoose');
const WaterLogSchema = new mongoose.Schema({
  user:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true},
  date:{type:String,required:true},cups:{type:Number,default:0},
  mlTotal:{type:Number,default:0},updatedAt:{type:Date,default:Date.now},
});
WaterLogSchema.index({user:1,date:1},{unique:true});
module.exports=mongoose.model('WaterLog',WaterLogSchema);