require('dotenv').config();
const express   = require('express');
const mongoose  = require('mongoose');
const cors      = require('cors');
const helmet    = require('helmet');
const morgan    = require('morgan');
const rateLimit = require('express-rate-limit');

const app = express();

/* ─── Security */
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use('/api/auth', rateLimit({ windowMs: 15*60*1000, max: 30 }));
app.use('/api/', rateLimit({ windowMs: 60*1000, max: 200 }));
const origins = (process.env.FRONTEND_URL || '').split(',').map(s=>s.trim()).filter(Boolean).concat(['http://localhost:3000','http://localhost:5500']);
app.use(cors({ origin:(o,cb)=>{if(!o)origin?cb(null,true):origins.some(x=>o.startsWith(x.replace(/\/$/,'')))?cb(null,true):cb(new Error('CORS'))}, credentials:true }));
app.options('*',cors());
app.use(express.json({limit:'15mb'}));
app.use(express.urlencoded({extended:true,limit:'15mb'}));
app.use('/api/auth',require('./routes/auth'));
app.use('/api/meals',require('./routes/meals'));
app.use('/api/food',require('./routes/food'));
app.use('/api/measurements',require('./routes/measurements'));
app.use('/api/water',require('./routes/water'));
app.use('/api/workouts',require('./routes/workouts'));
app.use('/api/injuries',require('./routes/injuries'));
app.use('/api/reports',require('./routes/reports'));
app.use('/api/admin',require('./routes/admin'));
app.get('/',(_,res)=>res.json({service:'FitNutrition API',version:'2.0.0',status:'running'}));
app.get('/health',(_,res)=>res.json({status: 'OK',time:new Date().toISOString()}));
app.use((req,res)=>res.status(404).json({success:false,message:'Not found'}));
app.use((err,_,res,n)=>res.status(err.status||500).json({success:false,message:err.message}));
const PORT=process.env.PORT||5000;
mongoose.connect(process.env.MONGO_URI,{serverSelectionTimeoutMS:10000}).then(()=>{console.log('MongoDB connected');app.listen(PORT,'0.0.0.0',()=>console.log('API running on' +PORT))}).catch(e=>{console.error(e);process.exit(1)});
module.exports=app;