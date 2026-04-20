import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { 
  getFirestore, 
  doc, 
  getDocFromServer, 
  initializeFirestore,
  enableNetwork,
  disableNetwork
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

export { firebaseConfig };

// Initialize Firebase SDK
const app = initializeApp(firebaseConfig);

// Use initializeFirestore with settings for better connectivity in sandbox environments
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
  // @ts-ignore - Disabling fetch streams improves stability in some proxy/sandbox environments
  useFetchStreams: false,
}, firebaseConfig.firestoreDatabaseId || '(default)');

export const auth = getAuth(app);

// Lazy initialize storage to avoid crash if service not enabled in console
let storageInstance: any;
try {
  // Use explicit bucket URL with gs:// prefix for better stability
  const bucketUrl = firebaseConfig.storageBucket ? `gs://${firebaseConfig.storageBucket}` : undefined;
  storageInstance = getStorage(app, bucketUrl);
} catch (error) {
  console.warn('Firebase Storage is not available. Ensure it is enabled in the Firebase Console.', error);
}

export const storage = storageInstance;

export async function refreshFirebaseConnection() {
  try {
    await disableNetwork(db);
    await enableNetwork(db);
    return true;
  } catch (error) {
    return false;
  }
}

// Error handling types
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errMessage = error instanceof Error ? error.message : String(error);
  
  // Log only the essentials or keep it silent in production-like environments
  if (errMessage.includes('permission-denied') || errMessage.includes('Missing or insufficient permissions')) {
    console.error(`Status: Access Denied to ${path} during ${operationType}`);
  }

  throw new Error(errMessage);
}

// Test connection
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    // Silent catch
  }
}

testConnection();
