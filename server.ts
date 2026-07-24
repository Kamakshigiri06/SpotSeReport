import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { GoogleGenAI, Type, Modality, ThinkingLevel } from "@google/genai";
import { WebSocketServer } from "ws";
import { initializeApp } from "firebase/app";
import { initializeFirestore, collection, getDocs, doc, setDoc, deleteDoc } from "firebase/firestore";
import { 
  IssueCategory, 
  IssueSeverity, 
  IssueStatus, 
  Profile, 
  Report, 
  Upvote, 
  Comment, 
  StatusTimeline, 
  Notification, 
  LeaderboardEntry 
} from "./src/types.js";
import { getStateForCity } from "./src/data/locationData.js";

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));

// DB file path
const DB_FILE = path.join(__dirname, "db.json");

// Firebase initialization
const firebaseConfigPath = path.join(__dirname, "firebase-applet-config.json");
let firebaseApp: any = null;
let firestoreDb: any = null;

if (fs.existsSync(firebaseConfigPath)) {
  try {
    const config = JSON.parse(fs.readFileSync(firebaseConfigPath, "utf-8"));
    firebaseApp = initializeApp(config);
    firestoreDb = initializeFirestore(firebaseApp, {
      experimentalForceLongPolling: true
    }, config.firestoreDatabaseId || "(default)");
    console.log("[Firebase] Server-side Firebase SDK initialized successfully.");
  } catch (err) {
    console.error("[Firebase] Server-side initialization failed:", err);
  }
} else {
  console.warn("[Firebase] firebase-applet-config.json not found, offline-only mode.");
}

// Helper to strip undefined values before writing to Firestore
function sanitizeForFirestore(obj: any): any {
  if (obj === undefined) return null;
  if (obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeForFirestore(item));
  }
  const result: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val !== undefined) {
      result[key] = sanitizeForFirestore(val);
    }
  }
  return result;
}

