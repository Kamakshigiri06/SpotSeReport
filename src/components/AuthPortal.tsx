import React, { useState } from "react";
import { auth } from "../firebase";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider,
  signOut
} from "firebase/auth";
import { 
  Mail, Lock, User as UserIcon, Phone, MapPin, 
  Sparkles, LogIn, UserPlus, ShieldAlert, ArrowRight,
  ShieldCheck, Globe, Trash2
} from "lucide-react";
import { Profile } from "../types";

interface AuthPortalProps {
  onAuthSuccess: (profile: Profile) => void;
  onClose?: () => void;
  isEmbed?: boolean; // If used as a small widget instead of full-page overlay
}

const CITIES = ["Bengaluru", "Chennai", "Mumbai", "Delhi", "Hyderabad", "Kolkata", "Pune", "Ahemdabad"];

export default function AuthPortal({ onAuthSuccess, onClose, isEmbed = false }: AuthPortalProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [city, setCity] = useState("Bengaluru");
  const [phone, setPhone] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // For Google Sign-in flow when city is required for registration
  const [googleUserPending, setGoogleUserPending] = useState<any | null>(null);
  const [googleCity, setGoogleCity] = useState("Bengaluru");

  const syncProfileWithBackend = async (payload: {
    uid: string;
    email: string | null;
    full_name: string | null;
    avatar_url: string | null;
    city: string;
    phone?: string;
  }) => {
    const res = await fetch("/api/auth/firebase-sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || "Failed to synchronize profile session with server.");
    }
    
    return await res.json();
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (isRegister) {
        if (!fullName.trim()) throw new Error("Please enter your full name.");
        if (password.length < 6) throw new Error("Password must be at least 6 characters.");

        // Create user in Firebase Auth
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        const fbUser = credential.user;

        // Sync and create profile
        const profile = await syncProfileWithBackend({
          uid: fbUser.uid,
          email: fbUser.email,
          full_name: fullName,
          avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(fullName)}`,
          city,
          phone
        });

        setSuccessMsg("Account created successfully! Welcome aboard.");
        setTimeout(() => onAuthSuccess(profile), 1000);
      } else {
        // Log in user via Firebase Auth
        const credential = await signInWithEmailAndPassword(auth, email, password);
        const fbUser = credential.user;

        // Sync session with backend
        const profile = await syncProfileWithBackend({
          uid: fbUser.uid,
          email: fbUser.email,
          full_name: fbUser.displayName,
          avatar_url: fbUser.photoURL,
          city: "Bengaluru" // Fallback city if profile is created newly, backend handles existing
        });

        setSuccessMsg(`Welcome back, ${profile.full_name}!`);
        setTimeout(() => onAuthSuccess(profile), 1000);
      }
    } catch (err: any) {
      console.error(err);
      let msg = err.message;
      if (err.code === "auth/email-already-in-use") msg = "This email is already in use.";
      if (err.code === "auth/invalid-credential") msg = "Invalid email or password.";
      if (err.code === "auth/weak-password") msg = "Password is too weak.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      const credential = await signInWithPopup(auth, provider);
      const fbUser = credential.user;

      // Check if user profile already exists on backend
      const checkRes = await fetch("/api/auth/profiles");
      let userExists = false;
      if (checkRes.ok) {
        const profiles: Profile[] = await checkRes.json();
        userExists = profiles.some(p => p.id === fbUser.uid);
      }

      if (userExists) {
        // Directly sync and proceed
        const profile = await syncProfileWithBackend({
          uid: fbUser.uid,
          email: fbUser.email,
          full_name: fbUser.displayName,
          avatar_url: fbUser.photoURL,
          city: "Bengaluru"
        });
        setSuccessMsg(`Logged in successfully as ${profile.full_name}`);
        setTimeout(() => onAuthSuccess(profile), 1000);
      } else {
        // First-time registration with Google requires city select step
        setGoogleUserPending(fbUser);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Google sign-in failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleCitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleUserPending) return;
    setLoading(true);
    setError(null);

    try {
      const profile = await syncProfileWithBackend({
        uid: googleUserPending.uid,
        email: googleUserPending.email,
        full_name: googleUserPending.displayName || googleUserPending.email?.split("@")[0] || "Citizen Reporter",
        avatar_url: googleUserPending.photoURL,
        city: googleCity
      });

      setSuccessMsg("Profile configured! Welcome to the portal.");
      setGoogleUserPending(null);
      setTimeout(() => onAuthSuccess(profile), 1000);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to finalize registration.");
    } finally {
      setLoading(false);
    }
  };

  if (googleUserPending) {
    return (
      <div className={`w-full max-w-md mx-auto bg-white/90 backdrop-blur-md rounded-3xl border border-slate-100 shadow-2xl p-8 text-center`}>
        <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-teal-600 shadow-inner">
          <MapPin className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-black text-slate-800 tracking-tight mb-2">Select Your Home City</h3>
        <p className="text-xs text-slate-500 font-medium mb-6 leading-relaxed">
          Welcome <span className="font-bold text-slate-700">{googleUserPending.displayName}</span>! To customize your local civic feed and unlock rewards, please choose your primary reporting city.
        </p>

        <form onSubmit={handleGoogleCitySubmit} className="space-y-4">
          <div className="relative">
            <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <select
              value={googleCity}
              onChange={(e) => setGoogleCity(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition cursor-pointer"
            >
              {CITIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-teal-600 hover:bg-teal-700 active:scale-98 text-white rounded-xl text-sm font-black tracking-wide shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all duration-150 disabled:opacity-50"
          >
            {loading ? "Configuring..." : "Complete Setup"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className={`w-full max-w-md mx-auto bg-white/90 backdrop-blur-md rounded-3xl border border-slate-100 shadow-2xl p-8 overflow-hidden relative`}>
      {/* Decorative background glow */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-36 h-36 bg-teal-200/20 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-36 h-36 bg-rose-200/20 rounded-full blur-2xl pointer-events-none" />

      <div className="flex items-center justify-between mb-8 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-teal-600 text-white font-black text-base rounded-xl flex items-center justify-center shadow-lg shadow-teal-500/30">
            S
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-800 tracking-tight leading-none">SpotseReport</h2>
            <span className="text-[10px] text-slate-400 font-bold block mt-0.5">Civic Authentication Portal</span>
          </div>
        </div>
        {onClose && (
          <button 
            onClick={onClose} 
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition cursor-pointer"
          >
            ×
          </button>
        )}
      </div>

      <div className="flex bg-slate-100 p-1.5 rounded-xl mb-6 relative z-10">
        <button
          onClick={() => { setIsRegister(false); setError(null); }}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all duration-150 cursor-pointer ${!isRegister ? "bg-white text-slate-800 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
        >
          <LogIn className="w-3.5 h-3.5 inline-block mr-1.5 -mt-0.5" />
          Sign In
        </button>
        <button
          onClick={() => { setIsRegister(true); setError(null); }}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all duration-150 cursor-pointer ${isRegister ? "bg-white text-slate-800 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
        >
          <UserPlus className="w-3.5 h-3.5 inline-block mr-1.5 -mt-0.5" />
          Register
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-2.5 text-xs text-rose-700 animate-headShake">
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="font-bold">{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-start gap-2.5 text-xs text-emerald-700">
          <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="font-bold">{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleEmailAuth} className="space-y-4 relative z-10">
        {isRegister && (
          <>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Full Name</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  required
                  placeholder="e.g., Jane Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-9.5 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">City</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full pl-9.5 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition cursor-pointer"
                  >
                    {CITIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Phone (Optional)</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input
                    type="tel"
                    placeholder="+91 XXXXX XXXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-9.5 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition"
                  />
                </div>
              </div>
            </div>
          </>
        )}

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Email Address</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="email"
              required
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-9.5 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-9.5 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 bg-teal-600 hover:bg-teal-700 active:scale-98 text-white rounded-xl text-xs font-black tracking-wide shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all duration-150 disabled:opacity-50 mt-2"
        >
          {loading ? "Please wait..." : isRegister ? "Create Account & Get 100 XP" : "Sign In to Portal"}
          {!loading && <ArrowRight className="w-3.5 h-3.5" />}
        </button>
      </form>

      <div className="my-6 flex items-center gap-3 text-slate-300 relative z-10">
        <div className="flex-1 h-[1px] bg-slate-200" />
        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">or use secure sign-in</span>
        <div className="flex-1 h-[1px] bg-slate-200" />
      </div>

      <button
        onClick={handleGoogleSignIn}
        disabled={loading}
        className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-200 active:scale-98 text-slate-700 rounded-xl text-xs font-bold tracking-wide shadow-xs flex items-center justify-center gap-2.5 cursor-pointer transition-all duration-150 disabled:opacity-50 relative z-10"
      >
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
          <path
            fill="#EA4335"
            d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.055 0 12 0 7.27 0 3.198 2.698 1.24 6.65l4.026 3.115z"
          />
          <path
            fill="#4285F4"
            d="M16.04 15.345c-1.012.755-2.4 1.254-4.04 1.254a6.82 6.82 0 0 1-6.643-4.836l-4.116 3.164C3.153 18.913 7.218 21.6 12 21.6c3.136 0 5.89-.982 7.827-2.727l-3.787-3.528z"
          />
          <path
            fill="#FBBC05"
            d="M5.357 11.764a6.828 6.828 0 0 1 0-2.327L1.24 6.322a11.965 11.965 0 0 0 0 8.564l4.117-3.122z"
          />
          <path
            fill="#34A853"
            d="M22.062 12c0-.709-.08-1.473-.243-2.182H12v4.364h5.682C17.27 15.11 16.78 16.14 16.04 16.636l3.787 3.528c2.204-2.037 3.483-5.073 3.483-8.164z"
          />
        </svg>
        Continue with Google
      </button>

      <div className="mt-6 text-center text-[10px] text-slate-400 font-bold leading-relaxed relative z-10">
        <Globe className="w-3.5 h-3.5 inline-block text-teal-500 mr-1 -mt-0.5" />
        SpotseReport uses secure end-to-end Firebase identity servers. By continuing, you agree to local civic service guidelines.
      </div>
    </div>
  );
}
