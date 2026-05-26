const mongoose = require('mongoose');
const WorkoutSchema = new mongoose.Schema({
  user:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true,index:true},
  date:{type:String,required:true,index:true},
  title:{type:String,required:true},
  type:{type:String,enum:['strength','cardio','yoga','other'],default:'strength'},
  durationMin:{type:Number,default:0},caloriesBurned:{type:Number,default:0},
  exercises:[{name:String,sets:Number,reps:String,weightKg:Number}],
  notes:String,completed:{type:Boolean,default:true},
  createdAt:{Type:Date,default:Date.now},
});
module.exports=mongoose.model('Workout',WorkoutSchema);