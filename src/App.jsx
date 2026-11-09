import React, { useState, useEffect } from 'react';

// Google Calendar IDs
const TRUCK_1_CAL_ID = "c_77cefe9afb99962d283c3bf903d097b4db7980558465c46c92ee7802698c442d@group.calendar.google.com"; // Hansen Lab Truck
const TRUCK_2_CAL_ID = "c_6br43pl0vad2su7ldibiillg2o@group.calendar.google.com"; // Larkin Lab Truck
const BOAT_1_CAL_ID = "c_64a563c76f037a43bb5816c4ddf724d6025b18faf4a2aa9a3c35b56ae36039fc@group.calendar.google.com"; // Hansen/Walsh Lab Boats
const BOAT_2_CAL_ID = "c_5fb23aa1750177240b46b54ccb1782b68e8ab0468957d63ac1219a8a7296b963@group.calendar.google.com"; // Larkin Boats

// Combined URL overlaying all 4 calendars with assigned hex colors
const COMBINED_CAL_URL = `https://calendar.google.com/calendar/embed?` +
  `src=${encodeURIComponent(TRUCK_1_CAL_ID)}&color=%2364748b&` +
  `src=${encodeURIComponent(TRUCK_2_CAL_ID)}&color=%232563eb&` +
  `src=${encodeURIComponent(BOAT_1_CAL_ID)}&color=%23059669&` +
  `src=${encodeURIComponent(BOAT_2_CAL_ID)}&color=%23dc2626&` +
  `ctz=America%2FChicago`;

const CALENDAR_LIST = [
  { 
    id: 'combined',
    name: 'Combined View', 
    url: COMBINED_CAL_URL, 
    color: '#38a2be2',
    isCombined: true
  },
  { 
    id: 'hansen-truck',
    name: 'Hansen Truck Calendar', 
    url: `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(TRUCK_1_CAL_ID)}&color=%2364748b&ctz=America%2FChicago`, 
    color: '#64748b' 
  },
  { 
    id: 'larkin-truck',
    name: 'Larkin Truck Calendar', 
    url: `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(TRUCK_2_CAL_ID)}&color=%232563eb&ctz=America%2FChicago`, 
    color: '#2563eb' 
  },
  { 
    id: 'hansen-boat',
    name: 'Hansen/Walsh Boat Calendar', 
    url: `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(BOAT_1_CAL_ID)}&color=%23059669&ctz=America%2FChicago`, 
    color: '#059669' 
  },
  { 
    id: 'larkin-boat',
    name: 'Larkin Boat Calendar', 
    url: `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(BOAT_2_CAL_ID)}&color=%23dc2626&ctz=America%2FChicago`, 
    color: '#dc2626' 
  }
];

const DEFAULT_VEHICLES = [
  { id: 'truck-hansen', name: 'Hansen Lab Truck', brand: 'Ford', model: 'F-250 Super Duty', category: 'Truck', location: 'Campus Parking Bay A', keyLocation: 'Main Office Cabinet #1', status: 'available', imageUrl: '' },
  { id: 'truck-larkin', name: 'Larkin Lab Truck', brand: 'Chevrolet', model: 'Silverado 2500', category: 'Truck', location: 'Campus Parking Bay B', keyLocation: 'Larkin Lab Key Box', status: 'available', imageUrl: '' },
  { id: 'boat-hansen', name: 'Hansen/Walsh Research Boat', brand: 'Boston Whaler', model: 'Montauk 170', category: 'Boat', location: 'Dock Station 1', keyLocation: 'Hansen Boathouse Locker', status: 'available', imageUrl: '' },
  { id: 'craft-1', name: 'Field Research Canoe', brand: 'Old Town', model: 'Discovery 169', category: 'Non-Motorized Craft', location: 'Boathouse Storage Rack 3', keyLocation: 'Boathouse Padlock #2', status: 'available', imageUrl: '' }
];

