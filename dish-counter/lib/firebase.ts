import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

export interface MealRecord {
  id?: string;
  date: string;
  employeeId: string;
  mealType: 'MORNING' | 'EVENING';
  counterId: number;
  timestamp: string;
}

// ============================================
// Check if employee already ate TODAY
// ============================================
export async function checkEmployeeExists(employeeId: string): Promise<{
  exists: boolean;
  mealType?: string;
  counterId?: number;
  error?: string;
}> {
  try {
    const today = new Date().toISOString().split('T')[0];
    console.log(`[CHECK] Looking for ${employeeId} on ${today}`);

    // Query: Find if employee exists in 'active' collection for today
    const q = query(
      collection(db, 'active'),
      where('employeeId', '==', employeeId),
      where('date', '==', today)
    );

    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      const data = doc.data();
      console.log(`✅ FOUND: ${employeeId} already has ${data.mealType} meal`);
      return {
        exists: true,
        mealType: data.mealType,
        counterId: data.counterId,
      };
    }

    console.log(`✅ OK: ${employeeId} can eat`);
    return { exists: false };

  } catch (error) {
    console.error('❌ Error checking employee:', error);
    return { exists: false, error: 'Failed to check status' };
  }
}

// ============================================
// Save meal to ACTIVE collection
// ============================================
export async function saveMealRecord(
  employeeId: string,
  mealType: 'MORNING' | 'EVENING',
  counterId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const timestamp = new Date().toISOString();

    console.log(`[SAVE] Saving ${employeeId} - ${mealType} - Counter ${counterId}`);

    // Double-check: Employee doesn't already exist
    const check = await checkEmployeeExists(employeeId);
    if (check.exists) {
      console.log(`❌ BLOCKED: ${employeeId} already has meal`);
      return {
        success: false,
        error: `Employee ${employeeId} already has ${check.mealType} meal today`,
      };
    }

    // Add to 'active' collection
    await addDoc(collection(db, 'active'), {
      employeeId,
      date: today,
      mealType,
      counterId,
      timestamp,
    });

    console.log(`✅ SAVED: ${employeeId} meal record added`);
    return { success: true };

  } catch (error) {
    console.error('❌ Error saving meal:', error);
    return { success: false, error: 'Failed to save meal record' };
  }
}

// ============================================
// Get TODAY'S meals (Active collection)
// ============================================
export async function getTodayMeals(): Promise<MealRecord[]> {
  try {
    const today = new Date().toISOString().split('T')[0];
    console.log(`[TODAY] Getting meals for ${today}`);

    const q = query(
      collection(db, 'active'),
      where('date', '==', today)
    );

    const querySnapshot = await getDocs(q);
    const meals: MealRecord[] = [];

    querySnapshot.forEach((doc) => {
      meals.push({
        id: doc.id,
        ...doc.data(),
      } as MealRecord);
    });

    console.log(`✅ TODAY: ${meals.length} employees ate today`);
    return meals.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  } catch (error) {
    console.error('❌ Error fetching today meals:', error);
    return [];
  }
}

// ============================================
// Get employee HISTORY (Archive collection)
// ============================================
export async function getEmployeeHistory(employeeId: string): Promise<MealRecord[]> {
  try {
    console.log(`[HISTORY] Getting history for ${employeeId}`);

    const q = query(
      collection(db, 'archive'),
      where('employeeId', '==', employeeId)
    );

    const querySnapshot = await getDocs(q);
    const meals: MealRecord[] = [];

    querySnapshot.forEach((doc) => {
      meals.push({
        id: doc.id,
        ...doc.data(),
      } as MealRecord);
    });

    console.log(`✅ FOUND: ${meals.length} records for ${employeeId}`);
    return meals.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  } catch (error) {
    console.error('❌ Error fetching history:', error);
    return [];
  }
}

// ============================================
// AUTO-ARCHIVE: Move yesterday → archive, clear active
// ============================================
export async function archiveYesterdayData(): Promise<{
  success: boolean;
  archived: number;
  error?: string;
}> {
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayDate = yesterday.toISOString().split('T')[0];

    console.log(`\n🗃️ [ARCHIVE] Starting archive for ${yesterdayDate}`);

    // Get yesterday's records from 'active'
    const q = query(
      collection(db, 'active'),
      where('date', '==', yesterdayDate)
    );

    const querySnapshot = await getDocs(q);
    let archivedCount = 0;

    // Use batch to move records
    const batch = writeBatch(db);

    querySnapshot.forEach((doc) => {
      const data = doc.data();

      // Add to archive
      batch.set(collection(db, 'archive').doc(), {
        ...data,
        archivedAt: Timestamp.now(),
      });

      // Delete from active
      batch.delete(doc.ref);
      archivedCount++;
    });

    // Commit batch
    await batch.commit();

    console.log(`✅ [ARCHIVE] SUCCESS: Archived ${archivedCount} records`);

    // Update config with last archive timestamp
    const today = new Date().toISOString().split('T')[0];
    const configRef = doc(db, 'config', 'lastArchive');
    await batch.update(configRef, {
      date: today,
      timestamp: Timestamp.now(),
    });

    return { success: true, archived: archivedCount };

  } catch (error) {
    console.error('❌ [ARCHIVE] Error:', error);
    return { success: false, archived: 0, error: 'Archive failed' };
  }
}

// ============================================
// Check if archive is needed TODAY
// ============================================
export async function shouldArchive(): Promise<boolean> {
  try {
    const configRef = doc(db, 'config', 'lastArchive');
    const configSnap = await getDocs(query(collection(db, 'config')));

    let lastArchiveDate = null;
    configSnap.forEach((doc) => {
      if (doc.id === 'lastArchive') {
        lastArchiveDate = doc.data().date;
      }
    });

    const today = new Date().toISOString().split('T')[0];

    if (!lastArchiveDate || lastArchiveDate !== today) {
      console.log(`⏰ [CHECK] Archive needed (Last: ${lastArchiveDate}, Today: ${today})`);
      return true;
    }

    return false;

  } catch (error) {
    console.error('[CHECK] Error:', error);
    return false;
  }
}

// ============================================
// Initialize archive schedule (midnight)
// ============================================
export function initializeArchiveSchedule() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 1, 0);

  const timeUntilMidnight = tomorrow.getTime() - now.getTime();

  console.log(`⏰ [SCHEDULER] Next archive in ${Math.floor(timeUntilMidnight / 1000 / 60)} minutes`);

  setTimeout(async () => {
    console.log('🌙 [SCHEDULER] Midnight! Running daily archive...');
    await archiveYesterdayData();

    setInterval(async () => {
      console.log('🌙 [SCHEDULER] Midnight! Running daily archive...');
      await archiveYesterdayData();
    }, 24 * 60 * 60 * 1000);
  }, timeUntilMidnight);
}