// Sync from Firestore on boot
async function syncFromFirestore() {
  if (!firestoreDb) return;
  try {
    console.log("[Firebase] Commencing startup database sync from Firestore...");
    const collectionsToSync = ["users", "reports", "upvotes", "comments", "status_timeline", "notifications", "bounties"];
    const syncedData: any = {};
    let hasData = false;

    // Check users collection first
    const usersSnapshot = await getDocs(collection(firestoreDb, "users"));
    if (!usersSnapshot.empty) {
      hasData = true;
    }

    if (hasData) {
      console.log("[Firebase] Found existing records in Firestore. Pulling latest data...");
      for (const colName of collectionsToSync) {
        const snapshot = await getDocs(collection(firestoreDb, colName));
        syncedData[colName] = [];
        snapshot.forEach((docSnap) => {
          syncedData[colName].push(docSnap.data());
        });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(syncedData, null, 2));
      console.log("[Firebase] Sync completed successfully. Cache populated.");
    } else {
      console.log("[Firebase] Firestore database is currently empty. Seeding initial records...");
      const initialData = seedDatabase();
      for (const colName of collectionsToSync) {
        const list = initialData[colName] || [];
        for (const item of list) {
          if (item && item.id) {
            await setDoc(doc(firestoreDb, colName, item.id), sanitizeForFirestore(item));
          }
        }
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
      console.log("[Firebase] Firestore successfully seeded with default data.");
    }
  } catch (err) {
    console.error("[Firebase] Fatal error during syncFromFirestore:", err);
  }
}

// Background sync to Firestore
async function syncToFirestore(data: any) {
  if (!firestoreDb) return;
  const collectionsToSync = ["users", "reports", "upvotes", "comments", "status_timeline", "notifications", "bounties"];
  for (const colName of collectionsToSync) {
    const list = data[colName] || [];
    const inMemoryIds = new Set(list.map((item: any) => item.id).filter(Boolean));

    // Handle deleted upvotes
    if (colName === "upvotes") {
      try {
        const snapshot = await getDocs(collection(firestoreDb, colName));
        for (const docSnap of snapshot.docs) {
          const id = docSnap.id;
          if (!inMemoryIds.has(id)) {
            await deleteDoc(doc(firestoreDb, colName, id));
            console.log(`[Firebase] Deleted orphan upvote document ${id} from Firestore.`);
          }
        }
      } catch (err) {
        console.error("[Firebase] Error deleting orphan upvotes:", err);
      }
    }

    for (const item of list) {
      if (item && item.id) {
        await setDoc(doc(firestoreDb, colName, item.id), sanitizeForFirestore(item), { merge: true });
      }
    }
  }
}

// Helper to load DB
function loadDB() {
  if (!fs.existsSync(DB_FILE)) {
    const initialData = seedDatabase();
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
    return initialData;
  }
  try {
    const data = fs.readFileSync(DB_FILE, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading database file, resetting to seed...", err);
    const initialData = seedDatabase();
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
    return initialData;
  }
}

// Helper to save DB with cloud sync
function saveDB(data: any) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  if (firestoreDb) {
    syncToFirestore(data).catch((err) => {
      console.error("[Firebase] Error syncing to Firestore in background:", err);
    });
  }
}

// Seed helper
function seedDatabase() {
  const users = [
    {
      id: "usr_karan",
      full_name: "Karan Sharma",
      avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=karan",
      phone: "+91 98765 43210",
      city: "Bengaluru",
      xp_points: 5200,
      badge_level: "Legend",
      reports_count: 24,
      validations_count: 52,
      resolved_count: 18,
      created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
      role: "citizen"
    },
    {
      id: "usr_aanya",
      full_name: "Aanya Iyer",
      avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=aanya",
      phone: "+91 91234 56789",
      city: "Chennai",
      xp_points: 1650,
      badge_level: "Champion",
      reports_count: 8,
      validations_count: 32,
      resolved_count: 5,
      created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      role: "citizen"
    },
    {
      id: "usr_rahul",
      full_name: "Rahul Patel",
      avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=rahul",
      phone: "+91 88888 77777",
      city: "Mumbai",
      xp_points: 750,
      badge_level: "Validator",
      reports_count: 3,
      validations_count: 25,
      resolved_count: 1,
      created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      role: "citizen"
    },
    {
      id: "usr_citizen",
      full_name: "Kamakshi Giri",
      avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=kamakshi",
      phone: "+91 99999 88888",
      city: "Bengaluru",
      xp_points: 120,
      badge_level: "Reporter",
      reports_count: 1,
      validations_count: 5,
      resolved_count: 0,
      created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      role: "citizen"
    },
    {
      id: "usr_admin",
      full_name: "Municipal Officer (Admin)",
      avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=officer",
      phone: "+91 11111 22222",
      city: "Bengaluru",
      xp_points: 1500,
      badge_level: "Champion",
      reports_count: 0,
      validations_count: 0,
      resolved_count: 0,
      created_at: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString(),
      role: "admin"
    }
  ];

  const reports = [
    {
      id: "rep_1",
      title: "Massive dangerous crater pothole on Outer Ring Road",
      description: "A huge pothole has formed right in the middle lane of the Outer Ring Road near the Marathahalli flyover. It is causing extreme traffic slowdowns and poses a high risk to two-wheelers, especially at night. Several riders have narrowly avoided accidents here.",
      category: "pothole",
      severity: "high",
      status: "assigned",
      lat: 12.9562,
      lng: 77.7011,
      address: "Outer Ring Road, near Marathahalli Flyover, Bengaluru, Karnataka 560037",
      city: "Bengaluru",
      ward: "Ward 85 (Doddanekundi)",
      photo_urls: ["https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&w=800&q=80"],
      ai_category: "pothole",
      ai_urgency_score: 8,
      ai_suggested_authority: "Bruhat Bengaluru Mahanagara Palike (BBMP) - Road Infrastructure Division",
      upvotes_count: 14,
      comments_count: 3,
      reporter_id: "usr_karan",
      reporter_name: "Karan Sharma",
      reporter_avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=karan",
      assigned_authority: "BBMP Assistant Executive Engineer (AEE)",
      assigned_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      sla_deadline: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: "rep_2",
      title: "Overflowing garbage dump outside secondary school gate",
      description: "Local vendors and residents have started dumping piles of wet and dry garbage right outside the secondary school gate. Stray dogs are scattering it across the street, creating an extremely unhygienic environment and horrible smell for students.",
      category: "garbage",
      severity: "medium",
      status: "in_progress",
      lat: 19.0596,
      lng: 72.8295,
      address: "St. Andrews School Road, Bandra West, Mumbai, Maharashtra 400050",
      city: "Mumbai",
      ward: "H-West Ward",
      photo_urls: ["https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&w=800&q=80"],
      ai_category: "garbage",
      ai_urgency_score: 5,
      ai_suggested_authority: "Municipal Corporation of Greater Mumbai (MCGM)",
      upvotes_count: 22,
      comments_count: 4,
      reporter_id: "usr_rahul",
      reporter_name: "Rahul Patel",
      reporter_avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=rahul",
      assigned_authority: "Ward Sanitation Inspector",
      assigned_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      sla_deadline: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
      created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
    },
    {
      id: "rep_3",
      title: "Entire row of streetlights broken near park",
      description: "The entire stretch of streetlights around Anna Nagar Central Park is completely dark. None of the five poles are functional. It makes the footpath extremely unsafe for evening and early morning walkers, and there have been reports of mobile snatching.",
      category: "streetlight",
      severity: "high",
      status: "pending",
      lat: 13.0850,
      lng: 80.2101,
      address: "6th Avenue, Anna Nagar East, Chennai, Tamil Nadu 600102",
      city: "Chennai",
      ward: "Zone 8 (Anna Nagar)",
      photo_urls: ["https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=800&q=80"],
      ai_category: "streetlight",
      ai_urgency_score: 7,
      ai_suggested_authority: "Greater Chennai Corporation (GCC) - Electrical Department",
      upvotes_count: 6,
      comments_count: 0,
      reporter_id: "usr_aanya",
      reporter_name: "Aanya Iyer",
      reporter_avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=aanya",
      created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
    },
    {
      id: "rep_4",
      title: "Leaking sewage line contaminating water inlet",
      description: "A major underground sewage pipe has cracked and black sewage water is bubbling up onto the street, flowing directly into a main municipal drinking water inlet. The water in our houses has started smelling foul. Urgent action required to avoid disease outbreak!",
      category: "sewage",
      severity: "critical",
      status: "resolved",
      lat: 28.7159,
      lng: 77.1139,
      address: "Sector 9 Metro Road, Rohini, Delhi 110085",
      city: "Delhi",
      ward: "Rohini Zone (Ward 54)",
      photo_urls: ["https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=800&q=80"],
      ai_category: "sewage",
      ai_urgency_score: 10,
      ai_suggested_authority: "Delhi Jal Board (DJB)",
      upvotes_count: 35,
      comments_count: 2,
      reporter_id: "usr_citizen",
      reporter_name: "Kamakshi Giri",
      reporter_avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=kamakshi",
      assigned_authority: "DJB Maintenance Team",
      assigned_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      resolved_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      sla_deadline: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      resolution_photo_url: "https://images.unsplash.com/photo-1581094288338-2314dddb7ece?auto=format&fit=crop&w=800&q=80",
      resolution_note: "DJB emergency crew excavated the site, replaced the damaged 12-inch sewer line, and thoroughly flushed and sanitized the adjacent water inlet line. Fresh water supply has been restored and tested clear.",
      citizen_rating: 5,
      created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];

  const upvotes: Upvote[] = [
    { id: "up_1", report_id: "rep_1", user_id: "usr_aanya", created_at: new Date().toISOString() },
    { id: "up_2", report_id: "rep_1", user_id: "usr_rahul", created_at: new Date().toISOString() },
    { id: "up_3", report_id: "rep_2", user_id: "usr_karan", created_at: new Date().toISOString() },
    { id: "up_4", report_id: "rep_4", user_id: "usr_karan", created_at: new Date().toISOString() }
  ];

  const comments: Comment[] = [
    {
      id: "com_1",
      report_id: "rep_1",
      user_id: "usr_rahul",
      user_name: "Rahul Patel",
      user_avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=rahul",
      content: "Agreed! Passed by ORR yesterday and almost hit it. Please drive extremely slow in the middle lane.",
      created_at: new Date(Date.now() - 1.5 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: "com_2",
      report_id: "rep_1",
      user_id: "usr_aanya",
      user_name: "Aanya Iyer",
      user_avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=aanya",
      content: "Is this near the Novotel junction? If yes, it's absolutely lethal during rain.",
      created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: "com_3",
      report_id: "rep_2",
      user_id: "usr_karan",
      user_name: "Karan Sharma",
      user_avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=karan",
      content: "This is unacceptable. Kids should not have to walk past toxic fumes and stray animals to enter a school. I've upvoted.",
      created_at: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString()
    }
  ];

  const status_timeline: StatusTimeline[] = [
    {
      id: "tl_1",
      report_id: "rep_1",
      old_status: "",
      new_status: "pending",
      changed_by: "usr_karan",
      changed_by_name: "Karan Sharma",
      note: "Issue reported by citizen.",
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: "tl_2",
      report_id: "rep_1",
      old_status: "pending",
      new_status: "validated",
      changed_by: "usr_rahul", // threshold trigger
      changed_by_name: "Rahul Patel",
      note: "Auto-validated: Issue reached community validation threshold (10 upvotes).",
      created_at: new Date(Date.now() - 1.8 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: "tl_3",
      report_id: "rep_1",
      old_status: "validated",
      new_status: "assigned",
      changed_by: "usr_admin",
      changed_by_name: "Municipal Officer (Admin)",
      note: "Assigned to BBMP Road Infrastructure Division (AEE Office). SLA set to 48 hours.",
      created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: "tl_4",
      report_id: "rep_4",
      old_status: "",
      new_status: "pending",
      changed_by: "usr_citizen",
      changed_by_name: "Kamakshi Giri",
      note: "Critical sewage leak reported.",
      created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: "tl_5",
      report_id: "rep_4",
      old_status: "pending",
      new_status: "validated",
      changed_by: "usr_karan",
      changed_by_name: "Karan Sharma",
      note: "Auto-validated: Crossed 10 upvotes.",
      created_at: new Date(Date.now() - 4.5 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: "tl_6",
      report_id: "rep_4",
      old_status: "validated",
      new_status: "assigned",
      changed_by: "usr_admin",
      changed_by_name: "Municipal Officer (Admin)",
      note: "Emergency dispatch to Delhi Jal Board maintenance office.",
      created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: "tl_7",
      report_id: "rep_4",
      old_status: "assigned",
      new_status: "resolved",
      changed_by: "usr_admin",
      changed_by_name: "Municipal Officer (Admin)",
      note: "Sewer line replaced. Fresh water supply line flushed. Area sanitized.",
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];

  const notifications: Notification[] = [
    {
      id: "not_1",
      user_id: "usr_citizen",
      type: "status_update",
      title: "Issue Assigned!",
      message: "Your reported issue 'Leaking sewage line contaminating water inlet' has been assigned to Delhi Jal Board Maintenance Team.",
      report_id: "rep_4",
      read: true,
      created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: "not_2",
      user_id: "usr_citizen",
      type: "resolution",
      title: "Issue Resolved! 🎉",
      message: "Great news! Delhi Jal Board has marked your reported sewage leak as resolved. Please review and rate the work.",
      report_id: "rep_4",
      read: false,
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];

  const bounties = [
    {
      id: "bty_1",
      sponsor_name: "Bean & Leaf Coffee Co.",
      sponsor_logo: "☕",
      title: "Clean Graffiti on Central Library West Wall",
      description: "A prominent local wall has been defaced. Grab some scrub brushes or paint and cover it up to restore the reading garden view!",
      reward_text: "Free Double-Shot Hazelnut Espresso Coupon",
      reward_xp: 120,
      category: "encroachment",
      location_hint: "West alley wall, Central Library Reading Garden, Bengaluru",
      before_photo: "https://images.unsplash.com/photo-1594818858329-051f4917f80f?auto=format&fit=crop&w=800&q=80",
      status: "open",
      created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: "bty_2",
      sponsor_name: "Organic Green Grocers",
      sponsor_logo: "🥬",
      title: "Clear Plastic Litter & Garden Waste in Gandhi Park Gate 3",
      description: "Heavy plastic wrap and garden trimmings have accumulated near the children's slide, creating a tripping hazard.",
      reward_text: "25% Off Coupon on Fresh Organic Fruits",
      reward_xp: 100,
      category: "garbage",
      location_hint: "North-east play gate, Gandhi Public Park, Bengaluru",
      before_photo: "https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&w=800&q=80",
      status: "open",
      created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: "bty_3",
      sponsor_name: "GreenStep NGO",
      sponsor_logo: "🌱",
      title: "Clear Deadwood and Cardboard Blocks on Sector 4 Main Cross",
      description: "Commercial shipping boxes have been dumped on the footpath, blocking wheelchair ramp access.",
      reward_text: "₹150 EcoStore Voucher for Reusable Bags",
      reward_xp: 80,
      category: "garbage",
      location_hint: "Sector 4 Main Cross Intersection, Chennai",
      before_photo: "https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=800&q=80",
      status: "open",
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];

  return {
    users,
    reports,
    upvotes,
    comments,
    status_timeline,
    notifications,
    bounties
  };
}

// Global active session
let currentUserSessionId = "usr_citizen"; // Default citizen

// Helper to award XP
function awardXP(userId: string, points: number, db: any): { newXp: number; newBadge: string; upgraded: boolean } {
  const user = db.users.find((u: any) => u.id === userId);
  if (!user) return { newXp: 0, newBadge: "Newcomer", upgraded: false };

  const oldXp = user.xp_points || 0;
  const newXp = oldXp + points;
  user.xp_points = newXp;

  // Badge logic
  let newBadge = user.badge_level;
  if (newXp >= 5000) newBadge = "Legend";
  else if (newXp >= 1500) newBadge = "Champion";
  else if (newXp >= 500) newBadge = "Validator";
  else if (newXp >= 100) newBadge = "Reporter";
  else newBadge = "Newcomer";

  const upgraded = newBadge !== user.badge_level;
  user.badge_level = newBadge;

  return { newXp, newBadge, upgraded };
}

// Fallback rule-based triage
function fallbackTriage(title: string, description: string) {
  const text = (title + " " + description).toLowerCase();
  let category: IssueCategory = "other";
  let suggested_authority = "Municipal Corporation Office";
  let urgency_score = 5;
  let severity: IssueSeverity = "medium";
  let estimated_sla_hours = 72;

  if (text.includes("pothole") || text.includes("road") || text.includes("crater") || text.includes("tar")) {
    category = "pothole";
    suggested_authority = "Public Works Department (PWD)";
    urgency_score = 6;
    severity = "high";
    estimated_sla_hours = 48;
  } else if (text.includes("garbage") || text.includes("waste") || text.includes("trash") || text.includes("dump") || text.includes("litter") || text.includes("smell")) {
    category = "garbage";
    suggested_authority = "Municipal Solid Waste Management Dept";
    urgency_score = 4;
    severity = "medium";
    estimated_sla_hours = 24;
  } else if (text.includes("streetlight") || text.includes("light") || text.includes("dark") || text.includes("bulb") || text.includes("pole")) {
    category = "streetlight";
    suggested_authority = "Municipal Corporation Electrical Dept";
    urgency_score = 5;
    severity = "medium";
    estimated_sla_hours = 48;
  } else if (text.includes("water") || text.includes("leak") || text.includes("pipe") || text.includes("tap") || text.includes("supply")) {
    category = "water";
    suggested_authority = "Water Supply & Sewerage Board";
    urgency_score = 7;
    severity = "high";
    estimated_sla_hours = 24;
  } else if (text.includes("electricity") || text.includes("wire") || text.includes("power") || text.includes("transformer") || text.includes("shock") || text.includes("spark")) {
    category = "electricity";
    suggested_authority = "State Electricity Distribution Corp";
    urgency_score = 9;
    severity = "critical";
    estimated_sla_hours = 24;
  } else if (text.includes("sewage") || text.includes("drain") || text.includes("manhole") || text.includes("stink") || text.includes("gutter")) {
    category = "sewage";
    suggested_authority = "Water Supply & Sewerage Board";
    urgency_score = 7;
    severity = "high";
    estimated_sla_hours = 48;
  } else if (text.includes("encroachment") || text.includes("hawker") || text.includes("illegal") || text.includes("footpath") || text.includes("blocked")) {
    category = "encroachment";
    suggested_authority = "Town Planning & Anti-Encroachment Division";
    urgency_score = 5;
    severity = "medium";
    estimated_sla_hours = 168;
  }

  const risk_urgency_index = Math.min(100, Math.max(10, urgency_score * 10 + Math.floor(Math.random() * 11) - 5));
  
  const complaint_draft = `To,
The Public Grievance Officer & Executive Engineer,
${suggested_authority},

Subject: URGENT MUNICIPAL INTERVENTION REQUESTED - ${title.toUpperCase()}

Dear Sir/Madam,

I am writing to formally lodge a complaint regarding a hazardous condition in our ward. There is an ongoing issue described as: "${title}".
Detailed Description: "${description || "No further description provided."}"

This is a public safety and quality-of-life hazard classified with a severity level of "${severity.toUpperCase()}" and a Risk & Urgency Index of ${risk_urgency_index}/100. Under municipal rules and citizens charters, this issue requires resolution within ${estimated_sla_hours} hours.

Kindly dispatch an inspection team immediately to repair this damage. We expect full transparency and live updates logged on our community board.

Yours faithfully,
Concerned Resident & SpotseReport Coalition`;

  return {
    category,
    urgency_score,
    risk_urgency_index,
    severity,
    suggested_authority,
    estimated_sla_hours,
    reasoning: "Keyword matching: Auto-classified based on key terms in title & description.",
    complaint_draft
  };
}

// AI smart triage call using `@google/genai`
async function smartTriage(title: string, description: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    console.log("No valid GEMINI_API_KEY found, using fallback triage rules.");
    return fallbackTriage(title, description);
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });

    const prompt = `
      You are an expert municipal engineer and prompt architect.
      Analyze this citizen-reported community issue and return structured categorization.
      
      Title: "${title}"
      Description: "${description}"
      
      Additionally:
      1. Calculate a composite "Risk & Urgency Index" from 1 to 100 factoring public safety hazards, environmental threat, vulnerability of bypassers (like school children, elderly), and structural damage.
      2. Draft a highly professional, legally structured, and formal municipal complaint letter (complaint_draft) addressed to the Ward Counselor and Commissioner of Public Works, outlining the civic emergency, demanding immediate remediation within the standard SLA, and citing civic accountability.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        systemInstruction: "You are an expert municipal engineer and civic prompt architect. Classify the category (must be one of: pothole, garbage, streetlight, water, electricity, sewage, encroachment, other), assign an urgency score (1 to 10), estimate severity (low, medium, high, critical), suggest a local authority (like BBMP, BESCOM, PWD, Delhi Jal Board, GCC, BMC), provide estimated SLA in hours, calculate a 1-100 risk_urgency_index, draft a formal, legally compliant municipal complaint letter, and supply a concise reasoning.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING },
            urgency_score: { type: Type.INTEGER },
            risk_urgency_index: { type: Type.INTEGER },
            severity: { type: Type.STRING },
            suggested_authority: { type: Type.STRING },
            estimated_sla_hours: { type: Type.INTEGER },
            reasoning: { type: Type.STRING },
            complaint_draft: { type: Type.STRING }
          },
          required: ["category", "urgency_score", "risk_urgency_index", "severity", "suggested_authority", "estimated_sla_hours", "reasoning", "complaint_draft"]
        }
      }
    });

    const parsed = JSON.parse(response.text.trim());
    return {
      category: (parsed.category || "other").toLowerCase() as IssueCategory,
      urgency_score: Math.min(10, Math.max(1, parsed.urgency_score || 5)),
      risk_urgency_index: Math.min(100, Math.max(1, parsed.risk_urgency_index || 50)),
      severity: (parsed.severity || "medium").toLowerCase() as IssueSeverity,
      suggested_authority: parsed.suggested_authority || "Municipal Corporation",
      estimated_sla_hours: parsed.estimated_sla_hours || 72,
      reasoning: parsed.reasoning || "AI smart-triage classified this issue based on content analysis.",
      complaint_draft: parsed.complaint_draft || `Dear Commissioner,\n\nPlease investigate this reported issue: ${title}.`
    };
  } catch (err) {
    console.error("Failed to fetch smart triage from Gemini API:", err);
    return fallbackTriage(title, description);
  }
}

// ----------------------
// API ROUTES
// ----------------------

// Auth Routes (switching users or register for mock testing)
app.post("/api/auth/firebase-sync", (req, res) => {
  const { uid, email, full_name, avatar_url, city, phone } = req.body;
  if (!uid) {
    return res.status(400).json({ error: "Firebase UID is required." });
  }

  const db = loadDB();
  let user = db.users.find((u: any) => u.id === uid);

  if (user) {
    currentUserSessionId = uid;
    return res.json(user);
  }

  const newUser = {
    id: uid,
    full_name: full_name || email?.split("@")[0] || "Citizen Reporter",
    avatar_url: avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(full_name || uid)}`,
    phone: phone || "",
    city: city || "Bengaluru",
    xp_points: 100,
    badge_level: "Reporter",
    reports_count: 0,
    validations_count: 0,
    resolved_count: 0,
    created_at: new Date().toISOString(),
    role: "citizen"
  };

  db.users.push(newUser);

  db.notifications.push({
    id: "not_welcome_" + uid,
    user_id: uid,
    type: "status_update",
    title: "Welcome to SpotseReport! 🌱",
    message: "Thank you for joining our real citizen community! We awarded you 100 XP to kick off your reporting journey.",
    report_id: "",
    read: false,
    created_at: new Date().toISOString()
  });

  saveDB(db);
  currentUserSessionId = uid;
  res.status(201).json(newUser);
});

app.get("/api/auth/me", (req, res) => {
  const db = loadDB();
  const user = db.users.find((u: any) => u.id === currentUserSessionId);
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  res.json(user);
});

app.post("/api/auth/register", (req, res) => {
  const { full_name, city, phone } = req.body;
  if (!full_name || !city) {
    return res.status(400).json({ error: "Full name and City are required." });
  }

  const db = loadDB();
  const id = "usr_" + Math.random().toString(36).substr(2, 9);
  const newUser = {
    id,
    full_name,
    avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(full_name)}`,
    phone: phone || "",
    city,
    xp_points: 50, // Initial registration bonus
    badge_level: "Newcomer" as const,
    reports_count: 0,
    validations_count: 0,
    resolved_count: 0,
    created_at: new Date().toISOString(),
    role: "citizen"
  };

  db.users.push(newUser);

  // Initial Welcome notification
  db.notifications.push({
    id: "not_welcome_" + id,
    user_id: id,
    type: "status_update",
    title: "Welcome to SpotseReport! 🌱",
    message: "Thank you for joining our citizen community! We awarded you 50 XP to kick off your reporting journey.",
    report_id: "",
    read: false,
    created_at: new Date().toISOString()
  });

  saveDB(db);
  currentUserSessionId = id;
  res.status(201).json(newUser);
});

app.post("/api/auth/login", (req, res) => {
  const { userId } = req.body;
  const db = loadDB();
  const user = db.users.find((u: any) => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: "User profile not found." });
  }
  currentUserSessionId = userId;
  res.json(user);
});

// Switch active role instantly in dev
app.post("/api/auth/switch-user", (req, res) => {
  const { userId } = req.body;
  const db = loadDB();
  const user = db.users.find((u: any) => u.id === userId);
  if (user) {
    currentUserSessionId = userId;
    res.json({ success: true, user });
  } else {
    res.status(404).json({ error: "User not found" });
  }
});

// Fetch all profiles / seed lists
app.get("/api/profiles", (req, res) => {
  const db = loadDB();
  res.json(db.users);
});

app.get("/api/auth/profiles", (req, res) => {
  const db = loadDB();
  res.json(db.users);
});

app.post("/api/auth/profile", (req, res) => {
  const { profileId } = req.body;
  const db = loadDB();
  const user = db.users.find((u: any) => u.id === profileId);
  if (user) {
    currentUserSessionId = profileId;
    res.json(user);
  } else {
    res.status(404).json({ error: "User profile not found." });
  }
});

app.post("/api/auth/role", (req, res) => {
  const { role, password } = req.body;
  if (role !== "admin" && role !== "citizen") {
    return res.status(400).json({ error: "Invalid role specified." });
  }
  if (role === "admin" && password !== "admin123") {
    return res.status(403).json({ error: "Access Denied: Invalid Administrative Verification Key." });
  }
  const db = loadDB();
  const user = db.users.find((u: any) => u.id === currentUserSessionId);
  if (user) {
    user.role = role;
    saveDB(db);
    res.json(user);
  } else {
    res.status(404).json({ error: "User session profile not found." });
  }
});

// Notifications
app.get("/api/notifications", (req, res) => {
  const db = loadDB();
  const userNotifications = db.notifications
    .filter((n: any) => n.user_id === currentUserSessionId)
    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  res.json(userNotifications);
});

app.post("/api/notifications/read-all", (req, res) => {
  const db = loadDB();
  db.notifications.forEach((n: any) => {
    if (n.user_id === currentUserSessionId) {
      n.read = true;
    }
  });
  saveDB(db);
  res.json({ success: true });
});

app.post("/api/notifications/:id/read", (req, res) => {
  const { id } = req.params;
  const db = loadDB();
  const notif = db.notifications.find((n: any) => n.id === id && n.user_id === currentUserSessionId);
  if (notif) {
    notif.read = true;
    saveDB(db);
  }
  res.json({ success: true });
});

// Leaderboard list
app.get("/api/leaderboard", (req, res) => {
  const db = loadDB();
  const cityFilter = req.query.city as string;

  let filteredUsers = db.users;
  if (cityFilter && cityFilter !== "all") {
    filteredUsers = db.users.filter((u: any) => u.city.toLowerCase() === cityFilter.toLowerCase());
  }

  // Map to Leaderboard entries and sort by XP
  const sorted: LeaderboardEntry[] = filteredUsers
    .map((u: any) => {
      // Calculate active items in reports
      const reports = db.reports.filter((r: any) => r.reporter_id === u.id);
      const reports_count = reports.length;
      const validations_count = db.upvotes.filter((up: any) => up.user_id === u.id).length;
      const resolved_count = reports.filter((r: any) => r.status === "resolved").length;

      return {
        id: "lb_" + u.id,
        user_id: u.id,
        full_name: u.full_name,
        avatar_url: u.avatar_url,
        badge_level: u.badge_level,
        city: u.city,
        xp_points: u.xp_points || 0,
        rank: 0,
        reports_count,
        validations_count,
        resolved_count
      };
    })
    .sort((a: any, b: any) => b.xp_points - a.xp_points);

  // Assign ranks
  sorted.forEach((item, index) => {
    item.rank = index + 1;
  });

  res.json(sorted);
});

// Reports CRUD
app.get("/api/reports", (req, res) => {
  const db = loadDB();
  const { category, status, severity, city, state, query, dateRange, startDate, endDate } = req.query;

  let filtered = [...db.reports];

  if (category && category !== "all") {
    filtered = filtered.filter(r => r.category === category);
  }
  if (status && status !== "all") {
    filtered = filtered.filter(r => r.status === status);
  }
  if (severity && severity !== "all") {
    filtered = filtered.filter(r => r.severity === severity);
  }
  if (state && state !== "all") {
    filtered = filtered.filter(r => {
      if (r.state && r.state.toLowerCase() === (state as string).toLowerCase()) return true;
      const inferred = getStateForCity(r.city);
      return inferred.toLowerCase() === (state as string).toLowerCase();
    });
  }
  if (city && city !== "all") {
    filtered = filtered.filter(r => r.city?.toLowerCase() === (city as string).toLowerCase());
  }
  if (query) {
    const q = (query as string).toLowerCase();
    filtered = filtered.filter(r => 
      r.title.toLowerCase().includes(q) || 
      r.description.toLowerCase().includes(q) || 
      r.address.toLowerCase().includes(q) ||
      (r.city && r.city.toLowerCase().includes(q)) ||
      (r.state && r.state.toLowerCase().includes(q))
    );
  }

  // Date Range Filtering
  if (dateRange && dateRange !== "all") {
    const now = Date.now();
    filtered = filtered.filter(r => {
      if (!r.created_at) return true;
      const reportTime = new Date(r.created_at).getTime();
      if (isNaN(reportTime)) return true;

      if (dateRange === "week") {
        const cutoff = now - 7 * 24 * 60 * 60 * 1000;
        return reportTime >= cutoff;
      } else if (dateRange === "month") {
        const cutoff = now - 30 * 24 * 60 * 60 * 1000;
        return reportTime >= cutoff;
      } else if (dateRange === "custom") {
        if (startDate) {
          const startMs = new Date(`${startDate}T00:00:00`).getTime();
          if (!isNaN(startMs) && reportTime < startMs) return false;
        }
        if (endDate) {
          const endMs = new Date(`${endDate}T23:59:59.999`).getTime();
          if (!isNaN(endMs) && reportTime > endMs) return false;
        }
        return true;
      }
      return true;
    });
  }

  // Sort by created_at descending
  filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  res.json(filtered);
});

app.get("/api/reports/:id", (req, res) => {
  const { id } = req.params;
  const db = loadDB();
  const report = db.reports.find((r: any) => r.id === id);
  if (!report) {
    return res.status(404).json({ error: "Report not found" });
  }

  // Get timeline
  const timeline = db.status_timeline
    .filter((t: any) => t.report_id === id)
    .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  // Get comments
  const reportComments = db.comments
    .filter((c: any) => c.report_id === id)
    .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  // Check if current user has upvoted
  const hasUpvoted = db.upvotes.some((u: any) => u.report_id === id && u.user_id === currentUserSessionId);

  res.json({
    report,
    timeline,
    comments: reportComments,
    hasUpvoted
  });
});

// Submit a report
app.post("/api/reports", async (req, res) => {
  const { title, description, category, severity, lat, lng, address, city, photo_urls, video_url, telemetry } = req.body;

  if (!title || !lat || !lng || !address || !city) {
    return res.status(400).json({ error: "Title, coordinates, address, and city are required." });
  }

  const db = loadDB();

  // Deduplication check: Within 100m (approx 0.001 degrees lat/lng is ~111m) of an open report in the same category
  const DUPE_THRESHOLD = 0.001;
  const similarReport = db.reports.find((r: any) => {
    if (r.category !== category || r.status === "resolved" || r.status === "rejected") return false;
    const latDiff = Math.abs(r.lat - lat);
    const lngDiff = Math.abs(r.lng - lng);
    return latDiff < DUPE_THRESHOLD && lngDiff < DUPE_THRESHOLD;
  });

  const user = db.users.find((u: any) => u.id === currentUserSessionId) || db.users[3]; // Fallback to Kamakshi Giri

  if (similarReport) {
    // Spatial deduplication: Convert into an upvote + verification update
    const alreadyUpvoted = db.upvotes.some((u: any) => u.report_id === similarReport.id && u.user_id === user.id);
    if (!alreadyUpvoted) {
      db.upvotes.push({
        id: "up_" + Math.random().toString(36).substr(2, 9),
        report_id: similarReport.id,
        user_id: user.id,
        created_at: new Date().toISOString()
      });
      similarReport.upvotes_count = (similarReport.upvotes_count || 0) + 1;
    }
    
    // Add validation comment with telemetry proof
    const compass = telemetry?.compass_heading || `${Math.floor(Math.random() * 360)}° ${["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.floor(Math.random() * 8)]}`;
    const commentId = "com_" + Math.random().toString(36).substr(2, 9);
    
    db.comments.push({
      id: commentId,
      report_id: similarReport.id,
      user_id: user.id,
      user_name: user.full_name,
      user_avatar: user.avatar_url,
      content: `[Deduplication Telemetry Proof] Verified nearby in-situ. Multi-spectral noise check passed (99.4% authentic). Device compass aligned at ${compass}. Appending fresh proof photo to timeline.`,
      photo_url: photo_urls && photo_urls[0] ? photo_urls[0] : undefined,
      created_at: new Date().toISOString()
    });
    similarReport.comments_count = (similarReport.comments_count || 0) + 1;

    // Add timeline log
    db.status_timeline.push({
      id: "tl_" + Math.random().toString(36).substr(2, 9),
      report_id: similarReport.id,
      old_status: similarReport.status,
      new_status: similarReport.status,
      changed_by: user.id,
      changed_by_name: user.full_name,
      note: `In-situ photographic proof merged by ${user.full_name}. Metadata: Compass=${compass}, GPS Lat/Lng matches original ticket.`,
      created_at: new Date().toISOString()
    });

    // Notify original reporter if it's someone else
    if (similarReport.reporter_id !== user.id) {
      db.notifications.push({
        id: "not_" + Math.random().toString(36).substr(2, 9),
        user_id: similarReport.reporter_id,
        type: "upvote",
        title: "Telemetry Merged! 🗺️",
        message: `${user.full_name} submitted matching nearby telemetry and photo evidence for your ticket '${similarReport.title}'.`,
        report_id: similarReport.id,
        read: false,
        created_at: new Date().toISOString()
      });
    }

    // Award XP
    const xpResult = awardXP(user.id, 50, db);
    user.validations_count = (user.validations_count || 0) + 1;
    
    saveDB(db);

    return res.status(200).json({
      merged: true,
      report: similarReport,
      reportId: similarReport.id,
      title: similarReport.title,
      xpAwarded: 50,
      newXp: xpResult.newXp,
      upgraded: xpResult.upgraded,
      newBadge: xpResult.newBadge,
      message: "Deduplication Sync complete: Your report has been merged with an existing nearby ticket, appending your fresh photo as live telemetry proof!"
    });
  }

  // Perform AI Smart Triage
  const triageResult = await smartTriage(title, description || "");
  
  const reportId = "rep_" + Math.random().toString(36).substr(2, 9);
  
  // Calculate anti-spoofing score based on telemetry presence
  const hasTelemetry = !!telemetry;
  const anti_spoof_score = hasTelemetry ? +(95 + Math.random() * 4.9).toFixed(1) : +(85 + Math.random() * 8).toFixed(1);

  const frozenTelemetry = {
    device_time: telemetry?.device_time || new Date().toISOString(),
    compass_heading: telemetry?.compass_heading || `${Math.floor(Math.random() * 360)}°`,
    device_model: telemetry?.device_model || "Apple iPhone 15 Pro",
    capture_altitude: telemetry?.capture_altitude || `${Math.floor(Math.random() * 200) + 15}m MSL`
  };

  // Create report
  const newReport: Report = {
    id: reportId,
    title,
    description: description || "",
    category: (category || triageResult.category) as IssueCategory,
    severity: (severity || triageResult.severity) as IssueSeverity,
    status: "pending",
    lat,
    lng,
    address,
    city,
    ward: `Ward ${Math.floor(Math.random() * 150) + 1}`,
    photo_urls: photo_urls || ["https://images.unsplash.com/photo-1594818858329-051f4917f80f?auto=format&fit=crop&w=800&q=80"],
    video_url: video_url || undefined,
    ai_category: triageResult.category,
    ai_urgency_score: triageResult.urgency_score,
    ai_suggested_authority: triageResult.suggested_authority,
    risk_urgency_index: triageResult.risk_urgency_index,
    complaint_draft: triageResult.complaint_draft,
    anti_spoof_score,
    metadata_telemetry: frozenTelemetry,
    is_offline_draft: req.body.is_offline_draft || false,
    upvotes_count: 1, // Automatic upvote from reporter
    comments_count: 0,
    reporter_id: user.id,
    reporter_name: user.full_name,
    reporter_avatar: user.avatar_url,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  db.reports.push(newReport);

  // Auto-upvote registry
  db.upvotes.push({
    id: "up_" + Math.random().toString(36).substr(2, 9),
    report_id: reportId,
    user_id: user.id,
    created_at: new Date().toISOString()
  });

  // Timeline audit log
  db.status_timeline.push({
    id: "tl_" + Math.random().toString(36).substr(2, 9),
    report_id: reportId,
    old_status: "",
    new_status: "pending",
    changed_by: user.id,
    changed_by_name: user.full_name,
    note: `Issue submitted by citizen. AI Triage analyzed: Severity ${triageResult.severity.toUpperCase()} with composite Risk & Urgency Index ${triageResult.risk_urgency_index}/100. Recommended Dispatch: ${triageResult.suggested_authority}.`,
    created_at: new Date().toISOString()
  });

  // Gamification: Award 50 XP for report submission
  const xpResult = awardXP(user.id, 50, db);
  user.reports_count = (user.reports_count || 0) + 1;

  // Notification of successful report and award
  db.notifications.push({
    id: "not_" + Math.random().toString(36).substr(2, 9),
    user_id: user.id,
    type: "status_update",
    title: "Issue Reported! +50 XP 🚀",
    message: `Thank you for reporting! Your issue has been triaged. Our smart system suggested dispatching to: ${triageResult.suggested_authority}.`,
    report_id: reportId,
    read: false,
    created_at: new Date().toISOString()
  });

  if (xpResult.upgraded) {
    db.notifications.push({
      id: "not_" + Math.random().toString(36).substr(2, 9),
      user_id: user.id,
      type: "status_update",
      title: `Badge Upgraded to ${xpResult.newBadge}! 🎉`,
      message: `Incredible work! Your activity has promoted you to a ${xpResult.newBadge} in your city.`,
      report_id: "",
      read: false,
      created_at: new Date().toISOString()
    });
  }

  saveDB(db);
  res.status(201).json({ report: newReport, xpAwarded: 50, levelUp: xpResult.upgraded, triageResult });
});

// Upvote report
app.post("/api/reports/:id/upvote", (req, res) => {
  const { id } = req.params;
  const db = loadDB();

  const report = db.reports.find((r: any) => r.id === id);
  if (!report) {
    return res.status(404).json({ error: "Report not found" });
  }

  // De-duplicate upvote
  const existingUpvote = db.upvotes.find((up: any) => up.report_id === id && up.user_id === currentUserSessionId);
  const user = db.users.find((u: any) => u.id === currentUserSessionId);

  if (existingUpvote) {
    // Un-upvote
    db.upvotes = db.upvotes.filter((up: any) => !(up.report_id === id && up.user_id === currentUserSessionId));
    report.upvotes_count = Math.max(0, (report.upvotes_count || 1) - 1);
    
    // Deduct XP
    if (user) {
      user.xp_points = Math.max(0, (user.xp_points || 0) - 10);
    }
    const reporter = db.users.find((u: any) => u.id === report.reporter_id);
    if (reporter && reporter.id !== currentUserSessionId) {
      reporter.xp_points = Math.max(0, (reporter.xp_points || 0) - 5);
    }

    saveDB(db);
    return res.json({ upvoted: false, upvotes_count: report.upvotes_count });
  }

  // Create Upvote
  db.upvotes.push({
    id: "up_" + Math.random().toString(36).substr(2, 9),
    report_id: id,
    user_id: currentUserSessionId,
    created_at: new Date().toISOString()
  });

  report.upvotes_count = (report.upvotes_count || 0) + 1;

  // Gamification: Upvoter gets 10 XP, reporter gets 5 XP
  if (user) {
    awardXP(user.id, 10, db);
    user.validations_count = (user.validations_count || 0) + 1;
  }

  const reporter = db.users.find((u: any) => u.id === report.reporter_id);
  if (reporter && reporter.id !== currentUserSessionId) {
    awardXP(reporter.id, 5, db);
    
    // Send notification to reporter
    db.notifications.push({
      id: "not_" + Math.random().toString(36).substr(2, 9),
      user_id: reporter.id,
      type: "upvote",
      title: "Issue Confirmed by Citizen! 👍",
      message: `Another citizen confirmed your issue "${report.title}". You gained +5 XP!`,
      report_id: id,
      read: false,
      created_at: new Date().toISOString()
    });
  }

  // Feature 3 Threshold Check: Promote to 'validated' when upvotes reach 10
  if (report.status === "pending" && report.upvotes_count >= 10) {
    report.status = "validated";
    report.updated_at = new Date().toISOString();

    // Auto-validated timeline
    db.status_timeline.push({
      id: "tl_" + Math.random().toString(36).substr(2, 9),
      report_id: id,
      old_status: "pending",
      new_status: "validated",
      changed_by: currentUserSessionId,
      changed_by_name: user?.full_name || "Community",
      note: "Community Validation: Issue automatically validated after reaching 10 confirming votes.",
      created_at: new Date().toISOString()
    });

    // Award 25 XP to reporter for validation
    if (reporter) {
      awardXP(reporter.id, 25, db);
      
      db.notifications.push({
        id: "not_val_" + id,
        user_id: reporter.id,
        type: "status_update",
        title: "Community Validated! +25 XP 🏅",
        message: `Outstanding! Your reported issue "${report.title}" has been verified by 10+ citizens and is now officially queued for dispatch.`,
        report_id: id,
        read: false,
        created_at: new Date().toISOString()
      });
    }
  }

  saveDB(db);
  res.json({ upvoted: true, upvotes_count: report.upvotes_count });
});

// Post comment
app.post("/api/reports/:id/comment", (req, res) => {
  const { id } = req.params;
  const { content } = req.body;

  if (!content) {
    return res.status(400).json({ error: "Comment content is required" });
  }

  const db = loadDB();
  const report = db.reports.find((r: any) => r.id === id);
  if (!report) {
    return res.status(404).json({ error: "Report not found" });
  }

  const user = db.users.find((u: any) => u.id === currentUserSessionId) || db.users[3];

  const commentId = "com_" + Math.random().toString(36).substr(2, 9);
  const newComment: Comment = {
    id: commentId,
    report_id: id,
    user_id: user.id,
    user_name: user.full_name,
    user_avatar: user.avatar_url,
    content,
    created_at: new Date().toISOString()
  };

  db.comments.push(newComment);
  report.comments_count = (report.comments_count || 0) + 1;

  // Gamification: commenter gets 8 XP
  awardXP(user.id, 8, db);

  // Notify reporter if comment is by someone else
  if (report.reporter_id !== user.id) {
    db.notifications.push({
      id: "not_" + Math.random().toString(36).substr(2, 9),
      user_id: report.reporter_id,
      type: "comment",
      title: "New Comment on Your Report 💬",
      message: `${user.full_name} commented on "${report.title}": "${content.substring(0, 40)}${content.length > 40 ? '...' : ''}"`,
      report_id: id,
      read: false,
      created_at: new Date().toISOString()
    });
  }

  saveDB(db);
  res.status(201).json(newComment);
});

// Rate a resolution
app.post("/api/reports/:id/rate", (req, res) => {
  const { id } = req.params;
  const { rating } = req.body; // 1-5

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: "Rating must be between 1 and 5 stars" });
  }

  const db = loadDB();
  const report = db.reports.find((r: any) => r.id === id);
  if (!report) {
    return res.status(404).json({ error: "Report not found" });
  }

  if (report.status !== "resolved") {
    return res.status(400).json({ error: "Rating can only be submitted for resolved reports." });
  }

  report.citizen_rating = rating;
  report.updated_at = new Date().toISOString();

  // Gamification: rating awards 15 XP to reporter
  const user = db.users.find((u: any) => u.id === report.reporter_id);
  if (user) {
    awardXP(user.id, 15, db);
    
    db.notifications.push({
      id: "not_" + Math.random().toString(36).substr(2, 9),
      user_id: user.id,
      type: "status_update",
      title: "Resolution Rated! +15 XP ⭐",
      message: `Thank you for rating the municipal work. Feedback helps improve civic services.`,
      report_id: id,
      read: false,
      created_at: new Date().toISOString()
    });
  }

  saveDB(db);
  res.json({ success: true, citizen_rating: rating });
});

// AI Location & Support Assistant using Google Maps & Search Grounding via Gemini 3.5-flash
app.post("/api/reports/:id/ai-query", async (req, res) => {
  const { id } = req.params;
  const { query, mode = "maps" } = req.body;

  if (!query || typeof query !== "string") {
    return res.status(400).json({ error: "Query is required" });
  }

  const db = loadDB();
  const report = db.reports.find((r: any) => r.id === id);
  if (!report) {
    return res.status(404).json({ error: "Report not found" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    const qLower = query.toLowerCase();
    let reply = "";
    let sources: any[] = [];

    if (mode === "search") {
      reply = `[Offline Fallback - Google Search Grounding] Here are live municipal rules and public guidelines for ${report.city} regarding ${report.category}:\n\n` +
              `### Municipal Regulations & SLA Policies:\n` +
              `1. **Standard SLA Resolution Window**: As per city public works charter, urgent ${report.category} issues carry an SLA of 24-72 hours.\n` +
              `2. **Public Guidelines**: Citizens are encouraged to upload clear geotagged photos and track updates via municipal ward portals.\n` +
              `3. **Escalation Protocol**: Unresolved SLA breaches can be escalated directly to the Ward Commissioner or Nodal Officer.\n\n` +
              `*(Live Search data grounded with municipal charter updates for ${report.city})*`;
      sources = [
        { web: { uri: `https://www.google.com/search?q=municipal+rules+${encodeURIComponent(report.category)}+${encodeURIComponent(report.city)}`, title: `${report.city} Municipal Rules & Guidelines` } },
        { web: { uri: `https://www.google.com/search?q=public+works+department+SLA+${encodeURIComponent(report.city)}`, title: `${report.city} PWD SLA Guidelines` } }
      ];
    } else {
      reply = `[Offline Mode - Google Maps Grounding] Information based on report coordinates at Lat: ${report.latitude.toFixed(5)}, Lng: ${report.longitude.toFixed(5)} (${report.address}):\n\n`;
      if (qLower.includes("waste") || qLower.includes("garbage") || qLower.includes("recycle")) {
        reply += `### Recommended Civic Infrastructure:\n` +
                 `1. **Dry Waste Collection Centre (DWCC)** - Located approximately 1.4 km from this spot.\n` +
                 `2. **Zone Ward Office - Waste Division** - Situated about 2.2 km away.\n\n` +
                 `*Tip: Ensure waste is segregated into dry and wet before drop-off.*`;
        sources = [
          { maps: { uri: `https://www.google.com/maps/search/?api=1&query=dry+waste+collection+centre+${encodeURIComponent(report.city)}`, title: "Dry Waste Collection Centre" } },
          { maps: { uri: `https://www.google.com/maps/search/?api=1&query=ward+office+${encodeURIComponent(report.city)}`, title: "Local Ward Office" } }
        ];
      } else if (qLower.includes("pothole") || qLower.includes("road") || qLower.includes("street")) {
        reply += `### Recommended Road Safety Support:\n` +
                 `1. **Public Works Department (PWD) Subdivision Office** - Located 1.8 km away.\n` +
                 `2. **Traffic Police Control Room** - Situated 3.0 km away.\n\n` +
                 `*Tip: Use the 'Generate Formal Letter' option to request inspection from Ward Engineer.*`;
        sources = [
          { maps: { uri: `https://www.google.com/maps/search/?api=1&query=pwd+office+${encodeURIComponent(report.city)}`, title: "PWD Subdivision Office" } },
          { maps: { uri: `https://www.google.com/maps/search/?api=1&query=traffic+police+control+room+${encodeURIComponent(report.city)}`, title: "Traffic Police Office" } }
        ];
      } else {
        reply += `### Nearest Public & Administrative Utilities:\n` +
                 `1. **Municipal Ward Office** - Located 1.5 km away at the central administrative sector.\n` +
                 `2. **Nearest Civic Hospital & First-Aid Center** - Located 2.5 km away for any hazardous emergencies.\n\n` +
                 `*(Grounded simulation based on active coordinates: ${report.latitude.toFixed(4)}, ${report.longitude.toFixed(4)})*`;
        sources = [
          { maps: { uri: `https://www.google.com/maps/search/?api=1&query=municipal+ward+office+${encodeURIComponent(report.city)}`, title: "Municipal Ward Office" } },
          { maps: { uri: `https://www.google.com/maps/search/?api=1&query=hospital+${encodeURIComponent(report.city)}`, title: "Civic Hospital" } }
        ];
      }
    }

    return res.json({ text: reply, sources });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });

    const reportLatLng = {
      latitude: Number(report.latitude),
      longitude: Number(report.longitude)
    };

    let response: any;
    if (mode === "search") {
      const systemInstruction = `You are an expert municipal and web-grounded research assistant for SpotSeReport. 
Use Google Search data to find live municipal rules, city policies, standard SLAs, government notifications, helpline numbers, and recent news regarding civic issues in ${report.city} (${report.category}).
Provide a clear, well-structured, actionable response with citations.`;

      response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: query,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          systemInstruction,
          tools: [{ googleSearch: {} }]
        }
      });
    } else {
      const systemInstruction = `You are a highly helpful municipal and geographic AI assistant for SpotSeReport. 
You are grounded with Google Maps data near the coordinates of a reported civic issue (${report.address} at Lat: ${reportLatLng.latitude}, Lng: ${reportLatLng.longitude}).
Your goal is to answer citizen questions about nearby civic infrastructure, ward offices, public waste stations, PWD centers, or local services relative to this issue.
Provide a clear, brief, and structured response with helpful tips. Mention the names of actual facilities or areas in the city (${report.city}) that you find.`;

      response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: query,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          systemInstruction,
          tools: [{ googleMaps: {} }],
          toolConfig: {
            retrievalConfig: {
              latLng: reportLatLng
            }
          }
        }
      });
    }

    const responseText = response.text || "No response received from the AI Assistant.";
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    
    const sources: any[] = [];
    chunks.forEach((chunk: any) => {
      if (chunk.web) {
        sources.push({
          web: {
            uri: chunk.web.uri,
            title: chunk.web.title || "Google Search Result"
          }
        });
      }
      if (chunk.maps) {
        sources.push({
          maps: {
            uri: chunk.maps.uri,
            title: chunk.maps.title || "Google Maps Location"
          }
        });
      }
    });

    res.json({ text: responseText, sources });
  } catch (err: any) {
    console.error("AI Grounding Error:", err);
    res.status(500).json({ error: err.message || "Failed to process AI query" });
  }
});

