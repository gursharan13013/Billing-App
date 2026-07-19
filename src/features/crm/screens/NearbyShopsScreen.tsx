import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Search, Loader2, Phone, MapPin, ChevronRight, User, Wifi, WifiOff, Database, RefreshCw, Send } from 'lucide-react';
import { db } from '../../../services/firebase';
import { collection, getDocs } from 'firebase/firestore';

export interface Shop {
    id: string;
    name: string;
    category: string;
    address?: string;
    mobile?: string;
    lat: number;
    long: number;
    dist_km: number;
    gstin?: string;
    pan?: string;
    email?: string;
    city?: string;
    state?: string;
    pincode?: string;
    business_type?: string;
    bankDetails?: string;
    isGstRegistered?: boolean;
}

// Haversine distance calculation
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
  return R * c; // Distance in km
}
import { billingService, ChatMessage } from '../../../services/billingService';
import { Party, UNIFIED_CATEGORIES } from '../../../core/types/';
import { sendCloudMessage } from '../../../services/firebaseService';


// Default Location (New Delhi) - Fallback if GPS fails
const DEFAULT_LAT = 28.6139;
const DEFAULT_LNG = 77.2090;

interface NearbyShopsScreenProps {
  onBack: () => void;
}

export const NearbyShopsScreen: React.FC<NearbyShopsScreenProps> = ({ onBack }) => {
  const lang = (localStorage.getItem('language') || 'en') as 'en' | 'hi';
  const isHi = lang === 'hi';
  const t = {
    searchProfile: isHi ? 'आस-पास के वेंडर खोजें' : 'Search Profile',
    gpsError: isHi ? 'जीपीएस त्रुटि:' : 'GPS Error:',
    gpsErrorMsg: isHi ? 'आपकी सटीक स्थिति प्राप्त नहीं हो सकी। डिफ़ॉल्ट स्थान (नई दिल्ली) का उपयोग किया जा रहा है। दूरियां गलत हो सकती हैं। कृपया स्थान अनुमतियां सक्षम करें।' : 'Could not get your precise location. Using default location (New Delhi). Distances may be inaccurate. Please enable Location permissions.',
    fetchingGps: isHi ? 'जीपीएस प्राप्त किया जा रहा है...' : 'Fetching GPS...',
    fetchingGpsMsg: isHi ? 'सटीक दूरियों के लिए आपका स्थान प्राप्त किया जा रहा है।' : 'Getting your precise location for accurate distances.',
    searchDistance: isHi ? 'खोज दूरी' : 'Search Distance',
    searching: isHi ? 'खोजा जा रहा है...' : 'SEARCHING...',
    searchingNearby: isHi ? 'आस-पास के प्रोफ़ाइल खोजे जा रहे हैं...' : 'Searching nearby profiles...',
    distance: isHi ? 'दूरी' : 'Distance',
    gstin: isHi ? 'जीएसटीआईएन (GSTIN)' : 'GSTIN',
    email: isHi ? 'ईमेल' : 'EMAIL',
    sending: isHi ? 'भेजा जा रहा है...' : 'Sending...',
    sendRequest: isHi ? 'अनुरोध भेजें' : 'Send Request',
    addCustomer: isHi ? 'ग्राहक जोड़ें?' : 'Add Customer?',
    includes: isHi ? 'शामिल हैं:' : 'Includes:',
    mobileNo: isHi ? 'मोबाइल नंबर' : 'Mobile No',
    fullAddress: isHi ? 'पूरा पता' : 'Full Address',
    emailId: isHi ? 'ईमेल आईडी' : 'Email ID',
    bankDetails: isHi ? 'बैंक विवरण' : 'Bank Details',
    cancel: isHi ? 'रद्द करें' : 'Cancel',
    confirm: isHi ? 'पुष्टि करें' : 'Confirm',
    searchCategory: isHi ? 'श्रेणी खोजें...' : 'Search Category...',
    selectCategory: isHi ? 'दुकानें खोजने के लिए श्रेणी चुनें' : 'Select a category to find shops',
    noShopsFound: (cat: string) => isHi ? `"${cat}" के लिए कोई दुकानें नहीं मिलीं।` : `No shops found for "${cat}".`,
    connectionFailed: isHi ? 'कनेक्शन विफल या कोई दुकान नहीं मिली।' : 'Could not connect to Firebase or no shops found.'
  };

  // Main State
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<'fetching' | 'success' | 'failed'>('fetching');
  const [hasSearched, setHasSearched] = useState(false);
  
  // Connection Status State
  const [connectionStatus, setConnectionStatus] = useState<'online' | 'offline' | 'setup_needed' | null>(null);

  // View Mode: 'categories' (Step 1: List matched categories) OR 'shops' (Step 2: List shops)
  const [viewMode, setViewMode] = useState<'categories' | 'shops'>('categories');
  const [matchedCategories, setMatchedCategories] = useState<{en: string, hi: string}[]>([]);

  // Filter State
  const [searchRadius, setSearchRadius] = useState<number>(10); // Default 10km
  const [categoryQuery, setCategoryQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Modal State
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [sendingShopId, setSendingShopId] = useState<string | null>(null);

  useEffect(() => {
      getUserLocation();
  }, []);

  const getUserLocation = () => {
      setLocationStatus('fetching');
      if (!navigator.geolocation) {
          setUserLocation({ lat: DEFAULT_LAT, lng: DEFAULT_LNG });
          setLocationStatus('failed');
          return;
      }

      // Add visual feedback that it's getting location
      setConnectionStatus(null);
      
      navigator.geolocation.getCurrentPosition(
          (position) => {
              setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
              setLocationStatus('success');
          },
          (error) => {
              console.warn("GPS Failed, using default:", error);
              setUserLocation({ lat: DEFAULT_LAT, lng: DEFAULT_LNG });
              setLocationStatus('failed');
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
  };

  // Mock data removed per user request - strictly using Supabase now

  // Step 1: Handle Search Button Click
  const handleSearchClick = () => {
      if (!categoryQuery) {
          alert("Please enter a business name or category.");
          return;
      }
      
      setShowSuggestions(false);
      setHasSearched(true);
      setShops([]); // Clear previous results
      setConnectionStatus(null); // Reset status

      // Check for Exact Category Match first (e.g., if user already selected a category)
      const lowerQ = categoryQuery.toLowerCase().trim();
      const exactMatch = UNIFIED_CATEGORIES.find(c => 
          c.en.toLowerCase() === lowerQ || 
          c.hi === categoryQuery.trim()
      );

      if (exactMatch) {
          fetchShops(exactMatch.en);
          return;
      }

      // Check for partial Category Matches
      const matches = UNIFIED_CATEGORIES.filter(c => 
          c.en.toLowerCase().includes(lowerQ) || 
          c.hi.includes(lowerQ)
      );

      if (matches.length > 0) {
          // If categories match, show Category List first
          setMatchedCategories(matches);
          setViewMode('categories');
      } else {
          // If no specific category match, search shops directly (by name)
          fetchShops(categoryQuery);
      }
  };

  // Step 2: Fetch Shops (When category is clicked or direct search)
  const fetchShops = async (query: string) => {
      setViewMode('shops'); // Switch view immediately
      setLoading(true);
      setShops([]); // Clear list so user sees loading state
      setHasSearched(true); // Ensure UI shows results header
      setConnectionStatus(null);
      
      // Use current location or fallback
      const lat = userLocation?.lat || DEFAULT_LAT;
      const long = userLocation?.lng || DEFAULT_LNG;

      console.log(`Searching Firebase for: ${query} within ${searchRadius}km`);

      try {
          const querySnapshot = await getDocs(collection(db, 'company_profile'));
          let fetchedShops: Shop[] = [];
          
          querySnapshot.forEach((doc) => {
              const data = doc.data();
              if (data.latitude && data.longitude) {
                  const dist = getDistance(lat, long, data.latitude, data.longitude);
                  if (dist <= searchRadius) {
                      fetchedShops.push({
                          id: doc.id,
                          name: data.name || '',
                          category: data.business_category || '',
                          address: data.address || '',
                          mobile: data.mobile || '',
                          lat: data.latitude,
                          long: data.longitude,
                          dist_km: dist,
                          gstin: data.gstin,
                          pan: data.pan,
                          email: data.email,
                          city: data.city,
                          state: data.state,
                          pincode: data.pincode,
                          business_type: data.business_type,
                          bankDetails: data.bank_details,
                          isGstRegistered: data.is_gst_registered
                      });
                  }
              }
          });
          
          // Sort by distance
          fetchedShops.sort((a, b) => a.dist_km - b.dist_km);
          
          // Client-side filtering for category or name
          const lowerQ = query.toLowerCase();
          fetchedShops = fetchedShops.filter(s => 
              (s.category && s.category.toLowerCase().includes(lowerQ)) ||
              (s.name && s.name && s.name.toLowerCase().includes(lowerQ))
          );

          if (fetchedShops.length > 0) {
              setShops(fetchedShops);
              setConnectionStatus('online');
          } else {
              setShops([]);
              setConnectionStatus('online');
          }

      } catch (err: any) {
          console.error("Firebase Error:", err);
          setShops([]); // Ensure no mock data is shown
          setConnectionStatus('offline');
      } finally {
          setLoading(false);
      }
  };

  const handleCategoryResultClick = (cat: {en: string, hi: string}) => {
      setCategoryQuery(cat.en); 
      // Force search for this specific English category name (as stored in DB)
      fetchShops(cat.en); 
  };

  // UPDATED: Now accepts the full category object to extract just the English name
  const handleSuggestionClick = (cat: {en: string, hi: string}) => {
      // Set only the English name so it matches the DB "category" column exactly
      setCategoryQuery(cat.en);
      setShowSuggestions(false);
      // Automatically trigger search with the correct English term
      fetchShops(cat.en);
  };

  const handleAddClick = (shop: Shop) => {
      setSelectedShop(shop);
      setShowConfirmModal(true);
  };

  const handleSendRequest = async (shop: Shop) => {
      try {
          if (sendingShopId) return; // Prevent double clicks
          setSendingShopId(shop.id);
          
          if (!shop.mobile) {
              alert("This shop does not have a registered mobile number to receive requests.");
              setSendingShopId(null);
              return;
          }

          // Check if party already exists by mobile or name
          let existingParty = await billingService.getPartyByMobile(shop.mobile);
          
          if (!existingParty) {
              existingParty = await billingService.getPartyByName(shop.name);
          }

          const partyId = existingParty ? existingParty.id : Math.random().toString(36).substr(2, 9);
          
          let profile = await billingService.getCompanyProfile();

          // Create or Update party locally so that Chat window works
          const newParty: Party = {
              id: partyId,
              name: shop.name,
              mobile: shop.mobile,
              gstin: shop.gstin || '',
              pan: shop.pan || '',
              email: shop.email || '',
              address: shop.address || '',
              city: shop.city || '',
              state: shop.state || '',
              pincode: shop.pincode || '',
              type: existingParty ? existingParty.type : 'Customer',
              accountGroup: existingParty ? existingParty.accountGroup : 'Sundry Debtors',
              currentBalance: existingParty ? existingParty.currentBalance : 0,
              isLocal: true,
              category: shop.category,
              bankDetails: shop.bankDetails,
              isGstRegistered: shop.isGstRegistered
          };

          await billingService.saveParty(newParty);

          const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          
          // Send Profile info as contact
          const contactPayload: ChatMessage = {
              id: Math.random().toString(36).substr(2, 9),
              partyId: partyId,
              text: profile.name || 'User',
              contentUrl: `${profile.businessCategory || ''} | ${profile.mobile || ''}`,
              isSent: true,
              time: time,
              type: 'contact'
          };
          
          try {
              await sendCloudMessage(contactPayload, shop.mobile);
          } catch(e: any) {
              alert("Failed to send profile: " + (e.message || "Unknown error"));
              return;
          }

          // Send Text request
          const textPayload: ChatMessage = {
              id: Math.random().toString(36).substr(2, 9),
              partyId: partyId,
              text: `Hello! I would like to connect and see your items. Please share your Item List with me.`,
              isSent: true,
              time: time,
              type: 'text'
          };
          
          try {
              await sendCloudMessage(textPayload, shop.mobile);
          } catch(e: any) {
              alert("Failed to send request message: " + (e.message || "Unknown error"));
              setSendingShopId(null);
              return;
          }
          
          alert(`Sent Profile to ${shop.name} along with the Items List Request!`);
      } catch (e: any) {
          console.error("Error connecting to shop", e);
          alert("Failed to prepare request: " + (e.message || "Unknown error"));
      } finally {
          setSendingShopId(null);
      }
  };

  const confirmAddCustomer = async () => {
      if (!selectedShop) return;

      try {
          // Check if party already exists by mobile or name
          let existingParty;
          if (selectedShop.mobile) {
              existingParty = await billingService.getPartyByMobile(selectedShop.mobile);
          }
          if (!existingParty) {
              existingParty = await billingService.getPartyByName(selectedShop.name);
          }

          const partyId = existingParty ? existingParty.id : Math.random().toString(36).substr(2, 9);

          // MAP ALL SERVER DATA TO LOCAL PARTY OBJECT
          const newParty: Party = {
              id: partyId,
              name: selectedShop.name,
              mobile: selectedShop.mobile || '',
              // Map Server fields to Party Fields
              gstin: selectedShop.gstin || '',
              pan: selectedShop.pan || '',
              email: selectedShop.email || '',
              address: selectedShop.address || '',
              city: selectedShop.city || '',
              state: selectedShop.state || '',
              pincode: selectedShop.pincode || '',
              
              // Default fields
              type: existingParty ? existingParty.type : 'Customer',
              accountGroup: existingParty ? existingParty.accountGroup : 'Sundry Debtors',
              currentBalance: existingParty ? existingParty.currentBalance : 0, // Preserve existing balance
              isLocal: true,
              category: selectedShop.category,
              bankDetails: selectedShop.bankDetails,
              isGstRegistered: selectedShop.isGstRegistered
          };

          await billingService.saveParty(newParty);
          setShowConfirmModal(false);
          alert(`${selectedShop.name} has been ${existingParty ? 'updated in' : 'added to'} your Customer list with full details.`);
      } catch (e) {
          console.error("Error saving party", e);
          alert("Failed to save.");
      }
  };

  const filteredCategories = useMemo(() => {
      if (!categoryQuery) return [];
      return UNIFIED_CATEGORIES.filter(c => 
          c.en.toLowerCase().includes(categoryQuery.toLowerCase()) || 
          c.hi.includes(categoryQuery)
      );
  }, [categoryQuery]);

  // Specific Blue color from screenshots
  const THEME_BLUE = "bg-[#283593]"; 

  return (
    <div className="flex flex-col h-full bg-[var(--bg-app)] text-[var(--text-main)] pb-[max(env(safe-area-inset-bottom),0px)]">
      {/* Header */}
      <header className="bg-[var(--bg-card)] border-b border-[var(--border-ui)] text-[var(--text-main)] p-4 pt-[max(env(safe-area-inset-top),48px)] flex items-center gap-3 shadow-sm shrink-0 sticky top-0 z-20">
        <button onClick={onBack} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"><ArrowLeft size={24} /></button>
        <h1 className="text-lg font-black tracking-tight">{t.searchProfile}</h1>
        <button 
            onClick={getUserLocation} 
            className="ml-auto p-2 bg-slate-100 dark:bg-slate-800 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            title="Refresh Location"
        >
            <MapPin size={20} className="text-[var(--text-main)]" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto">
          {/* Controls Section */}
          <div className="p-4 bg-[var(--bg-card)] border-b border-[var(--border-ui)] shadow-sm">
              
              {locationStatus === 'failed' && (
                  <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-950/20 text-yellow-800 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-900/10 rounded-xl text-xs">
                      <strong>{t.gpsError}</strong> {t.gpsErrorMsg}
                  </div>
              )}
              {locationStatus === 'fetching' && (
                  <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950/20 text-blue-800 dark:text-blue-400 border border-blue-200 dark:border-blue-900/10 rounded-xl text-xs flex items-center justify-between">
                      <span><strong>{t.fetchingGps}</strong> {t.fetchingGpsMsg}</span>
                      <Loader2 size={16} className="animate-spin" />
                  </div>
              )}

              {/* Distance Slider */}
              <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                      <label className="text-xs font-black text-[var(--text-secondary)] uppercase tracking-wider">{t.searchDistance}</label>
                      <span className="text-[var(--brand-primary)] font-black text-lg">{searchRadius} KM</span>
                  </div>
                  <input 
                      type="range" 
                      min="1" 
                      max="10000" 
                      value={searchRadius} 
                      onChange={(e) => setSearchRadius(Number(e.target.value))}
                      className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[var(--brand-primary)]"
                  />
                  <div className="flex justify-between text-[10px] font-mono tracking-widest text-[var(--text-secondary)] mt-1 uppercase">
                      <span>1 KM</span>
                      <span>10000 KM</span>
                  </div>
              </div>

              {/* Search Input */}
              <div className="relative mb-4">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <input 
                      type="text" 
                      value={categoryQuery}
                      onChange={(e) => {
                          setCategoryQuery(e.target.value);
                          setShowSuggestions(true);
                      }}
                      onFocus={() => setShowSuggestions(true)}
                      className="w-full border border-[var(--border-ui)] rounded-xl p-3 pl-10 text-sm text-[var(--text-main)] bg-[var(--bg-app)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/20 transition-all font-semibold"
                      placeholder={isHi ? 'श्रेणी खोजें (जैसे डेयरी, किराना)' : 'Search Category (e.g. Dairy, Grocery)'}
                  />
                  {/* Suggestions */}
                  {showSuggestions && categoryQuery && filteredCategories.length > 0 && (
                      <div className="absolute z-10 w-full bg-[var(--bg-card)] border border-[var(--border-ui)] shadow-xl mt-1 max-h-60 overflow-y-auto rounded-xl">
                          {filteredCategories.map((cat, idx) => (
                              <div 
                                  key={idx} 
                                  className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer text-[var(--text-main)] font-semibold border-b border-[var(--border-ui)] flex justify-between items-center"
                                  onClick={() => handleSuggestionClick(cat)}
                              >
                                  <span>{cat.hi} - {cat.en}</span>
                                  <ChevronRight size={16} className="text-gray-400" />
                              </div>
                          ))}
                      </div>
                  )}
              </div>

              {/* Search Button */}
              <button 
                onClick={handleSearchClick}
                disabled={loading}
                className="w-full bg-[var(--brand-primary)] hover:bg-[var(--brand-hover)] text-white py-3.5 rounded-xl text-sm font-black shadow-md active:scale-[0.98] transition-all uppercase tracking-widest disabled:opacity-70 disabled:cursor-not-allowed"
              >
                  {loading ? (
                      <div className="flex items-center justify-center gap-2">
                          <Loader2 size={18} className="animate-spin" />
                          <span>{t.searching}</span>
                      </div>
                  ) : (isHi ? 'खोजें' : 'SEARCH')}
              </button>
          </div>

          {/* Results Area */}
          <div className="p-4 pb-20 bg-[var(--bg-app)] min-h-[300px]">

              {/* Connection Status Indicator */}
              {connectionStatus && viewMode === 'shops' && (
                  <div className={`mb-4 p-3 rounded-xl flex items-start gap-3 text-xs border ${
                      connectionStatus === 'online' ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/10' :
                      connectionStatus === 'setup_needed' ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-400 border-amber-200 dark:border-amber-900/10' :
                      'bg-rose-50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-400 border-rose-200 dark:border-rose-900/10'
                  }`}>
                      {connectionStatus === 'online' ? <Database size={18} className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" /> :
                       connectionStatus === 'setup_needed' ? <Database size={18} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" /> :
                       <WifiOff size={18} className="mt-0.5 shrink-0 text-rose-600 dark:text-rose-400" />}
                      
                      <div>
                          <p className="font-extrabold uppercase tracking-wider text-[10px]">
                              {connectionStatus === 'online' ? (isHi ? 'लाइव डेटाबेस जुड़ा हुआ है' : 'Live Database Connected') :
                               connectionStatus === 'setup_needed' ? (isHi ? 'डेटाबेस सेटअप आवश्यक' : 'Database Setup Required') :
                               (isHi ? 'कनेक्शन विफल' : 'Connection Failed')}
                          </p>
                          <p className="opacity-90 mt-1 font-medium">
                              {connectionStatus === 'online' ? (isHi ? 'फायरबेस से वास्तविक समय परिणाम दिखा रहा है।' : 'Showing real-time results from Firebase.') :
                               t.connectionFailed}
                          </p>
                      </div>
                  </div>
              )}

              {hasSearched && !loading && (
                  <div className="flex items-center justify-between mb-3">
                      <div className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-wider">
                          {viewMode === 'categories' ? (isHi ? 'पाई गई श्रेणियां' : 'FOUND CATEGORIES') : (isHi ? `खोज परिणाम (${shops.length})` : `SEARCH RESULTS (${shops.length})`)}
                      </div>
                      {viewMode === 'shops' && (
                          <button onClick={() => setViewMode('categories')} className="text-xs text-[var(--brand-primary)] font-black hover:underline uppercase tracking-wider">
                              {isHi ? 'श्रेणियों पर वापस जाएं' : 'Back to Categories'}
                          </button>
                      )}
                  </div>
              )}

              {/* Loading State - Center Screen */}
              {loading && (
                  <div className="flex flex-col items-center justify-center py-12 animate-in fade-in">
                      <div className="bg-[var(--bg-card)] p-4 rounded-full shadow-md mb-3">
                          <Loader2 size={32} className="animate-spin text-[var(--brand-primary)]" />
                      </div>
                      <p className="text-[var(--text-secondary)] font-bold text-sm">{t.searchingNearby}</p>
                  </div>
              )}

              {!loading && (
                  <div className="space-y-3">
                      {/* View Mode: CATEGORIES (Step 1) */}
                      {viewMode === 'categories' && hasSearched && (
                          matchedCategories.length > 0 ? (
                              matchedCategories.map((cat, idx) => (
                                  <div 
                                    key={idx} 
                                    onClick={() => handleCategoryResultClick(cat)}
                                    className="bg-[var(--bg-card)] p-4 rounded-xl border border-[var(--border-ui)] shadow-sm flex justify-between items-center cursor-pointer hover:border-[var(--brand-primary)] hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-all group"
                                  >
                                      <div className="text-[var(--text-main)] font-black text-lg group-hover:text-[var(--brand-primary)]">
                                          {lang === 'hi' ? `${cat.hi} (${cat.en})` : `${cat.en} - ${cat.hi}`}
                                      </div>
                                      <div className="bg-[var(--bg-app)] p-2 rounded-full group-hover:bg-[var(--brand-primary)]/10 transition-colors">
                                          <ChevronRight size={20} className="text-[var(--text-secondary)] group-hover:text-[var(--brand-primary)]" />
                                      </div>
                                  </div>
                              ))
                          ) : (
                              <div className="text-center py-10 text-[var(--text-secondary)] font-medium">
                                  {isHi ? 'कोई श्रेणियां नहीं मिलीं। सीधे व्यवसाय नाम से खोजने का प्रयास करें।' : 'No categories found. Try searching by business name directly.'}
                              </div>
                          )
                      )}

                      {/* View Mode: SHOPS (Step 2) */}
                      {viewMode === 'shops' && (
                          shops.length > 0 ? (
                              shops.map((shop) => (
                                  <div key={shop.id} className="bg-[var(--bg-card)] p-4 rounded-xl border border-[var(--border-ui)] shadow-sm flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-2">
                                      <div className="flex justify-between items-start border-b border-[var(--border-ui)] pb-2 mb-1">
                                          <div>
                                              <div className="text-[var(--text-main)] font-black text-lg">{shop.name}</div>
                                              <div className="text-xs text-[var(--text-secondary)] font-black uppercase tracking-wider bg-[var(--bg-app)] px-2 py-0.5 rounded w-fit mt-1 border border-[var(--border-ui)]">
                                                  {shop.category}
                                              </div>
                                          </div>
                                          <div className="flex flex-col items-end">
                                              <span className="text-sm font-black text-[var(--brand-primary)]">{shop.dist_km.toFixed(1)} KM</span>
                                              <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-bold">{t.distance}</span>
                                          </div>
                                      </div>
                                      
                                      <div className="text-sm text-[var(--text-secondary)] flex items-center gap-2">
                                          <Phone size={14} className="text-[var(--text-secondary)] opacity-60" /> 
                                          <span className="font-semibold">{shop.mobile || 'N/A'}</span>
                                      </div>
                                      
                                      <div className="text-sm text-[var(--text-secondary)] flex items-start gap-2 mb-2">
                                          <MapPin size={14} className="text-[var(--text-secondary)] opacity-60 mt-0.5" /> 
                                          <span className="font-medium">{shop.address || 'Address not available'}</span>
                                      </div>
                                      
                                      {/* Show available data indicator */}
                                      <div className="flex gap-2 mb-2">
                                          {shop.gstin && <span className="text-[10px] font-bold bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded border border-green-100 dark:border-green-900/10">GSTIN</span>}
                                          {shop.email && <span className="text-[10px] font-bold bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 px-1.5 py-0.5 rounded border border-blue-100 dark:border-blue-900/10">EMAIL</span>}
                                          {shop.city && <span className="text-[10px] font-bold bg-purple-50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-400 px-1.5 py-0.5 rounded border border-purple-100 dark:border-purple-900/10">{shop.city}</span>}
                                      </div>

                                      <div className="flex gap-3 pt-1">
                                          <button 
                                            onClick={() => handleAddClick(shop)}
                                            className="flex-1 bg-[var(--brand-primary)] hover:bg-[var(--brand-hover)] text-white py-2.5 rounded-xl text-sm font-black shadow active:scale-95 transition-all flex items-center justify-center gap-2"
                                          >
                                              <User size={16} /> {isHi ? 'ग्राहक जोड़ें' : 'Add Customer'}
                                          </button>
                                          <a 
                                            href={`tel:${shop.mobile}`}
                                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl text-sm font-black shadow active:scale-95 transition-all text-center flex items-center justify-center gap-2"
                                          >
                                              <Phone size={16} /> {isHi ? 'कॉल करें' : 'Call'}
                                          </a>
                                      </div>
                                      <button 
                                          onClick={() => !sendingShopId && handleSendRequest(shop)}
                                          disabled={sendingShopId === shop.id}
                                          className={`w-full mt-1 bg-purple-600 hover:bg-purple-700 text-white py-2.5 rounded-xl text-sm font-black shadow transition-all flex items-center justify-center gap-2 ${sendingShopId === shop.id ? 'opacity-70 cursor-not-allowed' : 'active:scale-95'}`}
                                      >
                                          {sendingShopId === shop.id ? (
                                              <><Loader2 size={16} className="animate-spin" /> {t.sending}</>
                                          ) : (
                                              <><Send size={16} /> {t.sendRequest}</>
                                          )}
                                      </button>
                                  </div>
                              ))
                          ) : (
                              <div className="flex flex-col items-center justify-center py-10 text-[var(--text-secondary)] text-center">
                                  <div className="bg-[var(--bg-card)] border border-[var(--border-ui)] p-4 rounded-full mb-3">
                                      <Search size={32} className="text-[var(--text-secondary)] opacity-50" />
                                  </div>
                                  <p className="font-bold text-sm">{t.noShopsFound(categoryQuery)}</p>
                                  <p className="text-xs mt-2 max-w-[200px] opacity-80">
                                      {isHi ? 'कृपया ऊपर खोज दूरी बढ़ाने का प्रयास करें।' : 'Try increasing the search distance slider above.'}
                                  </p>
                                  <button onClick={() => setViewMode('categories')} className="mt-4 text-[var(--brand-primary)] font-black hover:underline text-sm uppercase tracking-wider">
                                      {isHi ? 'दूसरी श्रेणी आज़माएं' : 'Try a different category'}
                                  </button>
                              </div>
                          )
                      )}
                  </div>
              )}
          </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && selectedShop && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-[var(--bg-card)] border border-[var(--border-ui)] rounded-2xl shadow-2xl w-full max-w-xs overflow-hidden transform transition-all scale-100">
                  <div className="p-4 border-b border-[var(--border-ui)] bg-[var(--bg-app)]">
                      <h3 className="font-black text-base text-[var(--text-main)]">{t.addCustomer}</h3>
                  </div>
                  <div className="p-5">
                      <p className="text-[var(--text-secondary)] text-sm mb-2">
                          {isHi ? (
                            <>क्या आप <span className="font-black text-[var(--text-main)]">{selectedShop.name}</span> को अपने ग्राहक सूची में जोड़ना चाहते हैं?</>
                          ) : (
                            <>Do you want to add <span className="font-bold text-[var(--text-main)]">{selectedShop.name}</span> to your customer list?</>
                          )}
                      </p>
                      <div className="text-xs text-[var(--text-secondary)] bg-[var(--bg-app)] p-3 rounded-xl border border-[var(--border-ui)] font-medium">
                          <strong>{t.includes}</strong>
                          <ul className="list-disc pl-4 mt-1 space-y-0.5 font-semibold text-[var(--text-main)]">
                              {selectedShop.mobile && <li>{t.mobileNo}</li>}
                              {selectedShop.gstin && <li>{t.gstin}</li>}
                              {selectedShop.address && <li>{t.fullAddress}</li>}
                              {selectedShop.email && <li>{t.emailId}</li>}
                              {selectedShop.bankDetails && <li>{t.bankDetails}</li>}
                          </ul>
                      </div>
                  </div>
                  <div className="flex justify-end gap-3 p-4 pt-0">
                      <button 
                          onClick={() => setShowConfirmModal(false)}
                          className="px-4 py-2 rounded-xl font-bold text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-app)] transition-colors uppercase tracking-wider"
                      >
                          {t.cancel}
                      </button>
                      <button 
                          onClick={confirmAddCustomer}
                          className="px-5 py-2.5 rounded-xl font-black text-xs text-white bg-[var(--brand-primary)] hover:bg-[var(--brand-hover)] shadow-md transition-colors uppercase tracking-wider"
                      >
                          {isHi ? 'जोड़ें' : 'ADD'}
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
