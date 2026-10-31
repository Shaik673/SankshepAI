const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { MongoClient } = require('mongodb');

async function seedAdmin() {
  const envPath = path.resolve(__dirname, '../.env');
  const fsEnv = fs.readFileSync(envPath, 'utf8');
  const uriMatch = fsEnv.match(/MONGODB_URI=(.+)/);
  if (!uriMatch) {
    throw new Error('MONGODB_URI not found in backend/.env');
  }
  const mongoUri = uriMatch[1].trim();

  const client = new MongoClient(mongoUri);
  await client.connect();
  const db = client.db('test');

  const email = 'admin@sankshep.gov.in';
  const plainPassword = 'Admin#SankshepAI2026!';
  const passwordHash = await bcrypt.hash(plainPassword, 12);

  const existing = await db.collection('users').findOne({ email });
  let adminUserId = existing?._id;

  if (existing) {
    await db.collection('users').updateOne(
      { email },
      {
        $set: {
          fullName: 'System Administrator',
          passwordHash,
          role: 'admin',
          emailVerified: true,
          accountStatus: 'active',
          updatedAt: new Date(),
        },
      }
    );
    console.log('[SeedAdmin] Successfully updated existing admin user:', email);
  } else {
    const userDoc = {
      fullName: 'System Administrator',
      email,
      passwordHash,
      role: 'admin',
      emailVerified: true,
      accountStatus: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const res = await db.collection('users').insertOne(userDoc);
    adminUserId = res.insertedId;
    console.log('[SeedAdmin] Successfully created new admin user:', email);
  }

  // Ensure Profile exists
  const existingProfile = await db.collection('profiles').findOne({ userId: adminUserId });
  if (!existingProfile) {
    await db.collection('profiles').insertOne({
      userId: adminUserId,
      displayName: 'System Administrator',
      institution: 'Ministry of Electronics & IT / SankshepAI Lead',
      bio: 'Platform administrator overseeing government circular parsing, neural NLP models, and governance.',
      documentTypesOfInterest: ['government_circular', 'policy_document', 'official_gazette', 'news_report'],
      onboardingCompleted: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  } else {
    await db.collection('profiles').updateOne(
      { userId: adminUserId },
      { $set: { onboardingCompleted: true, displayName: 'System Administrator' } }
    );
  }

  // Ensure Settings exist
  const existingSettings = await db.collection('usersettings').findOne({ userId: adminUserId });
  if (!existingSettings) {
    await db.collection('usersettings').insertOne({
      userId: adminUserId,
      defaultStyle: 'executive',
      defaultLength: 'balanced',
      autoExtractKeyPoints: true,
      autoExtractEntities: true,
      allowGeminiFallback: true,
      defaultBeamWidth: 4,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // Test login through the actual running backend API to verify 100%
  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: plainPassword }),
  });
  const loginJson = await loginRes.json();
  console.log('[SeedAdmin] API Login Verification Status:', loginRes.status);
  console.log('[SeedAdmin] Login Success:', loginJson.success);
  console.log('[SeedAdmin] User Role:', loginJson.user?.role);
  console.log('[SeedAdmin] Email Verified:', loginJson.user?.emailVerified);

  await client.close();
}

seedAdmin().catch(console.error);