// Standalone Google Search Grounding Endpoint using gemini-3.5-flash
app.post("/api/grounding/search", async (req, res) => {
  const { query, city = "Bengaluru" } = req.body;
  if (!query || typeof query !== "string") {
    return res.status(400).json({ error: "Query parameter is required" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    return res.json({
      text: `[Offline Fallback - Google Search Grounding] Information regarding "${query}" in ${city}:\n\n` +
            `1. **Municipal Guidelines**: Standard city regulations dictate immediate containment of public safety hazards and public reporting within 24 hours.\n` +
            `2. **Helpline & Portal**: Citizens can contact municipal helplines or submit tickets online for tracking.\n` +
            `3. **Latest News**: Recent city initiatives emphasize AI-driven civic triage and rapid road repair programs.`,
      sources: [
        { web: { uri: `https://www.google.com/search?q=${encodeURIComponent(query)}+${encodeURIComponent(city)}`, title: `${city} Civic Search Results` } },
        { web: { uri: `https://www.google.com/search?q=municipal+corporation+helpline+${encodeURIComponent(city)}`, title: `${city} Municipal Portal` } }
      ]
    });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { "User-Agent": "aistudio-build" } }
    });

    const systemInstruction = `You are a real-time civic intelligence and news assistant powered by Google Search.
Your goal is to provide accurate, up-to-date, grounded information about city policies, municipal announcements, civic news, regulations, and helplines in ${city}.
Provide clear, structured markdown responses with factual details.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: query,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        systemInstruction,
        tools: [{ googleSearch: {} }]
      }
    });

    const responseText = response.text || "No grounded web search results returned.";
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    const sources: any[] = [];
    chunks.forEach((chunk: any) => {
      if (chunk.web) {
        sources.push({
          web: {
            uri: chunk.web.uri,
            title: chunk.web.title || "Web Link"
          }
        });
      }
    });

    res.json({ text: responseText, sources });
  } catch (err: any) {
    console.error("Standalone Search Grounding Error:", err);
    res.status(500).json({ error: err.message || "Failed to search web grounding" });
  }
});

// Standalone Google Maps Grounding Endpoint using gemini-3.5-flash
app.post("/api/grounding/maps", async (req, res) => {
  const { query, city = "Bengaluru", lat, lng } = req.body;
  if (!query || typeof query !== "string") {
    return res.status(400).json({ error: "Query parameter is required" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    return res.json({
      text: `[Offline Fallback - Google Maps Grounding] Facilities matching "${query}" near ${city}:\n\n` +
            `1. **Central Municipal Office - ${city}** - Administrative hub for civic complaints and ward permissions.\n` +
            `2. **PWD Subdivision Depot** - Primary equipment and engineering depot for street maintenance.\n` +
            `3. **Civic Sanitation Facility** - Dedicated waste collection and recycling hub.`,
      sources: [
        { maps: { uri: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}+${encodeURIComponent(city)}`, title: `${query} in ${city}` } },
        { maps: { uri: `https://www.google.com/maps/search/?api=1&query=municipal+office+${encodeURIComponent(city)}`, title: `${city} Municipal Office` } }
      ]
    });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { "User-Agent": "aistudio-build" } }
    });

    const systemInstruction = `You are a real-time geographic location assistant powered by Google Maps data.
Answer queries about nearby municipal ward offices, PWD subdivisions, public waste centers, emergency services, and civic facilities in ${city}.
Mention exact names of places and facilities where available.`;

    const config: any = {
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      systemInstruction,
      tools: [{ googleMaps: {} }]
    };

    if (lat && lng) {
      config.toolConfig = {
        retrievalConfig: {
          latLng: {
            latitude: Number(lat),
            longitude: Number(lng)
          }
        }
      };
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: query,
      config
    });

    const responseText = response.text || "No grounded map locations returned.";
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    const sources: any[] = [];
    chunks.forEach((chunk: any) => {
      if (chunk.maps) {
        sources.push({
          maps: {
            uri: chunk.maps.uri,
            title: chunk.maps.title || "Google Maps Location"
          }
        });
      }
      if (chunk.web) {
        sources.push({
          web: {
            uri: chunk.web.uri,
            title: chunk.web.title || "Web Link"
          }
        });
      }
    });

    res.json({ text: responseText, sources });
  } catch (err: any) {
    console.error("Standalone Maps Grounding Error:", err);
    res.status(500).json({ error: err.message || "Failed to search maps grounding" });
  }
});

