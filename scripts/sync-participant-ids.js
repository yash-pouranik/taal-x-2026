/**
 * Safe 2-Phase Participant ID & CountNumber Sync Script
 *
 * Usage:
 *   node scripts/sync-participant-ids.js --dry-run
 *   node scripts/sync-participant-ids.js --execute
 *   node scripts/sync-participant-ids.js --uri="mongodb+srv://..." --execute
 */

const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Parse CLI arguments
const args = process.argv.slice(2);
const isExecute = args.includes('--execute');
const isDryRun = !isExecute; // Default to dry-run unless --execute is explicitly specified

const uriArg = args.find((a) => a.startsWith('--uri='));
const customUri = uriArg ? uriArg.slice('--uri='.length).trim().replace(/^['"]|['"]$/g, '') : null;

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const mongoUri = customUri || process.env.MONGODB_URI;

if (!mongoUri) {
  console.error('❌ Error: MONGODB_URI is not defined in .env.local or via --uri parameter.');
  process.exit(1);
}

// Mask connection string for security logs
const maskedUri = mongoUri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');

async function runSync() {
  console.log('====================================================');
  console.log('🔄 NAVRATRI PARTICIPANT ID & COUNT SYNC TOOL');
  console.log('====================================================');
  console.log(`📡 Connecting to: ${maskedUri}`);
  console.log(`⚙️ Mode: ${isExecute ? '🚀 EXECUTE (LIVE UPDATES)' : '🔍 DRY-RUN (PREVIEW ONLY)'}`);
  console.log('----------------------------------------------------');

  await mongoose.connect(mongoUri);
  const col = mongoose.connection.db.collection('participants');

  const allDocs = await col.find({}).toArray();
  console.log(`📋 Total participants found in DB: ${allDocs.length}\n`);

  const mismatches = [];
  const targetIdCounts = new Map();

  for (const doc of allDocs) {
    let targetCount = doc.countNumber;
    let currentId = doc.participantId || '';

    // If countNumber is missing or invalid, extract it from participantId
    if (typeof targetCount !== 'number' || isNaN(targetCount) || targetCount <= 0) {
      const match = currentId.match(/^NAV-(\d+)$/i);
      if (match) {
        targetCount = parseInt(match[1], 10);
      } else {
        console.warn(`⚠️ Warning: Document ${doc._id} has unparseable ID '${currentId}' and no countNumber. Skipping.`);
        continue;
      }
    }

    const targetId = `NAV-${String(targetCount).padStart(3, '0')}`;

    // Track targets to ensure no two documents map to the same target ID
    const existingEntry = targetIdCounts.get(targetId);
    if (existingEntry) {
      console.error(`🚨 CONFLICT DETECTED: Document ${doc._id} (${doc.name}) and Document ${existingEntry._id} (${existingEntry.name}) both target ${targetId}!`);
      console.error('Halting sync to prevent data loss. Please resolve this conflict manually.');
      await mongoose.disconnect();
      process.exit(1);
    }
    targetIdCounts.set(targetId, doc);

    const idMismatch = currentId !== targetId;
    const countMismatch = doc.countNumber !== targetCount;

    if (idMismatch || countMismatch) {
      mismatches.push({
        _id: doc._id,
        name: doc.name,
        fatherName: doc.fatherName,
        currentId,
        targetId,
        currentCount: doc.countNumber,
        targetCount,
      });
    }
  }

  console.log(`🔎 Scan Complete: Found ${mismatches.length} records needing re-alignment.\n`);

  if (mismatches.length === 0) {
    console.log('✅ All participant records are already 100% in sync with their count numbers!');
    await mongoose.disconnect();
    return;
  }

  console.log('List of Mismatched Records:');
  console.log('----------------------------------------------------------------------');
  mismatches.forEach((m, idx) => {
    console.log(
      `${String(idx + 1).padStart(3, ' ')}. ${m.name.padEnd(20, ' ')} | Current: ${m.currentId.padEnd(9, ' ')} (#${m.currentCount || 'none'}) ➔ Target: ${m.targetId} (#${m.targetCount})`
    );
  });
  console.log('----------------------------------------------------------------------\n');

  if (isDryRun) {
    console.log('ℹ️ DRY-RUN COMPLETED: No changes were made to the database.');
    console.log('To apply these changes, run this command with the --execute flag:');
    console.log(`👉 node scripts/sync-participant-ids.js --execute\n`);
    await mongoose.disconnect();
    return;
  }

  // --- EXECUTE MODE: TWO-PHASE SAFE MIGRATION ---
  console.log('🚀 Starting Two-Phase Safe Migration to avoid unique index collisions...');

  // Phase 1: Move mismatched records to a temporary unique ID
  console.log('⏳ Phase 1: Assigning temporary unique IDs...');
  for (const m of mismatches) {
    const tempId = `TEMP-NAV-${m._id.toString()}`;
    await col.updateOne(
      { _id: m._id },
      { $set: { participantId: tempId, countNumber: m.targetCount } }
    );
  }
  console.log('✅ Phase 1 complete: All target slots are now freed.');

  // Phase 2: Assign final target participantId
  console.log('⏳ Phase 2: Assigning final target participantIds (NAV-XXX)...');
  for (const m of mismatches) {
    await col.updateOne(
      { _id: m._id },
      { $set: { participantId: m.targetId, countNumber: m.targetCount } }
    );
  }
  console.log('✅ Phase 2 complete: All records updated to target IDs.');

  // Phase 3: Final Verification
  console.log('⏳ Phase 3: Verifying database consistency...');
  const verifyDocs = await col.find({}).toArray();
  let verifiedCount = 0;
  let remainingMismatches = 0;

  for (const doc of verifyDocs) {
    const expectedId = `NAV-${String(doc.countNumber).padStart(3, '0')}`;
    if (doc.participantId === expectedId) {
      verifiedCount++;
    } else {
      remainingMismatches++;
      console.error(`❌ Inconsistency detected on ${doc._id}: ${doc.participantId} !== ${expectedId}`);
    }
  }

  console.log('\n====================================================');
  console.log('🎉 SYNC RESULTS SUMMARY');
  console.log('====================================================');
  console.log(`✅ Total Participants: ${verifyDocs.length}`);
  console.log(`✅ Successfully Re-aligned: ${mismatches.length}`);
  console.log(`✅ Fully Verified & In Sync: ${verifiedCount}`);
  console.log(`❌ Inconsistencies: ${remainingMismatches}`);
  console.log('====================================================\n');

  await mongoose.disconnect();
  console.log('📡 Database connection closed cleanly.');
}

runSync().catch(async (err) => {
  console.error('❌ Sync script encountered an unhandled error:', err);
  try {
    await mongoose.disconnect();
  } catch (_) {}
  process.exit(1);
});
