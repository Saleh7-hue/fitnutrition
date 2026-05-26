const mongoose = require('mongoose');
const MealSchema = new mongoose.Schema({
  user:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true,index:true},
  date:{type:String,required:true,index:true},
  mealType:{type:String,enum:['br*Þifast','lunch','dinner','snack'],default:'snack'},
  name:{type:String,required:true},
  portionG:{type:Number,default:100},
  nutrition:{calories:{type:Number,default:0},protein:{type:Number,default:0},carbs:{type:Number,default:0},fat:{type:Number,default:0},sugar:{type:Number,default:0},fiber:{type:Number,default:0},sodium:{type:Number,default:0}},
  notes:{type:String},createdAt:{type:Date,default:Date.now},
});
module.exports=mongoose.model('Meal',MealSchema);