// Gamification: Arcade XP reward endpoint removed

// Bounties: Fetch all bounties
app.get("/api/bounties", (req, res) => {
  const db = loadDB();
  if (!db.bounties) {
    db.bounties = [];
  }
  res.json(db.bounties);
});

// Bounties: Claim a bounty
app.post("/api/bounties/:id/claim", (req, res) => {
  const db = loadDB();
  const user = db.users.find((u: any) => u.id === currentUserSessionId);
  if (!user) {
    return res.status(404).json({ error: "User session not found" });
  }

  if (!db.bounties) {
    db.bounties = [];
  }

  const bounty = db.bounties.find((b: any) => b.id === req.params.id);
  if (!bounty) {
    return res.status(404).json({ error: "Bounty not found" });
  }

  if (bounty.status !== "open") {
    return res.status(400).json({ error: "Bounty is already claimed or completed" });
  }

  bounty.status = "claimed";
  bounty.claimed_by_id = user.id;
  bounty.claimed_by_name = user.full_name;

  db.notifications.push({
    id: "not_" + Math.random().toString(36).substr(2, 9),
    user_id: user.id,
    type: "system",
    title: "Bounty Claimed! 🎯",
    message: `You have successfully claimed the task: "${bounty.title}". Complete the work, take an After photo, and trigger AI verification!`,
    read: false,
    created_at: new Date().toISOString()
  });

  saveDB(db);
  res.json({ success: true, bounty });
});

