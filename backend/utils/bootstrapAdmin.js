const bcrypt = require('bcryptjs');
const User = require('../models/User');

async function bootstrapAdmin() {
  const adminEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || '';
  const adminName = (process.env.ADMIN_NAME || 'PointMarket Admin').trim();

  if (!adminEmail || !adminPassword) {
    return;
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12);
  const existingUser = await User.findOne({ email: adminEmail });

  if (!existingUser) {
    await User.create({
      name: adminName,
      email: adminEmail,
      passwordHash,
      role: 'admin',
      status: 'active',
      emailVerified: true,
    });
    console.log(`Admin account created for ${adminEmail}`);
    return;
  }

  let changed = false;

  if (existingUser.role !== 'admin') {
    existingUser.role = 'admin';
    changed = true;
  }

  if (existingUser.status !== 'active') {
    existingUser.status = 'active';
    changed = true;
  }

  if (process.env.ADMIN_RESET_ON_BOOT === 'true') {
    existingUser.passwordHash = passwordHash;
    changed = true;
  }

  if (changed) {
    await existingUser.save();
    console.log(`Admin account updated for ${adminEmail}`);
  }
}

module.exports = {
  bootstrapAdmin,
};
