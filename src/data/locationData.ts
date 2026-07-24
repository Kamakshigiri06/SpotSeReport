export interface CityInfo {
  name: string;
  state: string;
  lat: number;
  lng: number;
}

export const STATES_AND_CITIES: Record<string, { lat: number; lng: number; cities: { name: string; lat: number; lng: number }[] }> = {
  "Karnataka": {
    lat: 12.9716, lng: 77.5946,
    cities: [
      { name: "Bengaluru", lat: 12.9716, lng: 77.5946 },
      { name: "Mysuru", lat: 12.2958, lng: 76.6394 },
      { name: "Mangaluru", lat: 12.9141, lng: 74.8560 },
      { name: "Hubballi", lat: 15.3647, lng: 75.1240 },
      { name: "Belagavi", lat: 15.8497, lng: 74.4977 },
      { name: "Shivamogga", lat: 13.9299, lng: 75.5681 },
      { name: "Ballari", lat: 15.1394, lng: 76.9214 },
      { name: "Tumakuru", lat: 13.3379, lng: 77.1173 },
      { name: "Davanagere", lat: 14.4644, lng: 75.9218 },
      { name: "Kalaburagi", lat: 17.3297, lng: 76.8343 },
    ]
  },
  "Maharashtra": {
    lat: 19.0760, lng: 72.8777,
    cities: [
      { name: "Mumbai", lat: 19.0760, lng: 72.8777 },
      { name: "Pune", lat: 18.5204, lng: 73.8567 },
      { name: "Nagpur", lat: 21.1458, lng: 79.0882 },
      { name: "Thane", lat: 19.2183, lng: 72.9781 },
      { name: "Nashik", lat: 19.9975, lng: 73.7898 },
      { name: "Aurangabad", lat: 19.8762, lng: 75.3433 },
      { name: "Solapur", lat: 17.6599, lng: 75.9064 },
      { name: "Navi Mumbai", lat: 19.0330, lng: 73.0297 },
      { name: "Kolhapur", lat: 16.7050, lng: 74.2433 },
      { name: "Amravati", lat: 20.9374, lng: 77.7796 },
    ]
  },
  "Tamil Nadu": {
    lat: 13.0827, lng: 80.2707,
    cities: [
      { name: "Chennai", lat: 13.0827, lng: 80.2707 },
      { name: "Coimbatore", lat: 11.0168, lng: 76.9558 },
      { name: "Madurai", lat: 9.9252, lng: 78.1198 },
      { name: "Tiruchirappalli", lat: 10.7905, lng: 78.7047 },
      { name: "Salem", lat: 11.6643, lng: 78.1460 },
      { name: "Tirunelveli", lat: 8.7139, lng: 77.7567 },
      { name: "Vellore", lat: 12.9165, lng: 79.1325 },
      { name: "Erode", lat: 11.3410, lng: 77.7172 },
      { name: "Thoothukudi", lat: 8.7642, lng: 78.1348 },
    ]
  },
  "Delhi / NCR": {
    lat: 28.6139, lng: 77.2090,
    cities: [
      { name: "Delhi", lat: 28.6139, lng: 77.2090 },
      { name: "New Delhi", lat: 28.6139, lng: 77.2090 },
      { name: "Noida", lat: 28.5355, lng: 77.3910 },
      { name: "Gurugram", lat: 28.4595, lng: 77.0266 },
      { name: "Faridabad", lat: 28.4089, lng: 77.3178 },
      { name: "Ghaziabad", lat: 28.6692, lng: 77.4538 },
      { name: "Greater Noida", lat: 28.4744, lng: 77.5040 },
    ]
  },
  "Telangana": {
    lat: 17.3850, lng: 78.4867,
    cities: [
      { name: "Hyderabad", lat: 17.3850, lng: 78.4867 },
      { name: "Warangal", lat: 17.9689, lng: 79.5941 },
      { name: "Nizamabad", lat: 18.6725, lng: 78.0941 },
      { name: "Karimnagar", lat: 18.4386, lng: 79.1288 },
      { name: "Khammam", lat: 17.2473, lng: 80.1514 },
    ]
  },
  "West Bengal": {
    lat: 22.5726, lng: 88.3639,
    cities: [
      { name: "Kolkata", lat: 22.5726, lng: 88.3639 },
      { name: "Howrah", lat: 22.5958, lng: 88.2636 },
      { name: "Durgapur", lat: 23.5204, lng: 87.3119 },
      { name: "Siliguri", lat: 26.7271, lng: 88.3953 },
      { name: "Asansol", lat: 23.6889, lng: 86.9661 },
    ]
  },
  "Gujarat": {
    lat: 23.0225, lng: 72.5714,
    cities: [
      { name: "Ahmedabad", lat: 23.0225, lng: 72.5714 },
      { name: "Surat", lat: 21.1702, lng: 72.8311 },
      { name: "Vadodara", lat: 22.3072, lng: 73.1812 },
      { name: "Rajkot", lat: 22.3039, lng: 70.8022 },
      { name: "Bhavnagar", lat: 21.7645, lng: 72.1519 },
      { name: "Gandhinagar", lat: 23.2156, lng: 72.6369 },
    ]
  },
  "Uttar Pradesh": {
    lat: 26.8467, lng: 80.9462,
    cities: [
      { name: "Lucknow", lat: 26.8467, lng: 80.9462 },
      { name: "Kanpur", lat: 26.4499, lng: 80.3319 },
      { name: "Agra", lat: 27.1767, lng: 78.0081 },
      { name: "Varanasi", lat: 25.3176, lng: 82.9739 },
      { name: "Prayagraj", lat: 25.4358, lng: 81.8463 },
      { name: "Meerut", lat: 28.9845, lng: 77.7064 },
      { name: "Aligarh", lat: 27.8974, lng: 78.0880 },
      { name: "Bareilly", lat: 28.3670, lng: 79.4304 },
    ]
  },
  "Kerala": {
    lat: 8.5241, lng: 76.9366,
    cities: [
      { name: "Thiruvananthapuram", lat: 8.5241, lng: 76.9366 },
      { name: "Kochi", lat: 9.9312, lng: 76.2673 },
      { name: "Kozhikode", lat: 11.2588, lng: 75.7804 },
      { name: "Thrissur", lat: 10.5276, lng: 76.2144 },
      { name: "Kollam", lat: 8.8932, lng: 76.6141 },
      { name: "Palakkad", lat: 10.7867, lng: 76.6548 },
    ]
  },
  "Rajasthan": {
    lat: 26.9124, lng: 75.7873,
    cities: [
      { name: "Jaipur", lat: 26.9124, lng: 75.7873 },
      { name: "Jodhpur", lat: 26.2389, lng: 73.0243 },
      { name: "Udaipur", lat: 24.5854, lng: 73.7125 },
      { name: "Kota", lat: 25.2138, lng: 75.8648 },
      { name: "Bikaner", lat: 28.0229, lng: 73.3119 },
      { name: "Ajmer", lat: 26.4499, lng: 74.6399 },
    ]
  },
  "Punjab": {
    lat: 30.7333, lng: 76.7794,
    cities: [
      { name: "Chandigarh", lat: 30.7333, lng: 76.7794 },
      { name: "Ludhiana", lat: 30.9010, lng: 75.8573 },
      { name: "Amritsar", lat: 31.6340, lng: 74.8723 },
      { name: "Jalandhar", lat: 31.3260, lng: 75.5762 },
      { name: "Patiala", lat: 30.3398, lng: 76.3869 },
    ]
  },
  "Haryana": {
    lat: 28.4595, lng: 77.0266,
    cities: [
      { name: "Gurugram", lat: 28.4595, lng: 77.0266 },
      { name: "Faridabad", lat: 28.4089, lng: 77.3178 },
      { name: "Panipat", lat: 29.3909, lng: 76.9635 },
      { name: "Ambala", lat: 30.3782, lng: 76.7767 },
      { name: "Karnal", lat: 29.6857, lng: 76.9905 },
    ]
  },
  "Madhya Pradesh": {
    lat: 23.2599, lng: 77.4126,
    cities: [
      { name: "Bhopal", lat: 23.2599, lng: 77.4126 },
      { name: "Indore", lat: 22.7196, lng: 75.8577 },
      { name: "Gwalior", lat: 26.2183, lng: 78.1828 },
      { name: "Jabalpur", lat: 23.1815, lng: 79.9864 },
      { name: "Ujjain", lat: 23.1765, lng: 75.7885 },
    ]
  },
  "Bihar": {
    lat: 25.5941, lng: 85.1376,
    cities: [
      { name: "Patna", lat: 25.5941, lng: 85.1376 },
      { name: "Gaya", lat: 24.7914, lng: 85.0002 },
      { name: "Bhagalpur", lat: 25.2425, lng: 86.9842 },
      { name: "Muzaffarpur", lat: 26.1209, lng: 85.3647 },
    ]
  },
  "Odisha": {
    lat: 20.2961, lng: 85.8245,
    cities: [
      { name: "Bhubaneswar", lat: 20.2961, lng: 85.8245 },
      { name: "Cuttack", lat: 20.4625, lng: 85.8828 },
      { name: "Rourkela", lat: 22.2604, lng: 84.8536 },
      { name: "Puri", lat: 19.8135, lng: 85.8312 },
    ]
  },
  "Andhra Pradesh": {
    lat: 17.6868, lng: 83.2185,
    cities: [
      { name: "Visakhapatnam", lat: 17.6868, lng: 83.2185 },
      { name: "Vijayawada", lat: 16.5062, lng: 80.6480 },
      { name: "Guntur", lat: 16.3067, lng: 80.4365 },
      { name: "Nellore", lat: 14.4426, lng: 79.9865 },
      { name: "Tirupati", lat: 13.6288, lng: 79.4192 },
    ]
  },
  "Assam": {
    lat: 26.1445, lng: 91.7362,
    cities: [
      { name: "Guwahati", lat: 26.1445, lng: 91.7362 },
      { name: "Silchar", lat: 24.8333, lng: 92.7789 },
      { name: "Dibrugarh", lat: 27.4728, lng: 94.9120 },
    ]
  },
  "Jharkhand": {
    lat: 23.3441, lng: 85.3096,
    cities: [
      { name: "Ranchi", lat: 23.3441, lng: 85.3096 },
      { name: "Jamshedpur", lat: 22.8046, lng: 86.2029 },
      { name: "Dhanbad", lat: 23.7957, lng: 86.4304 },
    ]
  },
  "Chhattisgarh": {
    lat: 21.2514, lng: 81.6296,
    cities: [
      { name: "Raipur", lat: 21.2514, lng: 81.6296 },
      { name: "Bhilai", lat: 21.1938, lng: 81.3509 },
      { name: "Bilaspur", lat: 22.0797, lng: 82.1391 },
    ]
  }
};

export const ALL_STATES = Object.keys(STATES_AND_CITIES);

export const ALL_CITIES = Array.from(
  new Set(Object.values(STATES_AND_CITIES).flatMap(s => s.cities.map(c => c.name)))
);

export function getStateForCity(cityName?: string): string {
  if (!cityName) return "";
  const nameLower = cityName.toLowerCase();
  for (const [state, data] of Object.entries(STATES_AND_CITIES)) {
    for (const c of data.cities) {
      if (c.name.toLowerCase() === nameLower) {
        return state;
      }
    }
  }
  return "";
}

export function getLocationCoordinates(locationName: string): { lat: number; lng: number } | null {
  if (!locationName || locationName === "all") return null;
  const nameLower = locationName.toLowerCase();
  
  // Check state first
  for (const [state, data] of Object.entries(STATES_AND_CITIES)) {
    if (state.toLowerCase() === nameLower) {
      return { lat: data.lat, lng: data.lng };
    }
  }

  // Check city
  for (const data of Object.values(STATES_AND_CITIES)) {
    for (const c of data.cities) {
      if (c.name.toLowerCase() === nameLower) {
        return { lat: c.lat, lng: c.lng };
      }
    }
  }

  return null;
}