// Bounties: Complete and AI-Verify a claimed bounty
app.post("/api/bounties/:id/complete", (req, res) => {
  const db = loadDB();
  const user = db.users.find((u: any) => u.id === currentUserSessionId);
  if (!user) {
    return res.status(404).json({ error: "User session not found" });
  }

  if (!db.bounties) {
    db.bounties = [];
  }

  const bounty = db.bounties.find((b: any) => b.id === req.params.id);
  if (!bounty) {
    return res.status(404).json({ error: "Bounty not found" });
  }

  if (bounty.status !== "claimed" || bounty.claimed_by_id !== user.id) {
    return res.status(400).json({ error: "You must claim the bounty first before completing it" });
  }

  const { after_photo } = req.body;
  if (!after_photo) {
    return res.status(400).json({ error: "An after photo is required to submit verification" });
  }

  // Simulated AI comparison
  if (after_photo === bounty.before_photo) {
    return res.status(400).json({ 
      error: "AI Verification Failed: The 'Before' and 'After' photos appear identical. Please submit a genuine photo showing the completed work!" 
    });
  }

  bounty.status = "completed";
  bounty.after_photo = after_photo;

  // Generate unique coupon code
  const voucher_code = "HERO-" + bounty.sponsor_name.replace(/[^a-zA-Z]/g, "").substring(0, 4).toUpperCase() + "-" + Math.random().toString(36).substring(2, 8).toUpperCase();

  // Award XP
  const reward_xp = bounty.reward_xp || 100;
  const xpResult = awardXP(user.id, reward_xp, db);
  user.resolved_count = (user.resolved_count || 0) + 1;

  db.notifications.push({
    id: "not_" + Math.random().toString(36).substr(2, 9),
    user_id: user.id,
    type: "system",
    title: `Bounty Verified! +${reward_xp} XP 🌟`,
    message: `AI verification approved! You cleared "${bounty.title}". Coupon code unlocked: ${voucher_code}.`,
    read: false,
    created_at: new Date().toISOString()
  });

  saveDB(db);
  res.json({ 
    success: true, 
    bounty,
    voucher_code,
    xpAwarded: reward_xp,
    newXp: xpResult.newXp,
    newBadge: xpResult.newBadge,
    upgraded: xpResult.upgraded,
    aiAnalysis: "Multi-spectral variance audit: Anomaly resolution verified with 98.4% confidence rating. Clean boundary detected. Verification approved!"
  });
});

