/**
 * Run once to create the admin user:
 *   node scripts/seedAdmin.js
 */
require('dotenv').config({ path: require('path').join(__dirname,'../.env') });
const mongoose = require('mongoose');
const User     = require('../models/User');

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const existing = await User.findOne({ email: process.env.ADMIN_EMAIL });
    if (existing) {
      console.log('⚠️  Admin user already exists:', existing.email);
      return process.exit(0);
    }

    const admin = await User.create({
      name:     process.env.ADMIN_NAME     || 'Admin',
      email:    process.env.ADMIN_EMAIL    || 'admin@fitnutrition.com',
      password: process.env.ADMIN_PASSWORD || 'Admin@FitNutrition2025!',
      role:     'admin',
      isActive: true,
    });

    console.log('');
    console.log('╔═══════════════════════════════════════╗');
    console.log('║        ✅ Admin Created Successfully   ║');
    console.log('╠═══════════════════════════════════════╣');
    console.log(`║  Email:    ${admin.email.padEnd(28)}║`);
    console.log(`║  Password: ${(process.env.ADMIN_PASSWORD||'Admin@FitNutrition2025!').padEnd(28)}║`);
    console.log(`║  Role:     admin                      ║`);
    console.log('╚═══════════════════════════════════════╝');
    console.log('');
    console.log('🔐 Login at: /admin/index.html');

    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  }
}

seed();
