import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, getDocFromServer } from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";

// Initialize Firebase client
const app = initializeApp(firebaseConfig);

// CRITICAL: Must use firestoreDatabaseId from config as instructed
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Connection verification logic as requested in the Firebase Integration Skill constraints
async function verifyFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
    console.log("[Firebase client] Active connection to Firestore validated successfully.");
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.warn("[Firebase client] Client is offline. Please check your Firebase configuration or internet access.");
    } else {
      console.log("[Firebase client] Verification run completed.");
    }
  }
}

verifyFirestoreConnection();