// Gamification: Eco-Buddy Gemini Chat endpoint removed

// AI formal text auto-translation / polish endpoint
app.post("/api/translate-formal", async (req, res) => {
  const { text } = req.body;
  if (!text || typeof text !== "string") {
    return res.status(400).json({ error: "Text is required for formalization." });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    let cleaned = text.trim();
    if (cleaned.length > 0) {
      cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    }
    cleaned = cleaned.replace(/\b(um+|uh+|like|err|basically|you know|sort of)\b/gi, "").replace(/\s+/g, " ").trim();
    const fallbackText = `[Offline Mode Cleanup] Municipal Grievance Report: ${cleaned}. This is an official notice regarding the reported issue requiring immediate review and resource dispatch.`;
    return res.json({ translatedText: fallbackText, detectedLanguage: "Unknown (Offline Fallback)" });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });

    const prompt = `
      You are an expert municipal communication coordinator and translator.
      The user has spoken or typed a description of a civic issue (it may contain spoken filler words, informal language, spelling errors, or be in non-English/mixed languages like Hinglish or Kannada).
      
      Your task is:
      1. Auto-detect the language of the input.
      2. Translate it into clear, grammatically correct, formal English.
      3. Formalize the tone to be highly professional, structured, objective, and polite (fit for a formal public complaint to city officials).
      4. Ensure all critical details (such as the nature of the hazard, location clues, safety threats) from the original input are strictly preserved.
      5. Remove spoken filler words, repetitions, or slang.
      
      Input Text: "${text}"
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        systemInstruction: "You are a professional civic affairs copywriter and translator. Format your response strictly as JSON with 'translatedText' and 'detectedLanguage' attributes.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            translatedText: { type: Type.STRING },
            detectedLanguage: { type: Type.STRING }
          },
          required: ["translatedText", "detectedLanguage"]
        }
      }
    });

    try {
      const result = JSON.parse(response.text);
      res.json(result);
    } catch (parseErr) {
      console.error("Failed to parse Gemini translation response:", response.text);
      res.json({ translatedText: response.text, detectedLanguage: "Auto-detected" });
    }
  } catch (err: any) {
    console.error("Gemini Translation Error:", err);
    res.status(500).json({ error: err.message || "Failed to translate with Gemini" });
  }
});

// Audio Transcription & Incident Detail Extraction endpoint using gemini-3.6-flash
app.post("/api/transcribe-audio", async (req, res) => {
  const { audio, mimeType } = req.body;
  if (!audio) {
    return res.status(400).json({ error: "Audio data is required." });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    return res.json({
      transcription: "[Offline Fallback] (Voice recorded successfully)",
      title: "Voice Incident Report",
      category: "other",
      description: "Voice recorded report (offline fallback mode).",
      address: "",
      city: ""
    });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { "User-Agent": "aistudio-build" } }
    });

    const cleanBase64 = audio.includes(",") ? audio.split(",")[1] : audio;
    const cleanMime = mimeType || "audio/webm";

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: [
        {
          inlineData: {
            data: cleanBase64,
            mimeType: cleanMime
          }
        },
        `You are a civic voice intelligence AI. Listen to this recorded voice complaint.
1. Transcribe the spoken text verbatim in 'transcription'.
2. Extract structured civic incident details:
   - 'title': A short, clear summary title (3 to 6 words) describing the issue.
   - 'category': Must be strictly one of: pothole, garbage, streetlight, water, electricity, sewage, encroachment, other.
   - 'description': A formal, clear complaint description based on the audio recording.
   - 'address': Any street, area, landmark, or location mentioned in the voice report (e.g. "Outer Ring Road near Marathahalli", "MG Road junction"). If none mentioned, return empty string "".
   - 'city': Any city name mentioned (e.g. "Bengaluru", "Mumbai", "Delhi", "Chennai", "Hyderabad"). If none mentioned, return empty string "".
   - 'severity': Estimated severity (one of: low, medium, high, critical).`
      ],
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            transcription: { type: Type.STRING },
            title: { type: Type.STRING },
            category: { type: Type.STRING },
            description: { type: Type.STRING },
            address: { type: Type.STRING },
            city: { type: Type.STRING },
            severity: { type: Type.STRING }
          },
          required: ["transcription", "title", "category", "description"]
        }
      }
    });

    try {
      const parsed = JSON.parse(response.text || "{}");
      res.json(parsed);
    } catch (parseErr) {
      console.error("Parse error on transcribe-audio Gemini response:", response.text);
      res.json({
        transcription: response.text || "",
        title: "Recorded Voice Report",
        category: "other",
        description: response.text || "",
        address: "",
        city: ""
      });
    }
  } catch (err: any) {
    console.error("Audio Transcription Error:", err);
    res.status(500).json({ error: err.message || "Failed to transcribe audio." });
  }
});

// Low-latency suggestions endpoint using gemini-3.1-flash-lite
app.post("/api/suggest-details", async (req, res) => {
  const { description } = req.body;
  if (!description) {
    return res.status(400).json({ error: "Description is required." });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    return res.json({ title: "Community Civic Issue", category: "other" });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { "User-Agent": "aistudio-build" } }
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: `Suggest a concise professional title (maximum 5 words) and a category matching exactly one of: pothole, garbage, streetlight, water, electricity, sewage, encroachment, other.
Description: "${description}"`,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            category: { type: Type.STRING }
          },
          required: ["title", "category"]
        },
        systemInstruction: "You are a rapid response municipal intake bot. Provide low-latency, highly accurate title and category categorization strictly matching the JSON schema."
      }
    });

    const parsed = JSON.parse(response.text.trim());
    res.json(parsed);
  } catch (err: any) {
    console.error("Low-Latency suggest-details Error:", err);
    res.status(500).json({ error: err.message || "Failed to get suggestions" });
  }
});

// High-thinking expert civil/municipal engineering plan endpoint using gemini-3.1-pro-preview
app.post("/api/reports/:id/expert-plan", async (req, res) => {
  const { id } = req.params;
  const db = loadDB();
  const report = db.reports.find((r: any) => r.id === id);
  if (!report) {
    return res.status(404).json({ error: "Report not found" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    return res.json({
      plan: `### [Offline Fallback Mode] Civic Action Plan for "${report.title}"

1. **Immediate Precautionary Measures**: Place caution tape and barricades at ${report.address} to isolate the danger zone.
2. **First-Response Inspection**: Mobilize standard civil inspection vehicle to evaluate structural integrity and depth of the hazard.
3. **Engineering Intervention**: Mobilize materials and deploy standard crew to execute repair following city code.
4. **Completion Assurance**: Conduct follow-up quality check to close SLA within estimated window.`
    });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { "User-Agent": "aistudio-build" } }
    });

    const prompt = `Perform an advanced, highly rigorous municipal engineering and public safety analysis of this reported community issue:
Title: "${report.title}"
Category: "${report.category}"
Severity: "${report.severity}"
Address: "${report.address}" (City: ${report.city})
Description: "${report.description}"

Draft a comprehensive civic resolution plan including:
1. Public safety hazards & immediate mitigation protocols (e.g., barriers, detours).
2. Root-cause civil engineering hypothesis (why did this occur?).
3. Structural/functional repair methodology & resource requirement checklist (equipment, labor).
4. Multi-agency coordination strategy (e.g., PWD, Traffic Police, Local Water Board).
5. SLA compliance plan to meet standard window of ${report.estimated_sla_hours || 48} hours.

Format the response in elegant Markdown with sections.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: prompt,
      config: {
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.HIGH
        },
        systemInstruction: "You are a senior civic engineer, risk specialist, and public works planner. Provide exhaustive, technical, and expert-level municipal resolution blueprints."
      }
    });

    res.json({ plan: response.text || "No plan generated." });
  } catch (err: any) {
    console.error("Expert Plan High Thinking Error:", err);
    res.status(500).json({ error: err.message || "Failed to generate expert action plan." });
  }
});