function getCategoryRank(category) {
  const c = (category || '').toLowerCase();
  if (c.includes('truck')) return 1;
  if (c.includes('boat') || c.includes('skiff') || c.includes('vessel')) return 2;
  if (c.includes('non-motorized') || c.includes('canoe') || c.includes('kayak') || c.includes('paddle')) return 3;
  return 4;
}

export default function App() {
  const [activeTab, setActiveTab] = useState('assets'); // 'assets' or 'calendar'
  const [activeCalendarUrl, setActiveCalendarUrl] = useState(COMBINED_CAL_URL);
  const [selectedCalId, setSelectedCalId] = useState('combined');

  const [vehicles, setVehicles] = useState(DEFAULT_VEHICLES);
  const [selectedVehicles, setSelectedVehicles] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [notionConnected, setNotionConnected] = useState(false);
  const [notionStatusMsg, setNotionStatusMsg] = useState('Checking Notion connection...');

  // Booking Form State
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [generatedCalendarLinks, setGeneratedCalendarLinks] = useState([]);

  useEffect(() => {
    async function fetchNotionData() {
      try {
        const res = await fetch('/api/notion');
        const data = await res.json();

        if (res.ok && data.results && data.results.length > 0) {
          const filteredResults = data.results.filter((page) => {
            const props = page.properties || {};
            const targetVal = (props['App Target']?.select?.name || props['App Target']?.rich_text?.[0]?.plain_text || '').toLowerCase();
            return !targetVal || targetVal.includes('vehicle') || targetVal.includes('fleet') || targetVal.includes('boat');
          });

          const parsed = filteredResults.map((page) => {
            const props = page.properties || {};
            
            let name = 'Unnamed Vehicle';
            const nameProp = props['Asset Name'] || props['Name'];
            if (nameProp?.title?.[0]?.plain_text) {
              name = nameProp.title[0].plain_text;
            }

            let photoUrl = '';
            const photoKey = Object.keys(props).find(k => k.toLowerCase() === 'photo' || k.toLowerCase() === 'image');
            if (photoKey && props[photoKey]?.files?.[0]) {
              const fileObj = props[photoKey].files[0];
              photoUrl = fileObj.file?.url || fileObj.external?.url || '';
            }

            const category = props['Category']?.select?.name || 
                             props['Category']?.rich_text?.[0]?.plain_text || 
                             'Vehicle';

            const brand = props['Brand']?.rich_text?.[0]?.plain_text || props['Brand']?.select?.name || '';
            const model = props['Model']?.rich_text?.[0]?.plain_text || props['Model']?.select?.name || '';
            
            const keyLoc = props['Key Location']?.multi_select?.map(item => item.name).join(', ') || 
                           props['Key Location']?.select?.name || 
                           props['Key Location']?.rich_text?.[0]?.plain_text || 
                           'Contact Lab Manager';

            const location = props['Location']?.select?.name || props['Location']?.rich_text?.[0]?.plain_text || 'Field Garage';

            return {
              id: page.id,
              name: name,
              brand: brand,
              model: model,
              category: category,
              location: location,
              keyLocation: keyLoc,
              status: 'available',
              imageUrl: photoUrl
            };
          });

          parsed.sort((a, b) => {
            const rankA = getCategoryRank(a.category);
            const rankB = getCategoryRank(b.category);
            if (rankA !== rankB) return rankA - rankB;
            return a.name.localeCompare(b.name);
          });

          setVehicles(parsed);
          setNotionConnected(true);
          setNotionStatusMsg('Connected to Notion Database');
        } else {
          setNotionStatusMsg(data.message || 'Displaying local fallback vehicle data.');
        }
      } catch (err) {
        setNotionStatusMsg('Local dev mode: serverless /api/notion runs when published to Vercel.');
      }
    }
    fetchNotionData();
  }, []);

  const uniqueCats = Array.from(new Set(vehicles.map(v => v.category))).filter(Boolean);
  uniqueCats.sort((a, b) => getCategoryRank(a) - getCategoryRank(b));
  const dynamicCategories = ['all', ...uniqueCats];

  const toggleVehicleSelection = (vehicle) => {
    setBookingSuccess(false);
    setSelectedVehicles((prev) => {
      const exists = prev.some((v) => v.id === vehicle.id);
      if (exists) {
        return prev.filter((v) => v.id !== vehicle.id);
      } else {
        return [...prev, vehicle];
      }
    });
  };

  const filteredVehicles = vehicles.filter((v) => {
    const matchesFilter = activeFilter === 'all' || v.category.toLowerCase() === activeFilter.toLowerCase();
    const matchesSearch = v.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (v.brand && v.brand.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          (v.model && v.model.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          v.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          v.keyLocation.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getTargetCalendarId = (vehicle) => {
    const nameLower = vehicle.name.toLowerCase();
    const catLower = vehicle.category.toLowerCase();
    
    if (catLower.includes('boat')) {
      if (nameLower.includes('larkin')) return BOAT_2_CAL_ID;
      return BOAT_1_CAL_ID;
    } else {
      if (nameLower.includes('larkin')) return TRUCK_2_CAL_ID;
      return TRUCK_1_CAL_ID;
    }
  };

  const handleBookingSubmit = (e) => {
    e.preventDefault();
    if (selectedVehicles.length === 0) return;

    const finalEndDate = endDate || startDate;
    const startISO = `${startDate.replace(/-/g, '')}T${startTime.replace(':', '')}00`;
    const endISO = `${finalEndDate.replace(/-/g, '')}T${endTime.replace(':', '')}00`;

    const links = selectedVehicles.map((vehicle) => {
      const calId = getTargetCalendarId(vehicle);
      // Title without "Reservation:" prefix
      const title = encodeURIComponent(`${vehicle.name}${vehicle.model ? ` (${vehicle.model})` : ''}`);
      
      // Details strictly limited to requested fields
      const details = encodeURIComponent(
        `Reserved by: ${userName} (${userEmail})\n` +
        `Vehicle/Asset: ${vehicle.name}\n` +
        `Brand & Model: ${vehicle.brand || 'N/A'} ${vehicle.model || ''}\n` +
        `Key Location: ${vehicle.keyLocation}\n` +
        `Vehicle Location: ${vehicle.location}\n` +
        `Trip Notes: ${notes}`
      );

      // Empty location parameter
      return {
        vehicleName: vehicle.name,
        url: `https://calendar.google.com/calendar/render?action=TEMPLATE&src=${encodeURIComponent(calId)}&text=${title}&dates=${startISO}/${endISO}&details=${details}&location=&ctz=America%2FChicago`
      };
    });

    setGeneratedCalendarLinks(links);
    setBookingSuccess(true);
  };

  const handleVehicleUpdate = (id, field, value) => {
    setVehicles(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
    setSelectedVehicles(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: '#f8fafc', fontFamily: 'sans-serif', padding: '24px' }}>
      
      {/* Top Header */}
      <header style={{ maxWidth: '1400px', margin: '0 auto 16px auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: 0, color: '#ffffff' }}>Vehicle & Boat Reservation Portal</h1>
            <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '600', border: notionConnected ? '1px solid #059669' : '1px solid #d97706', backgroundColor: notionConnected ? '#064e3b' : '#78350f', color: notionConnected ? '#34d399' : '#fde68a' }}>
              {notionConnected ? 'Live Notion Sync' : 'Default Asset Mode'}
            </span>
          </div>
          <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '4px' }}>
            Multi-Vehicle Reservation Portal for Trucks and Boats
          </p>
        </div>

        <button 
          onClick={() => setIsAdminMode(!isAdminMode)}
          style={{ padding: '8px 16px', backgroundColor: isAdminMode ? '#78350f' : '#1e293b', color: isAdminMode ? '#fde68a' : '#cbd5e1', border: '1px solid #475569', cursor: 'pointer', borderRadius: '8px', fontSize: '14px' }}
        >
          {isAdminMode ? 'Exit Admin Mode' : 'Admin & Photo Editor'}
        </button>
      </header>

      {/* Main App Navigation Tabs */}
      <div style={{ maxWidth: '1400px', margin: '0 auto 20px auto', display: 'flex', gap: '8px', borderBottom: '2px solid #1e293b', paddingBottom: '4px' }}>
        <button
          onClick={() => setActiveTab('assets')}
          style={{
            padding: '10px 20px',
            borderRadius: '8px 8px 0 0',
            fontSize: '14px',
            fontWeight: 'bold',
            border: 'none',
            cursor: 'pointer',
            backgroundColor: activeTab === 'assets' ? '#2563eb' : '#1e293b',
            color: '#ffffff'
          }}
        >
          🚗 Vehicles, Boats, & Reservations
        </button>
        <button
          onClick={() => setActiveTab('calendar')}
          style={{
            padding: '10px 20px',
            borderRadius: '8px 8px 0 0',
            fontSize: '14px',
            fontWeight: 'bold',
            border: 'none',
            cursor: 'pointer',
            backgroundColor: activeTab === 'calendar' ? '#2563eb' : '#1e293b',
            color: '#ffffff'
          }}
        >
          📅 Live Calendar Viewer
        </button>
      </div>

      {!notionConnected && (
        <div style={{ maxWidth: '1400px', margin: '0 auto 16px auto', padding: '12px 16px', backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px', color: '#94a3b8' }}>
          <strong>Sync Status:</strong> {notionStatusMsg}
        </div>
      )}

      {/* TAB 1: VEHICLES, BOATS, & BOOKING FORM */}
      {activeTab === 'assets' && (
        <main style={{ maxWidth: '1400px', margin: '0 auto', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
          <section>
            <div style={{ backgroundColor: '#1e293b', padding: '16px', borderRadius: '12px', marginBottom: '16px', display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'space-between', alignItems: 'center' }}>
              <input 
                type="text"
                placeholder="Search make, model, category, or key..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '260px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '8px 12px', color: '#f8fafc' }}
              />

              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {dynamicCategories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveFilter(cat)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      border: 'none',
                      cursor: 'pointer',
                      backgroundColor: activeFilter === cat ? '#2563eb' : '#0f172a',
                      color: '#ffffff',
                      fontWeight: activeFilter === cat ? 'bold' : 'normal',
                      textTransform: 'capitalize'
                    }}
                  >
                    {cat === 'all' ? 'All' : cat}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '16px', padding: '20px' }}>
              <div style={{ borderBottom: '1px solid #1e293b', paddingBottom: '12px', marginBottom: '16px', fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', justifyContent: 'space-between' }}>
                <span>Available Assets</span>
                <span style={{ color: '#38bdf8', textTransform: 'none' }}>Click tiles to select multiple assets</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
                {filteredVehicles.map((vehicle) => {
                  const isSelected = selectedVehicles.some((v) => v.id === vehicle.id);
                  return (
                    <div
                      key={vehicle.id}
                      onClick={() => toggleVehicleSelection(vehicle)}
                      style={{
                        padding: '16px',
                        borderRadius: '12px',
                        border: isSelected ? '2px solid #3b82f6' : '1px solid #1e293b',
                        backgroundColor: isSelected ? '#172554' : '#0f172a',
                        cursor: 'pointer',
                        position: 'relative'
                      }}
                    >
                      {isSelected && (
                        <span style={{ position: 'absolute', top: '8px', right: '8px', backgroundColor: '#2563eb', color: '#fff', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' }}>
                          ✓
                        </span>
                      )}

                      {vehicle.imageUrl ? (
                        <img src={vehicle.imageUrl} alt={vehicle.name} style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '6px', marginBottom: '8px' }} />
                      ) : (
                        <div style={{ width: '100%', height: '80px', backgroundColor: '#020617', borderRadius: '6px', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: '#475569', textTransform: 'uppercase' }}>
                          {vehicle.category}
                        </div>
                      )}

                      <div style={{ fontWeight: '600', fontSize: '15px', color: '#f8fafc' }}>{vehicle.name}</div>
                      {(vehicle.brand || vehicle.model) && (
                        <div style={{ fontSize: '11px', color: '#93c5fd', marginTop: '2px' }}>{[vehicle.brand, vehicle.model].filter(Boolean).join(' · ')}</div>
                      )}
                      <div style={{ fontSize: '12px', color: '#38bdf8', marginTop: '4px' }}>🔑 Key: {vehicle.keyLocation}</div>
                      <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>📍 {vehicle.location}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '20px', height: 'fit-content' }}>
            {isAdminMode ? (
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: '#fbbf24', marginBottom: '16px' }}>Admin Asset & Photo Editor</h2>
                {selectedVehicles.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {selectedVehicles.map((vehicle) => (
                      <div key={vehicle.id} style={{ borderBottom: '1px solid #334155', paddingBottom: '12px' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '8px', color: '#60a5fa' }}>{vehicle.name}</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '11px', color: '#cbd5e1', marginBottom: '2px' }}>Category</label>
                            <input type="text" value={vehicle.category} onChange={(e) => handleVehicleUpdate(vehicle.id, 'category', e.target.value)} style={{ width: '100%', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '6px', color: '#fff' }} />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '11px', color: '#cbd5e1', marginBottom: '2px' }}>Brand / Make</label>
                            <input type="text" value={vehicle.brand || ''} onChange={(e) => handleVehicleUpdate(vehicle.id, 'brand', e.target.value)} style={{ width: '100%', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '6px', color: '#fff' }} />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '11px', color: '#cbd5e1', marginBottom: '2px' }}>Model</label>
                            <input type="text" value={vehicle.model || ''} onChange={(e) => handleVehicleUpdate(vehicle.id, 'model', e.target.value)} style={{ width: '100%', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '6px', color: '#fff' }} />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '11px', color: '#cbd5e1', marginBottom: '2px' }}>Key Location</label>
                            <input type="text" value={vehicle.keyLocation} onChange={(e) => handleVehicleUpdate(vehicle.id, 'keyLocation', e.target.value)} style={{ width: '100%', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '6px', color: '#fff' }} />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '11px', color: '#cbd5e1', marginBottom: '2px' }}>Image URL</label>
                            <input type="text" placeholder="https://..." value={vehicle.imageUrl || ''} onChange={(e) => handleVehicleUpdate(vehicle.id, 'imageUrl', e.target.value)} style={{ width: '100%', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '6px', color: '#fff' }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: '13px', color: '#94a3b8' }}>Select assets from the grid to edit details.</p>
                )}
              </div>
            ) : (
              <div>
                {selectedVehicles.length > 0 ? (
                  <div>
                    <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 8px 0' }}>
                      Selected ({selectedVehicles.length}) Assets
                    </h2>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                      {selectedVehicles.map((v) => (
                        <div key={v.id} style={{ padding: '10px', backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #334155' }}>
                          <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#fff' }}>{v.name}</div>
                          {(v.brand || v.model) && (
                            <div style={{ fontSize: '11px', color: '#93c5fd' }}>{[v.brand, v.model].filter(Boolean).join(' · ')}</div>
                          )}
                          <div style={{ fontSize: '11px', color: '#38bdf8', marginTop: '2px' }}>🔑 Key: {v.keyLocation}</div>
                          <div style={{ fontSize: '11px', color: '#94a3b8' }}>📍 Station: {v.location}</div>
                        </div>
                      ))}
                    </div>

                    {bookingSuccess ? (
                      <div style={{ backgroundColor: '#064e3b', border: '1px solid #059669', padding: '16px', borderRadius: '8px' }}>
                        <div style={{ color: '#34d399', fontWeight: 'bold', marginBottom: '8px' }}>
                          Reservations Prepared!
                        </div>
                        <p style={{ fontSize: '12px', color: '#cbd5e1', marginBottom: '12px' }}>
                          Click below to add events to each asset's respective Google Calendar:
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {generatedCalendarLinks.map((link, idx) => (
                            <a key={idx} href={link.url} target="_blank" rel="noreferrer" style={{ display: 'block', textAlign: 'center', backgroundColor: '#059669', color: '#fff', padding: '10px', borderRadius: '6px', textDecoration: 'none', fontWeight: 'bold', fontSize: '13px' }}>
                              Add {link.vehicleName} to Calendar
                            </a>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <form onSubmit={handleBookingSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '4px' }}>Departure Date</label>
                            <input type="date" required value={startDate} onChange={(e) => { setStartDate(e.target.value); if (!endDate || endDate < e.target.value) setEndDate(e.target.value); }} style={{ width: '100%', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '8px', color: '#fff', colorScheme: 'dark' }} />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '4px' }}>Return Date</label>
                            <input type="date" min={startDate} value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ width: '100%', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '8px', color: '#fff', colorScheme: 'dark' }} />
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '4px' }}>Departure Time</label>
                            <input type="time" required value={startTime} onChange={(e) => setStartTime(e.target.value)} style={{ width: '100%', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '8px', color: '#fff', colorScheme: 'dark' }} />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '4px' }}>Return Time</label>
                            <input type="time" required value={endTime} onChange={(e) => setEndTime(e.target.value)} style={{ width: '100%', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '8px', color: '#fff', colorScheme: 'dark' }} />
                          </div>
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '4px' }}>Driver / Operator Name</label>
                          <input type="text" required placeholder="Jane Doe" value={userName} onChange={(e) => setUserName(e.target.value)} style={{ width: '100%', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '8px', color: '#fff' }} />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '4px' }}>Contact Email</label>
                          <input type="email" required placeholder="jane@university.edu" value={userEmail} onChange={(e) => setUserEmail(e.target.value)} style={{ width: '100%', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '8px', color: '#fff' }} />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '4px' }}>Destination / Field Purpose</label>
                          <textarea rows={2} placeholder="Field site location and sampling goals..." value={notes} onChange={(e) => setNotes(e.target.value)} style={{ width: '100%', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '8px', color: '#fff' }} />
                        </div>

                        <button type="submit" style={{ width: '100%', padding: '12px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '8px' }}>
                          Reserve Selected ({selectedVehicles.length}) Asset(s)
                        </button>
                      </form>
                    )}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', color: '#94a3b8', padding: '32px 0' }}>
                    Select one or more assets from the grid to reserve.
                  </div>
                )}
              </div>
            )}
          </section>
        </main>
      )}

      {/* TAB 2: EMBEDDED CALENDAR VIEWER WITH PERSISTENT LEFT SIDEBAR */}
      {activeTab === 'calendar' && (
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'grid', gridTemplateColumns: '280px 1fr', gap: '20px' }}>
          
          {/* Left Sidebar Menu */}
          <aside style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '20px', height: 'fit-content' }}>
            <h2 style={{ fontSize: '13px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 12px 0', borderBottom: '1px solid #334155', paddingBottom: '8px' }}>
              Select Calendar View
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {CALENDAR_LIST.map((cal) => {
                const isSelected = selectedCalId === cal.id;
                return (
                  <button
                    key={cal.id}
                    onClick={() => {
                      setSelectedCalId(cal.id);
                      setActiveCalendarUrl(cal.url);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '12px 14px',
                      borderRadius: '8px',
                      border: isSelected ? '2px solid #38bdf8' : '1px solid #334155',
                      backgroundColor: isSelected ? '#0f172a' : '#020617',
                      color: isSelected ? '#ffffff' : '#cbd5e1',
                      fontWeight: isSelected ? 'bold' : 'normal',
                      fontSize: '13px',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: cal.color, display: 'inline-block', flexShrink: 0 }} />
                    <span>{cal.name}</span>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Right Main Panel: Embedded Google Calendar Iframe */}
          <section style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '16px', minHeight: '750px' }}>
            <iframe
              title="Google Vehicle and Boat Calendar View"
              src={activeCalendarUrl}
              style={{ width: '100%', height: '750px', border: 'none', borderRadius: '12px', backgroundColor: '#ffffff' }}
            />
          </section>

        </div>
      )}

    </div>
  );
}