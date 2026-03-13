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
  getDoc,
  setDoc,
} from 'firebase/firestore';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  User
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCSmqy54aNGPmLoeBbXb2W-j7Z-MeQW1BQ",
  authDomain: "meal-manage-81047.firebaseapp.com",
  projectId: "meal-manage-81047",
  storageBucket: "meal-manage-81047.firebasestorage.app",
  messagingSenderId: "995919423248",
  appId: "1:995919423248:web:4018fe1c85e3f3640da795",
  measurementId: "G-0KYWEL4W47"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export {app};

// Authentication functions 
// SIGN-UP
export const signUp = async (email: string, password: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return { success: true, user: userCredential.user };
  } catch (error: any) {
    console.error('Error signing up:', error);
    return { success: false, error: error.message };
  }
};

// LOG-IN
export const logIn = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: userCredential.user };
  } catch (error: any) {
    console.error('Error logging in:', error);
    return { success: false, error: error.message };
  }
};

// LOG-OUT
export const logOut = async () => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error: any) {
    console.error('Error logging out:', error);
    return { success: false, error: error.message };
  }
};

// FORGOT-PASSWORD
export const forgotPassword = async (email: string) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (error: any) {
    console.error('Error sending password reset email:', error);
    return { success: false, error: error.message };
  }
};


export const onAuthStateChangedCallback = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};
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

    querySnapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data();

      // Add to archive
      const newDocRef = doc(collection(db, 'archive')); // Create a new document reference in the 'archive' collection
      batch.set(newDocRef, {
        ...data,
        archivedAt: Timestamp.now(),
      });

      // Delete from active
      batch.delete(docSnapshot.ref);
      archivedCount++;
    });

    // Commit batch
    await batch.commit();

    console.log(`✅ [ARCHIVE] SUCCESS: Archived ${archivedCount} records`);

    // Update config with last archive timestamp
    const today = new Date().toISOString().split('T')[0];
    const configRef = doc(db, 'config', 'lastArchive');
    const configBatch = writeBatch(db);
    configBatch.update(configRef, {
      date: today,
      timestamp: Timestamp.now(),
    });
    await configBatch.commit();

    return { success: true, archived: archivedCount };

  } catch (error) {
  console.error('❌ [ARCHIVE] Error:', error);
  return { success: false, archived: 0, error: 'Archive failed' };
 }
}
 



// ============================================
// Check if archive is needed TODAY
// ============================================
// export async function shouldArchive(): Promise<boolean> {
//   try {
//     const configRef = doc(db, 'config', 'lastArchive');
//     const configSnap = await getDocs(query(collection(db, 'config')));

//     let lastArchiveDate = null;
//     configSnap.forEach((doc) => {
//       if (doc.id === 'lastArchive') {
//         lastArchiveDate = doc.data().date;
//       }
//     });

//     const today = new Date().toISOString().split('T')[0];

//     if (!lastArchiveDate || lastArchiveDate !== today) {
//       console.log(`⏰ [CHECK] Archive needed (Last: ${lastArchiveDate}, Today: ${today})`);
//       return true;
//     }

//     return false;

//   } catch (error) {
//     console.error('[CHECK] Error:', error);
//     return false;
//   }
// }

export async function shouldArchive(): Promise<boolean> {
  try {
    const configRef = doc(db, 'config', 'lastArchive');  
    const configSnap = await getDoc(configRef);

    if (!configSnap.exists()) {
      await setDoc(configRef, {
        lastArchiveDate: new Date().toLocaleDateString(),
      });
      console.log('✅ Created lastArchive document');
      return true;
    }

    const lastArchiveDate = configSnap.data()?.lastArchiveDate;
    const today = new Date().toLocaleDateString();
    
    return lastArchiveDate !== today;
  } catch (error) {
    console.error('❌ Archive check error:', error);
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

// ============================================
// TODAY'S MENU MANAGEMENT
// ============================================
export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  available: boolean;
}

export async function setTodayMenu(items: MenuItem[]): Promise<{ success: boolean; error?: string }> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const menuRef = doc(db, 'menu', 'today');
    await setDoc(menuRef, {
      date: today,
      items,
      updatedAt: Timestamp.now(),
    });
    console.log(`✅ [MENU] Saved ${items.length} menu items for ${today}`);
    return { success: true };
  } catch (error: any) {
    console.error('❌ [MENU] Error saving menu:', error);
    return { success: false, error: error.message };
  }
}

export async function getTodayMenu(): Promise<MenuItem[]> {
  try {
    const menuRef = doc(db, 'menu', 'today');
    const menuSnap = await getDoc(menuRef);

    if (!menuSnap.exists()) {
      console.log('📋 [MENU] No menu set for today');
      return [];
    }

    const data = menuSnap.data();
    const today = new Date().toISOString().split('T')[0];

    if (data.date !== today) {
      console.log('📋 [MENU] Menu is from a previous day');
      return [];
    }

    console.log(`✅ [MENU] Found ${data.items?.length || 0} menu items`);
    return data.items || [];
  } catch (error) {
    console.error('❌ [MENU] Error fetching menu:', error);
    return [];
  }
}

// ============================================
// EMPLOYEE ORDERS
// ============================================
export interface OrderItem {
  menuItemId: string;
  name: string;
  quantity: number;
  price: number;
}

export interface Order {
  id?: string;
  uid: string;
  email: string;
  items: OrderItem[];
  total: number;
  date: string;
  timestamp: string;
  status: 'pending' | 'confirmed' | 'ready';
}

export async function placeOrder(
  uid: string,
  email: string,
  items: OrderItem[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Check if employee already ordered today
    const existing = await getMyTodayOrder(uid);
    if (existing) {
      return { success: false, error: 'You have already placed an order today' };
    }

    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    await addDoc(collection(db, 'orders'), {
      uid,
      email,
      items,
      total,
      date: today,
      timestamp: new Date().toISOString(),
      status: 'pending',
    });

    console.log(`✅ [ORDER] Order placed by ${email}`);
    return { success: true };
  } catch (error: any) {
    console.error('❌ [ORDER] Error placing order:', error);
    return { success: false, error: error.message };
  }
}

export async function getMyTodayOrder(uid: string): Promise<Order | null> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const q = query(
      collection(db, 'orders'),
      where('uid', '==', uid),
      where('date', '==', today)
    );
    const snap = await getDocs(q);

    if (snap.empty) return null;

    const docData = snap.docs[0];
    return { id: docData.id, ...docData.data() } as Order;
  } catch (error) {
    console.error('❌ [ORDER] Error fetching order:', error);
    return null;
  }
}

export async function getTodayOrders(): Promise<Order[]> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const q = query(
      collection(db, 'orders'),
      where('date', '==', today)
    );
    const snap = await getDocs(q);
    const orders: Order[] = [];
    snap.forEach((d) => {
      orders.push({ id: d.id, ...d.data() } as Order);
    });
    return orders;
  } catch (error) {
    console.error('❌ [ORDER] Error fetching orders:', error);
    return [];
  }
}