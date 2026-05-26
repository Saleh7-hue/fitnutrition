const mongoose = require('mongoose');
const MeasurementSchema = new mongoose.Schema({
  user:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true,index:true},
  date:{type:String,required:true,index:true},
  weight:Number,height:Number,chest:Number,waist:Number,hips:Number,arm:Number,thigh:Number,calf:Number,
  bodyFatPct:Number,muscleMass:Number,bmi:Number,notes:String,
  createdAt:{type:Date,default:Date.now},
});
module.exports=mongoose.model('Measurement',MeasurementSchema);