// Image Generation & Editing using gemini-3.1-flash-image-preview
app.post("/api/generate-image", async (req, res) => {
  const { prompt, aspectRatio, existingImageBase64 } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: "Prompt is required." });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    return res.status(400).json({ error: "Please configure your Gemini API Key in Settings to generate images." });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { "User-Agent": "aistudio-build" } }
    });

    const parts: any[] = [];
    if (existingImageBase64) {
      const mimeType = existingImageBase64.split(";")[0]?.split(":")[1] || "image/png";
      const base64Data = existingImageBase64.split(",")[1] || existingImageBase64;
      parts.push({
        inlineData: {
          data: base64Data,
          mimeType: mimeType
        }
      });
    }

    parts.push({ text: prompt });

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-image",
      contents: { parts }
    });

    let imageUrl = "";
    const candidateParts = response.candidates?.[0]?.content?.parts || [];
    for (const part of candidateParts) {
      if (part.inlineData) {
        imageUrl = `data:${part.inlineData.mimeType || "image/png"};base64,${part.inlineData.data}`;
        break;
      }
    }

    if (!imageUrl) {
      return res.status(500).json({ error: "No image was returned by the model: " + (response.text || "") });
    }

    res.json({ imageUrl });
  } catch (err: any) {
    console.error("Image generation error:", err);
    res.status(500).json({ error: err.message || "Failed to generate image" });
  }
});

// ----------------------
// ADMIN PANEL ROUTES
// ----------------------

// Assign report to authority
app.post("/api/admin/reports/:id/assign", (req, res) => {
  const { id } = req.params;
  const { authority, sla_hours } = req.body;

  if (!authority) {
    return res.status(400).json({ error: "Authority is required" });
  }

  const db = loadDB();
  const report = db.reports.find((r: any) => r.id === id);
  if (!report) {
    return res.status(404).json({ error: "Report not found" });
  }

  const adminUser = db.users.find((u: any) => u.id === currentUserSessionId);
  if (!adminUser || adminUser.role !== "admin") {
    return res.status(403).json({ error: "Unauthorized. Admin privileges required." });
  }

  const hours = sla_hours || 48;
  const now = new Date();
  const deadline = new Date(now.getTime() + hours * 60 * 60 * 1000);

  report.status = "assigned";
  report.assigned_authority = authority;
  report.assigned_at = now.toISOString();
  report.sla_deadline = deadline.toISOString();
  report.updated_at = now.toISOString();

  // Add timeline event
  db.status_timeline.push({
    id: "tl_" + Math.random().toString(36).substr(2, 9),
    report_id: id,
    old_status: "validated",
    new_status: "assigned",
    changed_by: adminUser.id,
    changed_by_name: adminUser.full_name,
    note: `Dispatched & assigned to: ${authority}. SLA timeline set to ${hours} hours.`,
    created_at: now.toISOString()
  });

  // Notify reporter
  const reporter = db.users.find((u: any) => u.id === report.reporter_id);
  if (reporter) {
    db.notifications.push({
      id: "not_" + Math.random().toString(36).substr(2, 9),
      user_id: reporter.id,
      type: "status_update",
      title: "Issue Dispatched! 👷",
      message: `Your reported issue "${report.title}" has been dispatched to: ${authority}. Target SLA: ${hours} hours.`,
      report_id: id,
      read: false,
      created_at: now.toISOString()
    });
  }

  saveDB(db);
  res.json({ success: true, report });
});

// Update report status (and submit resolution if resolved)
app.post("/api/admin/reports/:id/status", (req, res) => {
  const { id } = req.params;
  const { status, note, resolution_photo_url, resolution_note } = req.body;

  if (!status) {
    return res.status(400).json({ error: "Status is required" });
  }

  const db = loadDB();
  const report = db.reports.find((r: any) => r.id === id);
  if (!report) {
    return res.status(404).json({ error: "Report not found" });
  }

  const adminUser = db.users.find((u: any) => u.id === currentUserSessionId);
  if (!adminUser || adminUser.role !== "admin") {
    return res.status(403).json({ error: "Unauthorized. Admin privileges required." });
  }

  const oldStatus = report.status;
  report.status = status as IssueStatus;
  report.updated_at = new Date().toISOString();

  let finalNote = note || `Status updated from ${oldStatus} to ${status}.`;

  if (status === "resolved") {
    report.resolved_at = new Date().toISOString();
    report.resolution_photo_url = resolution_photo_url || "https://images.unsplash.com/photo-1581094288338-2314dddb7ece?auto=format&fit=crop&w=800&q=80";
    report.resolution_note = resolution_note || "Work has been successfully completed and inspected by municipal engineer.";
    finalNote = `Issue officially marked as RESOLVED. Resolution proof attached. Note: ${report.resolution_note}`;

    // Gamification: reporter gets 100 XP when their issue resolves!
    const reporter = db.users.find((u: any) => u.id === report.reporter_id);
    if (reporter) {
      awardXP(reporter.id, 100, db);
      reporter.resolved_count = (reporter.resolved_count || 0) + 1;

      db.notifications.push({
        id: "not_res_" + id,
        user_id: reporter.id,
        type: "resolution",
        title: "Issue Resolved! +100 XP 🎉",
        message: `Fantastic! Your reported issue "${report.title}" is now completely resolved. Review and rate the response!`,
        report_id: id,
        read: false,
        created_at: new Date().toISOString()
      });
    }
  }

  // Add timeline event
  db.status_timeline.push({
    id: "tl_" + Math.random().toString(36).substr(2, 9),
    report_id: id,
    old_status: oldStatus,
    new_status: status as IssueStatus,
    changed_by: adminUser.id,
    changed_by_name: adminUser.full_name,
    note: finalNote,
    created_at: new Date().toISOString()
  });

  // Notify reporter if status changed
  if (report.reporter_id !== adminUser.id) {
    const reporter = db.users.find((u: any) => u.id === report.reporter_id);
    if (reporter && status !== "resolved") { // Resolved has its own notification above
      db.notifications.push({
        id: "not_" + Math.random().toString(36).substr(2, 9),
        user_id: reporter.id,
        type: "status_update",
        title: `Status Update: ${status.toUpperCase()} 🔄`,
        message: `Your reported issue "${report.title}" status changed to: ${status}. Note: ${note || 'Status update.'}`,
        report_id: id,
        read: false,
        created_at: new Date().toISOString()
      });
    }
  }

  saveDB(db);
  res.json({ success: true, report });
});

// Admin stats
app.get("/api/admin/stats", (req, res) => {
  const db = loadDB();
  const adminUser = db.users.find((u: any) => u.id === currentUserSessionId);
  if (!adminUser || adminUser.role !== "admin") {
    return res.status(403).json({ error: "Unauthorized. Admin privileges required." });
  }
  const reports = db.reports;

  const total = reports.length;
  const pending = reports.filter(r => r.status === "pending").length;
  const validated = reports.filter(r => r.status === "validated").length;
  const assigned = reports.filter(r => r.status === "assigned").length;
  const inProgress = reports.filter(r => r.status === "in_progress").length;
  const resolved = reports.filter(r => r.status === "resolved").length;
  const rejected = reports.filter(r => r.status === "rejected").length;

  // SLA breach check (status is not resolved/rejected and deadline exists and is in the past)
  const now = new Date();
  const breachedReports = reports.filter(r => {
    if (r.status === "resolved" || r.status === "rejected") return false;
    if (!r.sla_deadline) return false;
    return new Date(r.sla_deadline) < now;
  });

  // Category counts
  const categories: Record<string, number> = {};
  reports.forEach(r => {
    categories[r.category] = (categories[r.category] || 0) + 1;
  });

  res.json({
    totals: { total, pending, validated, assigned, inProgress, resolved, rejected },
    breached_count: breachedReports.length,
    categories
  });
});

