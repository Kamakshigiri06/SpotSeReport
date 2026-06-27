export type IssueCategory = 'pothole' | 'garbage' | 'streetlight' | 'water' | 'electricity' | 'sewage' | 'encroachment' | 'other';
export type IssueSeverity = 'low' | 'medium' | 'high' | 'critical';
export type IssueStatus = 'pending' | 'validated' | 'assigned' | 'in_progress' | 'resolved' | 'rejected';

export interface Profile {
  id: string;
  full_name: string;
  avatar_url: string;
  phone?: string;
  city: string;
  xp_points: number;
  badge_level: 'Newcomer' | 'Reporter' | 'Validator' | 'Champion' | 'Legend';
  reports_count: number;
  validations_count: number;
  resolved_count: number;
  created_at: string;
}

export interface Report {
  id: string;
  title: string;
  description: string;
  category: IssueCategory;
  severity: IssueSeverity;
  status: IssueStatus;
  lat: number;
  lng: number;
  address: string;
  city: string;
  ward?: string;
  photo_urls: string[];
  video_url?: string;
  ai_category?: string;
  ai_urgency_score?: number; // 1-10
  ai_suggested_authority?: string;
  upvotes_count: number;
  comments_count: number;
  reporter_id: string;
  reporter_name: string;
  reporter_avatar: string;
  assigned_authority?: string;
  assigned_at?: string;
  sla_deadline?: string;
  resolved_at?: string;
  resolution_photo_url?: string;
  resolution_note?: string;
  citizen_rating?: number; // 1-5
  complaint_draft?: string;
  risk_urgency_index?: number; // 1-100
  anti_spoof_score?: number; // 90-99% check
  metadata_telemetry?: {
    device_time: string;
    compass_heading: string;
    device_model: string;
    capture_altitude: string;
  };
  is_offline_draft?: boolean;
  created_at: string;
  updated_at: string;
}

export interface MicroBounty {
  id: string;
  sponsor_name: string;
  sponsor_logo: string;
  title: string;
  description: string;
  reward_text: string;
  reward_xp: number;
  category: IssueCategory;
  location_hint: string;
  before_photo: string;
  after_photo?: string;
  claimed_by_id?: string;
  claimed_by_name?: string;
  status: 'open' | 'claimed' | 'completed';
  created_at: string;
}

export interface Upvote {
  id: string;
  report_id: string;
  user_id: string;
  created_at: string;
}

export interface Comment {
  id: string;
  report_id: string;
  user_id: string;
  user_name: string;
  user_avatar: string;
  content: string;
  photo_url?: string;
  created_at: string;
}

export interface StatusTimeline {
  id: string;
  report_id: string;
  old_status: IssueStatus | '';
  new_status: IssueStatus;
  changed_by: string;
  changed_by_name: string;
  note: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'status_update' | 'upvote' | 'comment' | 'sla_breach' | 'resolution';
  title: string;
  message: string;
  report_id: string;
  read: boolean;
  created_at: string;
}

export interface LeaderboardEntry {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url: string;
  badge_level: string;
  city: string;
  xp_points: number;
  rank: number;
  reports_count: number;
  validations_count: number;
  resolved_count: number;
}
