import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Search, Loader2, Phone, MapPin, ChevronRight, User, Wifi, WifiOff, Database, RefreshCw, Send } from 'lucide-react';
import { db } from '../services/firebase';
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
import { billingService, ChatMessage } from '../services/billingService';
import { Party, UNIFIED_CATEGORIES } from '../core/types/';
import { sendCloudMessage } from '../services/firebaseService';


// Default Location (New Delhi) - Fallback if GPS fails
const DEFAULT_LAT = 28.6139;
const DEFAULT_LNG = 77.2090;

interface NearbyShopsScreenProps {
  onBack: () => void;
}

export const NearbyShopsScreen: React.FC<NearbyShopsScreenProps> = ({ onBack }) => {
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
    <div className="flex flex-col h-full bg-slate-50 pb-[max(env(safe-area-inset-bottom),0px)]">
      {/* Header */}
      <header className={`${THEME_BLUE} text-white p-4 pt-[max(env(safe-area-inset-top),48px)] flex items-center gap-3 shadow-md shrink-0 sticky top-0 z-20`}>
        <button onClick={onBack}><ArrowLeft size={24} /></button>
        <h1 className="text-xl font-bold">Search Profile</h1>
        <button 
            onClick={getUserLocation} 
            className="ml-auto p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
            title="Refresh Location"
        >
            <MapPin size={20} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto">
          {/* Controls Section */}
          <div className="p-4 bg-white border-b border-gray-200 shadow-sm">
              
              {locationStatus === 'failed' && (
                  <div className="mb-4 p-3 bg-yellow-50 text-yellow-800 border border-yellow-200 rounded-lg text-xs">
                      <strong>GPS Error:</strong> Could not get your precise location. Using default location (New Delhi). Distances may be inaccurate. Please enable Location permissions.
                  </div>
              )}
              {locationStatus === 'fetching' && (
                  <div className="mb-4 p-3 bg-blue-50 text-blue-800 border border-blue-200 rounded-lg text-xs flex items-center justify-between">
                      <span><strong>Fetching GPS...</strong> Getting your precise location for accurate distances.</span>
                      <Loader2 size={16} className="animate-spin" />
                  </div>
              )}

              {/* Distance Slider */}
              <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-bold text-slate-700">Search Distance</label>
                      <span className="text-blue-600 font-extrabold text-lg">{searchRadius} KM</span>
                  </div>
                  <input 
                      type="range" 
                      min="1" 
                      max="10000" 
                      value={searchRadius} 
                      onChange={(e) => setSearchRadius(Number(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#283593]"
                  />
                  <div className="flex justify-between text-xs text-slate-400 mt-1 font-medium">
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
                      className="w-full border border-blue-300 rounded-lg p-3 pl-10 text-base text-black bg-white focus:outline-none focus:ring-2 focus:ring-[#283593] transition-all font-medium"
                      placeholder="Search Business (e.g. Dairy, Grocery)"
                  />
                  {/* Suggestions */}
                  {showSuggestions && categoryQuery && filteredCategories.length > 0 && (
                      <div className="absolute z-10 w-full bg-white border border-gray-300 shadow-xl mt-1 max-h-60 overflow-y-auto rounded-md">
                          {filteredCategories.map((cat, idx) => (
                              <div 
                                  key={idx} 
                                  className="p-3 hover:bg-gray-100 cursor-pointer text-black font-medium border-b border-gray-100 flex justify-between items-center"
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
                className={`w-full ${THEME_BLUE} text-white py-3.5 rounded-lg text-base font-bold shadow-md hover:bg-opacity-90 active:scale-[0.98] transition-all uppercase tracking-wide disabled:opacity-70 disabled:cursor-not-allowed`}
              >
                  {loading ? (
                      <div className="flex items-center justify-center gap-2">
                          <Loader2 size={20} className="animate-spin" />
                          <span>SEARCHING...</span>
                      </div>
                  ) : 'SEARCH'}
              </button>
          </div>

          {/* Results Area */}
          <div className="p-4 pb-20 bg-slate-50 min-h-[300px]">

              {/* Connection Status Indicator */}
              {connectionStatus && viewMode === 'shops' && (
                  <div className={`mb-4 p-3 rounded-lg flex items-start gap-3 text-sm ${
                      connectionStatus === 'online' ? 'bg-green-50 text-green-800 border border-green-200' :
                      connectionStatus === 'setup_needed' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                      'bg-blue-50 text-blue-800 border border-blue-200'
                  }`}>
                      {connectionStatus === 'online' ? <Database size={18} className="mt-0.5 shrink-0 text-green-600" /> :
                       connectionStatus === 'setup_needed' ? <Database size={18} className="mt-0.5 shrink-0 text-amber-600" /> :
                       <WifiOff size={18} className="mt-0.5 shrink-0 text-blue-600" />}
                      
                      <div>
                          <p className="font-bold">
                              {connectionStatus === 'online' ? 'Live Database Connected' :
                               connectionStatus === 'setup_needed' ? 'Database Setup Required' :
                               'Connection Failed'}
                          </p>
                          <p className="opacity-90 mt-0.5">
                              {connectionStatus === 'online' ? 'Showing real-time results from Firebase.' :
                               'Could not connect to Firebase or no shops found.'}
                          </p>
                      </div>
                  </div>
              )}

              {hasSearched && !loading && (
                  <div className="flex items-center justify-between mb-3">
                      <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                          {viewMode === 'categories' ? 'FOUND CATEGORIES' : `SEARCH RESULTS (${shops.length})`}
                      </div>
                      {viewMode === 'shops' && (
                          <button onClick={() => setViewMode('categories')} className="text-xs text-blue-600 font-bold underline">
                              Back to Categories
                          </button>
                      )}
                  </div>
              )}

              {/* Loading State - Center Screen */}
              {loading && (
                  <div className="flex flex-col items-center justify-center py-12 animate-in fade-in">
                      <div className="bg-white p-4 rounded-full shadow-md mb-3">
                          <Loader2 size={32} className="animate-spin text-[#283593]" />
                      </div>
                      <p className="text-slate-500 font-bold text-sm">Searching nearby profiles...</p>
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
                                    className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex justify-between items-center cursor-pointer hover:border-blue-300 active:bg-blue-50 transition-all group"
                                  >
                                      <div className="text-black font-bold text-lg group-hover:text-[#283593]">
                                          {cat.en} - {cat.hi}
                                      </div>
                                      <div className="bg-gray-100 p-2 rounded-full group-hover:bg-blue-100 transition-colors">
                                          <ChevronRight size={20} className="text-gray-500 group-hover:text-[#283593]" />
                                      </div>
                                  </div>
                              ))
                          ) : (
                              <div className="text-center py-10 text-gray-500">
                                  No categories found. Try searching by business name directly.
                              </div>
                          )
                      )}

                      {/* View Mode: SHOPS (Step 2) */}
                      {viewMode === 'shops' && (
                          shops.length > 0 ? (
                              shops.map((shop) => (
                                  <div key={shop.id} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-2">
                                      <div className="flex justify-between items-start border-b border-gray-100 pb-2 mb-1">
                                          <div>
                                              <div className="text-black font-bold text-lg">{shop.name}</div>
                                              <div className="text-xs text-slate-500 font-medium uppercase tracking-wide bg-slate-100 px-2 py-0.5 rounded w-fit mt-1">
                                                  {shop.category}
                                              </div>
                                          </div>
                                          <div className="flex flex-col items-end">
                                              <span className="text-sm font-bold text-[#283593]">{shop.dist_km.toFixed(1)} KM</span>
                                              <span className="text-[10px] text-gray-400">Distance</span>
                                          </div>
                                      </div>
                                      
                                      <div className="text-sm text-gray-600 flex items-center gap-2">
                                          <Phone size={14} className="text-gray-400" /> 
                                          <span className="font-medium">{shop.mobile || 'N/A'}</span>
                                      </div>
                                      
                                      <div className="text-sm text-gray-600 flex items-start gap-2 mb-2">
                                          <MapPin size={14} className="text-gray-400 mt-0.5" /> 
                                          <span>{shop.address || 'Address not available'}</span>
                                      </div>
                                      
                                      {/* Show available data indicator */}
                                      <div className="flex gap-2 mb-2">
                                          {shop.gstin && <span className="text-[10px] bg-green-50 text-green-700 px-1.5 rounded border border-green-100">GSTIN</span>}
                                          {shop.email && <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 rounded border border-blue-100">EMAIL</span>}
                                          {shop.city && <span className="text-[10px] bg-purple-50 text-purple-700 px-1.5 rounded border border-purple-100">{shop.city}</span>}
                                      </div>

                                      <div className="flex gap-3 pt-1">
                                          <button 
                                            onClick={() => handleAddClick(shop)}
                                            className={`flex-1 ${THEME_BLUE} text-white py-2.5 rounded-lg text-sm font-bold shadow hover:bg-opacity-90 active:scale-95 transition-transform flex items-center justify-center gap-2`}
                                          >
                                              <User size={16} /> Add Customer
                                          </button>
                                          <a 
                                            href={`tel:${shop.mobile}`}
                                            className="flex-1 bg-green-600 text-white py-2.5 rounded-lg text-sm font-bold shadow hover:bg-opacity-90 active:scale-95 transition-transform text-center flex items-center justify-center gap-2"
                                          >
                                              <Phone size={16} /> Call
                                          </a>
                                      </div>
                                      <button 
                                          onClick={() => !sendingShopId && handleSendRequest(shop)}
                                          disabled={sendingShopId === shop.id}
                                          className={`w-full mt-1 bg-purple-600 text-white py-2.5 rounded-lg text-sm font-bold shadow transition-transform flex items-center justify-center gap-2 ${sendingShopId === shop.id ? 'opacity-70 cursor-not-allowed' : 'hover:bg-opacity-90 active:scale-95'}`}
                                      >
                                          {sendingShopId === shop.id ? (
                                              <><Loader2 size={16} className="animate-spin" /> Sending...</>
                                          ) : (
                                              <><Send size={16} /> Send Request</>
                                          )}
                                      </button>
                                  </div>
                              ))
                          ) : (
                              <div className="flex flex-col items-center justify-center py-10 text-gray-500 text-center">
                                  <div className="bg-gray-100 p-4 rounded-full mb-3">
                                      <Search size={32} className="text-gray-400" />
                                  </div>
                                  <p className="font-medium">No shops found for "{categoryQuery}".</p>
                                  <p className="text-xs mt-2 max-w-[200px]">
                                      Try increasing the search distance slider above.
                                  </p>
                                  <button onClick={() => setViewMode('categories')} className="mt-4 text-[#283593] font-bold underline text-sm">
                                      Try a different category
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
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-xs overflow-hidden transform transition-all scale-100">
                  <div className="p-4 border-b border-gray-100 bg-gray-50">
                      <h3 className="font-bold text-lg text-black">Add Customer?</h3>
                  </div>
                  <div className="p-5">
                      <p className="text-gray-600 text-base mb-2">
                          Do you want to add <span className="font-bold text-black">{selectedShop.name}</span> to your customer list?
                      </p>
                      <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded border border-slate-100">
                          <strong>Includes:</strong>
                          <ul className="list-disc pl-4 mt-1 space-y-0.5">
                              {selectedShop.mobile && <li>Mobile No</li>}
                              {selectedShop.gstin && <li>GSTIN & PAN</li>}
                              {selectedShop.address && <li>Full Address</li>}
                              {selectedShop.email && <li>Email ID</li>}
                              {selectedShop.bankDetails && <li>Bank Details</li>}
                          </ul>
                      </div>
                  </div>
                  <div className="flex justify-end gap-4 p-4 pt-0">
                      <button 
                          onClick={() => setShowConfirmModal(false)}
                          className="px-4 py-2 rounded-lg font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                      >
                          CANCEL
                      </button>
                      <button 
                          onClick={confirmAddCustomer}
                          className={`px-4 py-2 rounded-lg font-bold text-white ${THEME_BLUE} shadow-md hover:opacity-90`}
                      >
                          ADD
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