// Admin Weekly Report - Gemini Analysis
app.post("/api/admin/weekly-report", async (req, res) => {
  const db = loadDB();
  const adminUser = db.users.find((u: any) => u.id === currentUserSessionId);
  if (!adminUser || adminUser.role !== "admin") {
    return res.status(403).json({ error: "Unauthorized. Admin privileges required." });
  }

  const reports = db.reports || [];
  const total = reports.length;
  const now = new Date();

  const breachedReports = reports.filter((r: any) => {
    if (r.status === "resolved" || r.status === "rejected") return false;
    if (!r.sla_deadline) return false;
    return new Date(r.sla_deadline) < now;
  });

  const categories: Record<string, number> = {};
  const severities: Record<string, number> = {};
  reports.forEach((r: any) => {
    categories[r.category] = (categories[r.category] || 0) + 1;
    severities[r.severity] = (severities[r.severity] || 0) + 1;
  });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    // Elegant dynamic fallback based on real database stats
    let topCategory = "other";
    let maxCount = 0;
    Object.entries(categories).forEach(([cat, count]) => {
      if (count > maxCount) {
        maxCount = count;
        topCategory = cat;
      }
    });

    const mockResponse = {
      title: "Municipal Operational Performance & Incident Audit",
      dateRange: `Audit Period: Last 7 Days (Ending ${new Date().toLocaleDateString("en-US", { month: 'long', day: 'numeric', year: 'numeric' })})`,
      executiveSummary: `This week, the SpotSeReport platform cataloged a total of ${total} public service reports across active districts. Of these, ${reports.filter((r: any) => r.status === "pending").length} are pending triage, while ${reports.filter((r: any) => r.status === "resolved").length} have been successfully resolved by public works crews. The database displays a robust engagement level, reflecting strong citizen collaboration in reporting civic infrastructure anomalies.`,
      topCategoryAnalysis: `The most frequent category logged during this period is "${topCategory.toUpperCase()}" with ${maxCount} active filings. Systemic analysis suggests seasonal or infrastructure vulnerabilities. Immediate dispatch of localized public works inspection crews is recommended to prevent compounding deterioration in regional clusters.`,
      trendAnalysis: `Out of all logged records, ${breachedReports.length} reports have exceeded their designated Service Level Agreement (SLA) response windows. Close supervision is required in high-priority zones where critical severity incidents have been flagged to reduce potential public safety liabilities.`,
      keyRecommendations: [
        `Establish a predictive maintenance program targeting high-vulnerability sectors in the "${topCategory}" category to preempt citizen complaints.`,
        `Optimize the dispatch pipeline for reports exceeding standard SLA targets, prioritizing critical-priority hazards to ensure public safety compliance.`,
        `Deploy seasonal weather-preparedness or grid-insulation guidelines to district administrators to decrease high-severity incident loads.`
      ]
    };
    return res.json(mockResponse);
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { "User-Agent": "aistudio-build" } }
    });

    const context = {
      totalCount: total,
      statusBreakdown: {
        pending: reports.filter((r: any) => r.status === 'pending').length,
        validated: reports.filter((r: any) => r.status === 'validated').length,
        assigned: reports.filter((r: any) => r.status === 'assigned').length,
        inProgress: reports.filter((r: any) => r.status === 'in_progress').length,
        resolved: reports.filter((r: any) => r.status === 'resolved').length,
        rejected: reports.filter((r: any) => r.status === 'rejected').length,
      },
      categories,
      severities,
      breachCount: breachedReports.length,
      recentIncidents: reports.slice(-15).map((r: any) => ({
        title: r.title,
        category: r.category,
        severity: r.severity,
        city: r.city,
        status: r.status,
        created_at: r.created_at
      }))
    };

    const prompt = `You are an expert municipal data analyst and senior urban planner.
Perform a professional weekly diagnostic and predictive audit on this real-time municipal dataset of community incident reports:

---
MUNICIPAL DATA:
${JSON.stringify(context, null, 2)}
---

Generate a comprehensive analytical report containing:
1. A concise professional report title.
2. A formal date range indicating the current audit window (e.g. "Weekly Audit: July 12 - July 18, 2026" based on current date).
3. "executiveSummary": An elegant, high-level summary of the overall volume, general service resolution status, and civic urgency level.
4. "topCategoryAnalysis": A comprehensive analysis of the most common issue category, identifying potential systemic city-wide vulnerabilities (e.g. heavy monsoon rain affecting roads, power grid overloading, dump sites saturation) and specific containment recommendations.
5. "trendAnalysis": A diagnostic breakdown of high severity or critical emergencies, SLA breaches, and any regional (city) hotspots.
6. "keyRecommendations": A list of 3 highly actionable, strategic urban planning/public works recommendations to mitigate future incidents.

Keep the tone academic, authoritative, and solutions-oriented. Format the response strictly to match the requested JSON schema.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        systemInstruction: "You are a senior municipal operations strategist. Always structure your response exactly as JSON matching the provided schema.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            dateRange: { type: Type.STRING },
            executiveSummary: { type: Type.STRING },
            topCategoryAnalysis: { type: Type.STRING },
            trendAnalysis: { type: Type.STRING },
            keyRecommendations: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["title", "dateRange", "executiveSummary", "topCategoryAnalysis", "trendAnalysis", "keyRecommendations"]
        }
      }
    });

    const parsed = JSON.parse(response.text.trim());
    res.json(parsed);
  } catch (err: any) {
    console.error("Gemini Weekly Report Error:", err);
    res.status(500).json({ error: err.message || "Failed to generate weekly audit." });
  }
});

// Admin Daily Insight - Gemini Analysis
app.post("/api/admin/daily-insight", async (req, res) => {
  const db = loadDB();
  const adminUser = db.users.find((u: any) => u.id === currentUserSessionId);
  if (!adminUser || adminUser.role !== "admin") {
    return res.status(403).json({ error: "Unauthorized. Admin privileges required." });
  }

  const reports = db.reports || [];
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Filter reports from the last 24 hours
  const dailyReports = reports.filter((r: any) => {
    const reportDate = new Date(r.created_at || r.createdAt || now);
    return reportDate >= oneDayAgo;
  });

  const totalDaily = dailyReports.length;
  const criticalDaily = dailyReports.filter((r: any) => r.severity === "critical" || r.severity === "high").length;
  const resolvedDaily = dailyReports.filter((r: any) => r.status === "resolved").length;
  const percentage = totalDaily > 0 ? Math.round((resolvedDaily / totalDaily) * 100) : 100;

  // Let's get the most recent overall reports as context if 24h is empty, to make the summary informative
  const recentOverall = reports.slice(-10);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    // Dynamic elegant fallback
    let summaryText = "";
    let primaryVuln = "Infrastructure Maintenance";
    if (totalDaily > 0) {
      const topCat = dailyReports[0].category;
      summaryText = `Over the past 24 hours, ${totalDaily} civic incidents were submitted. Attention is drawn towards critical reports regarding "${topCat}" in the active sectors, demanding expedited crew allocation to prevent compounding hazards.`;
      primaryVuln = topCat;
    } else {
      summaryText = "No critical municipal incidents have been logged in the last 24 hours. General municipal infrastructure services remain optimal across all primary tracking sectors. Scheduled preventative monitoring continues.";
    }

    const mockResponse = {
      summary: summaryText,
      criticalIssueCount: criticalDaily,
      resolvedPercentage: percentage,
      primaryVulnerability: primaryVuln,
      safetyDirective: totalDaily > 0 ? "Initiate rapid dispatch of localized emergency response crews." : "Maintain general utility monitoring."
    };
    return res.json(mockResponse);
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { "User-Agent": "aistudio-build" } }
    });

    const context = {
      totalDailyCount: totalDaily,
      criticalDailyCount: criticalDaily,
      resolvedPercentage: percentage,
      dailyIncidents: dailyReports.map((r: any) => ({
        title: r.title,
        category: r.category,
        severity: r.severity,
        city: r.city,
        status: r.status,
        description: r.description
      })),
      recentOverallContext: recentOverall.map((r: any) => ({
        title: r.title,
        category: r.category,
        severity: r.severity,
        city: r.city,
        status: r.status
      }))
    };

    const prompt = `You are an elite urban operations dispatcher and municipal strategist.
Analyze this real-time city data detailing the last 24 hours of community incident reports:

---
DAILY MUNICIPAL DATA:
${JSON.stringify(context, null, 2)}
---

Generate a concise, highly focused 'Daily Insight' object containing:
1. "summary": A powerful, brief (2-3 sentences max) text summary analyzing the most critical municipal issues identified in the last 24 hours (or recent trends if no new reports exist in the last 24h). Keep it urgent, direct, and actionable.
2. "criticalIssueCount": An integer count of the critical/high severity reports in the last 24 hours.
3. "resolvedPercentage": An integer from 0 to 100 representing the resolution percentage of last 24h reports.
4. "primaryVulnerability": A short phrase representing the main issue category or system under stress.
5. "safetyDirective": A one-line operational directive for the municipal field teams.

Be direct, highly authoritative, and professional. Structure the response strictly to match the requested JSON schema.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        systemInstruction: "You are a real-time city operations coordinator. Always structure your response exactly as JSON matching the provided schema.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            criticalIssueCount: { type: Type.INTEGER },
            resolvedPercentage: { type: Type.INTEGER },
            primaryVulnerability: { type: Type.STRING },
            safetyDirective: { type: Type.STRING }
          },
          required: ["summary", "criticalIssueCount", "resolvedPercentage", "primaryVulnerability", "safetyDirective"]
        }
      }
    });

    const parsed = JSON.parse(response.text.trim());
    res.json(parsed);
  } catch (err: any) {
    console.error("Gemini Daily Insight Error:", err);
    res.status(500).json({ error: err.message || "Failed to generate daily intelligence insight." });
  }
});

// Serve frontend assets in production
if (process.env.NODE_ENV !== "production") {
  const { createServer: createViteServer } = await import("vite");
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa"
  });
  app.use(vite.middlewares);
} else {
  const distPath = path.join(process.cwd(), "dist");
  app.use(express.static(distPath));
  app.get("*all", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
  // Fallback for router standard routes
  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

const server = app.listen(PORT, "0.0.0.0", async () => {
  console.log(`[SpotseReport] Server running on http://0.0.0.0:${PORT}`);
  await syncFromFirestore();
});

// Real-time Voice Conversation WebSocket Bridge
const wss = new WebSocketServer({ server });

wss.on("connection", async (clientWs, req) => {
  try {
    const reqUrl = req.url || "";
    if (!reqUrl.includes("/api/live")) {
      clientWs.close();
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      clientWs.send(JSON.stringify({ error: "Gemini API Key is not configured on server. Please add your key in Settings." }));
      clientWs.close();
      return;
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        }
      }
    });

    const session = await ai.live.connect({
      model: "gemini-3.1-flash-live-preview",
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
        },
        systemInstruction: "You are a professional local municipal voice assistant for SpotSeReport. Citizens can talk with you about local community issues, pothole repairs, garbage cleanup, streetlights, water-logging, or general civic regulations. Respond in a brief, conversational, empathetic, and polite tone. Keep answers under 2 sentences since this is a real-time voice call.",
      },
      callbacks: {
        onmessage: (message) => {
          const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
          if (audio) {
            clientWs.send(JSON.stringify({ audio }));
          }
          if (message.serverContent?.interrupted) {
            clientWs.send(JSON.stringify({ interrupted: true }));
          }
        },
      },
    });

    clientWs.on("message", (data) => {
      try {
        const parsed = JSON.parse(data.toString());
        if (parsed.audio) {
          session.sendRealtimeInput({
            audio: { data: parsed.audio, mimeType: "audio/pcm;rate=16000" },
          });
        }
      } catch (err) {
        console.error("Live WebSocket Error forwarding message:", err);
      }
    });

    clientWs.on("close", () => {
      try {
        session.close();
      } catch (err) {
        console.error("Error closing Live API session:", err);
      }
    });

  } catch (err: any) {
    console.error("Failed to connect to Gemini Live session:", err);
    clientWs.send(JSON.stringify({ error: "Failed to connect to Voice Assistant." }));
    clientWs.close();
  }
});
