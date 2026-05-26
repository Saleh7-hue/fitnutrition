# 🏋️ FitNutrition — منصة اللياقة والتغذية

منصة متكاملة للأنظمة الغذائية، التمارين الرياضية، تتبع القياسات، وتحليل الطعام بالذكاء الاصطناعي.

---

## 📁 هيكل المشروع

```
fitnutrition/
├── frontend/
│   └── index.html          ← الواجهة الأمامية (HTML/CSS/JS)
├── admin/
│   └── index.html          ← لوحة تحكم المدير
├── backend/
│   ├── server.js           ← خادم Express الرئيسي
│   ├── package.json        ← المكتبات والاعتمادات
│   ├── render.yaml         ← إعدادات Render.com
│   ├── .env.example        ← قالب متغيرات البيئة
│   ├── models/             ← نماذج MongoDB
│   │   ├── User.js
│   │   ├── Meal.js
│   │   ├── Measurement.js
│   │   ├── Workout.js
│   │   ├── WaterLog.js
│   │   └── Injury.js
│   ├── routes/             ← مسارات API
│   │   ├── auth.js         ← تسجيل / دخول / الملف الشخصي
│   │   ├── meals.js        ← الوجبات وتحليل الطعام
│   │   ├── food.js         ← قاعدة بيانات الأطعمة
│   │   ├── measurements.js ← قياسات الجسم
│   │   ├── water.js        ← تتبع الماء
│   │   ├── workouts.js     ← جلسات التمرين
│   │   ├── injuries.js     ← الإصابات والتعافي
│   │   ├── reports.js      ← التقارير اليومية/الأسبوعية/الشهرية
│   │   └── admin.js        ← إدارة المستخدمين
│   ├── middleware/
│   │   ├── auth.js         ← التحقق من JWT
│   │   └── admin.js        ← التحقق من صلاحية المدير
│   └── scripts/
│       └── seedAdmin.js    ← إنشاء حساب المدير الأول
├── .github/workflows/
│   └── deploy.yml          ← GitHub Actions (نشر تلقائي)
├── setup.bat               ← سكريبت إعداد Windows
├── setup.sh                ← سكريبت إعداد Mac/Linux
└── .gitignore
```

---

## 🚀 خطوات النشر (من الصفر)

### الخطوة 1 — إنشاء قاعدة بيانات MongoDB Atlas

1. اذهب إلى https://www.mongodb.com/atlas/database
2. أنشئ حساباً مجانياً
3. اختر **Free Tier (M0)**، المنطقة الأقرب إليك
4. في **Database Access**: أنشئ مستخدماً جديداً (احفظ اسم المستخدم وكلمة المرور)
5. في **Network Access**: أضف `0.0.0.0/0` (للسماح بكل IP)
6. انسخ **Connection String** بهذا الشكل:
   ```
   mongodb+srv://USERNAME:PASSWORD@cluster0.xxxxx.mongodb.net/fitnutrition
   ```

---

### الخطوة 2 — رفع الكود على GitHub

```bash
# ويندوز: شغّل setup.bat
# ماك/لينكس: شغّل ./setup.sh

# أو يدوياً:
cd fitnutrition
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/fitnutrition.git
git push -u origin main
```

---

### الخطوة 3 — نشر الـ Backend على Render

1. اذهب إلى https://render.com وسجّل دخول بحساب GitHub
2. اضغط **New → Web Service**
3. اختر مستودعك `fitnutrition`
4. الإعدادات:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free
5. أضف **Environment Variables**:
   ```
   MONGO_URI=mongodb+srv://...
   JWT_SECRET=اختار_كلمة_سرية_طويلة_عشوائية
   JWT_EXPIRES_IN=7d
   NODE_ENV=production
   FRONTEND_URL=https://YOUR_USERNAME.github.io
   ADMIN_EMAIL=admin@fitnutrition.com
   ADMIN_PASSWORD=Admin@2024!
   ADMIN_NAME=المدير
   ```
6. اضغط **Deploy** وانتظر حتى يظهر **Live**
7. انسخ رابط API: `https://fitnutrition-api.onrender.com`

---

### الخطوة 4 — إنشاء حساب المدير

في Render → Shell:
```bash
npm run seed
```
سيظهر:
```
╔══════════════════════════════╗
║     Admin Created!           ║
║  Email: admin@fitnutrition   ║
║  Pass:  Admin@2024!          ║
╚══════════════════════════════╝
```

---

### الخطوة 5 — ربط الـ API بالواجهة

في `frontend/index.html` ابحث عن:
```javascript
apiUrl: 'http://localhost:3000/api'
```
وغيّرها إلى:
```javascript
apiUrl: 'https://fitnutrition-api.onrender.com/api'
```

كذلك في `admin/index.html`:
```javascript
let API_URL = 'https://fitnutrition-api.onrender.com/api';
```

---

### الخطوة 6 — نشر الـ Frontend على GitHub Pages

1. في GitHub → Settings → Pages → Source: **GitHub Actions**
2. ادفع أي تعديل وسيتم النشر تلقائياً
3. رابط الموقع: `https://YOUR_USERNAME.github.io/fitnutrition/`
4. رابط لوحة التحكم: `https://YOUR_USERNAME.github.io/fitnutrition/admin/`

---

### الخطوة 7 — ربط Deploy Hook (اختياري)

1. Render → Settings → Deploy Hook → انسخ الرابط
2. GitHub → Settings → Secrets → `RENDER_DEPLOY_HOOK` → الصق الرابط

---

## 🔑 بيانات دخول المدير الافتراضية

```
Email:    admin@fitnutrition.com
Password: Admin@2024!
Panel:    /admin/
```
> مهم: غيّر كلمة المرور فور أول دخول!

---

## 🔌 نقاط API الرئيسية

| الطريقة | المسار | الوصف |
|--------|--------|-------|
| POST | /api/auth/register | تسجيل مستخدم جديد |
| POST | /api/auth/login | تسجيل الدخول |
| GET  | /api/auth/me | بيانات المستخدم |
| POST | /api/meals/analyze | تحليل صورة الطعام |
| GET  | /api/meals?date=YYYY-MM-DD | وجبات اليوم |
| POST | /api/measurements | إضافة قياس |
| POST | /api/water | تحديث الماء |
| POST | /api/workouts | إضافة تمرين |
| POST | /api/injuries | تسجيل إصابة |
| GET  | /api/reports/daily/:date | تقرير يومي |
| GET  | /api/reports/weekly | تقرير أسبوعي |
| GET  | /api/reports/monthly | تقرير شهري |
| GET  | /api/admin/stats | إحصائيات الإدارة |
| GET  | /api/admin/users | قائمة المستخدمين |
| GET  | /api/admin/export | تصدير البيانات |

---

## 💻 تشغيل محلي

```bash
cd backend
npm install
cp .env.example .env
# عدّل .env وأضف MONGO_URI
npm run dev
# ثم افتح frontend/index.html في المتصفح
```

---

## 🛠️ التقنيات المستخدمة

**Backend**: Node.js · Express.js · MongoDB · Mongoose · JWT · bcryptjs · Cloudinary · Helmet

**Frontend**: HTML5 · CSS3 · Vanilla JS · Chart.js · Offline-first localStorage

**DevOps**: GitHub Actions · Render.com · GitHub Pages
