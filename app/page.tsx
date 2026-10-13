'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { TIME_SLOTS, getSlotStatus } from '@/lib/utils';
import {
  Calendar, Clock, CheckCircle, AlertCircle, X, Utensils, Carrot, Printer,
  RefreshCw, PhoneCall, Search, Megaphone, ShoppingBag, KeyRound, Phone,
  ChevronLeft, ChevronRight, BookOpen, ShieldCheck
} from 'lucide-react';

interface BookedSlotInfo {
  time_slot: string;
  full_name: string;
}

const INGREDIENT_CATEGORIES = [
  'Bahan Basah',
  'Sayur-sayuran',
  'Beras & Mi',
  'Makanan Tin',
  'Perasa & Rempah',
  'Sos & Kicap',
  'Kopi, Teh & Kordial',
  'Bahan Kering'
];

export default function Home() {
  const [now, setNow] = useState<Date | null>(null);
  const [location, setLocation] = useState<'Blok 4' | 'Blok 6'>('Blok 4');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [bookedSlots, setBookedSlots] = useState<BookedSlotInfo[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  // Pop-up Tatacara Penggunaan Dapur (Awal Masuk)
  const [showRulesModal, setShowRulesModal] = useState(true);

  // Search & Multiple Noticeboard State
  const [activeNotices, setActiveNotices] = useState<string[]>([]);
  const [currentNoticeIndex, setCurrentNoticeIndex] = useState(0);

  const [equipSearch, setEquipSearch] = useState('');
  const [ingSearch, setIngSearch] = useState('');

  // Self-Cancellation Modal
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelMatrix, setCancelMatrix] = useState('');
  const [cancelCode, setCancelCode] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);

  // Modal: Log Bahan Diguna
  const [showLogModal, setShowLogModal] = useState(false);
  const [logMatrix, setLogMatrix] = useState('');
  const [logCode, setLogCode] = useState('');
  const [selectedIngQty, setSelectedIngQty] = useState<{ [id: string]: number }>({});
  const [selectedPantryCheck, setSelectedPantryCheck] = useState<{ [id: string]: boolean }>({});
  const [customIngredients, setCustomIngredients] = useState('');
  const [logLoading, setLogLoading] = useState(false);

  // Digital Kitchen Pass Modal
  const [latestPass, setLatestPass] = useState<any | null>(null);

  // Equipment, Ingredients & Contacts State
  const [equipmentList, setEquipmentList] = useState<any[]>([]);
  const [ingredientsList, setIngredientsList] = useState<any[]>([]);
  const [contactsList, setContactsList] = useState<any[]>([]);

  // Form Booking State
  const [fullName, setFullName] = useState('');
  const [matrixNumber, setMatrixNumber] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [paxCount, setPaxCount] = useState(1);
  const [agreedRules, setAgreedRules] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Kemaskini Waktu Semasa Setiap Minit
  useEffect(() => {
    const updateTime = () => setNow(new Date());
    updateTime();
    
    const interval = setInterval(updateTime, 60000);
    setSelectedDate(new Date().toISOString().split('T')[0]);

    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    if (!selectedDate) return;

    // Fetch All Active Notices
    const { data: noticeData } = await supabase
      .from('notices')
      .select('content')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (noticeData && noticeData.length > 0) {
      setActiveNotices(noticeData.map(n => n.content));
    } else {
      setActiveNotices([]);
    }

    // Fetch Tempahan
    const { data: bookingData } = await supabase
      .from('bookings')
      .select('time_slot, full_name')
      .eq('location', location)
      .eq('booking_date', selectedDate)
      .eq('status', 'confirmed');

    if (bookingData) {
      setBookedSlots(
        bookingData.map(b => ({
          time_slot: b.time_slot.slice(0, 5),
          full_name: b.full_name
        }))
      );
    }

    const { data: equipData } = await supabase.from('equipment').select('*').order('item_name', { ascending: true });
    if (equipData) setEquipmentList(equipData);

    const { data: ingData } = await supabase.from('ingredients').select('*').order('item_name', { ascending: true });
    if (ingData) setIngredientsList(ingData);

    const { data: contactData } = await supabase.from('contacts').select('*').order('created_at', { ascending: true });
    if (contactData) setContactsList(contactData);
  };

  useEffect(() => {
    fetchData();
  }, [location, selectedDate]);

  // RESET INDEKS SETIAP KALI AKTIF NOTICES BERUBAH
  useEffect(() => {
    setCurrentNoticeIndex(0);
  }, [activeNotices.length]);

  // AUTO ROTATE NOTICEBOARD SETIAP 10 SAAT (10000ms)
  useEffect(() => {
    if (activeNotices.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentNoticeIndex((prevIndex) => (prevIndex + 1) % activeNotices.length);
    }, 10000);

    return () => clearInterval(timer);
  }, [activeNotices.length]);

  // Submit Tempahan Slot
  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) return;
    if (!agreedRules) {
      alert('Sila tandakan persetujuan Peraturan & Etika penggunaan dapur.');
      return;
    }

    setLoading(true);
    setMessage(null);

    const res = await fetch('/api/book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: fullName,
        matrix_number: matrixNumber,
        phone_number: phoneNumber,
        room_number: roomNumber,
        pax_count: paxCount,
        items_used: 'Belum direkodkan',
        location,
        booking_date: selectedDate,
        time_slot: selectedSlot,
      }),
    });

    const result = await res.json();
    setLoading(false);

    if (res.ok) {
      setMessage({ type: 'success', text: `Tempahan Berjaya! Kod anda: ${result.booking.cancellation_code}` });
      setLatestPass(result.booking);
      fetchData();
      setSelectedSlot(null);
      setFullName('');
      setMatrixNumber('');
      setPhoneNumber('');
      setRoomNumber('');
      setPaxCount(1);
      setAgreedRules(false);
    } else {
      setMessage({ type: 'error', text: result.error || 'Gagal membuat tempahan.' });
    }
  };

  // Submit Log Bahan Diguna
  const handleLogIngredientsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logMatrix || !logCode) {
      alert('Sila masukkan No. Matrik dan Kod Tempahan.');
      return;
    }

    setLogLoading(true);

    const usedIngredientsPayload: any[] = [];
    
    Object.entries(selectedIngQty).forEach(([id, qty]) => {
      if (qty > 0) usedIngredientsPayload.push({ id, qty });
    });

    Object.entries(selectedPantryCheck).forEach(([id, isChecked]) => {
      if (isChecked) usedIngredientsPayload.push({ id, qty: 1 });
    });

    const res = await fetch('/api/log-bahan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        matrix_number: logMatrix,
        cancellation_code: logCode,
        used_ingredients: usedIngredientsPayload,
        custom_ingredients: customIngredients
      }),
    });

    const result = await res.json();
    setLogLoading(false);

    if (res.ok) {
      alert(result.message || 'Bahan berjaya direkodkan!');
      setShowLogModal(false);
      setSelectedIngQty({});
      setSelectedPantryCheck({});
      setCustomIngredients('');
      setLogCode('');
      fetchData();
    } else {
      alert(result.error || 'Gagal merekod bahan.');
    }
  };

  const handleSelfCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    setCancelLoading(true);

    const res = await fetch('/api/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        matrix_number: cancelMatrix,
        cancellation_code: cancelCode,
      }),
    });

    const result = await res.json();
    setCancelLoading(false);

    if (res.ok) {
      alert('Tempahan anda telah berjaya dibatalkan.');
      setShowCancelModal(false);
      setCancelMatrix('');
      setCancelCode('');
      fetchData();
    } else {
      alert(result.error || 'Gagal membatalkan tempahan.');
    }
  };

  const bookedSlotTimes = bookedSlots.map(b => b.time_slot);
  const filteredEquipment = equipmentList.filter(e => e.item_name.toLowerCase().includes(equipSearch.toLowerCase()));
  
  const filteredIngredients = ingredientsList.filter(i =>
    (i.location || 'Blok 4') === location &&
    i.item_name.toLowerCase().includes(ingSearch.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      
      <style>{`
        @media print {
          @page { size: portrait; margin: 10mm; }
          body { background: white !important; margin: 0 !important; padding: 0 !important; }
          .no-print-area { display: none !important; }
          .print-overlay { position: static !important; background: transparent !important; padding: 0 !important; display: block !important; }
          #printable-pass { position: relative !important; max-width: 480px !important; margin: 0 auto !important; border: 2px solid #000 !important; box-shadow: none !important; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="max-w-5xl mx-auto space-y-6 no-print-area">
        
        {/* BANNER NOTICEBOARD (AUTOROTATE 10 SAAT TANPA PAPARAN DURASI) */}
        {activeNotices.length > 0 && (
          <div className="bg-amber-500 text-slate-950 p-4 rounded-2xl shadow-md border-2 border-amber-600 flex items-center justify-between gap-3 transition-all duration-500">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <Megaphone className="w-6 h-6 shrink-0 mt-0.5 animate-bounce text-slate-950" />
              <div className="space-y-0.5 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-black text-[10px] uppercase bg-slate-950 text-amber-400 px-2 py-0.5 rounded-md inline-block">
                    PENGUMUMAN
                  </span>
                  {activeNotices.length > 1 && (
                    <span className="text-[10px] font-black bg-amber-600 text-amber-950 px-2 py-0.5 rounded-md">
                      {currentNoticeIndex + 1} / {activeNotices.length}
                    </span>
                  )}
                </div>
                <p className="font-extrabold text-sm md:text-base leading-snug break-words">
                  {activeNotices[currentNoticeIndex] || activeNotices[0]}
                </p>
              </div>
            </div>

            {/* Navigasi Manual Pengumuman */}
            {activeNotices.length > 1 && (
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => setCurrentNoticeIndex((prev) => (prev - 1 + activeNotices.length) % activeNotices.length)}
                  className="p-1.5 bg-amber-600 hover:bg-amber-700 text-slate-950 rounded-lg transition"
                  title="Pengumuman Sebelum"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentNoticeIndex((prev) => (prev + 1) % activeNotices.length)}
                  className="p-1.5 bg-amber-600 hover:bg-amber-700 text-slate-950 rounded-lg transition"
                  title="Pengumuman Seterusnya"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Header Utama */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
            <img src="/logo-khar.png" alt="Logo KHAR" className="h-16 md:h-20 object-contain" />
            <div className="text-center space-y-1">
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">Sistem Tempahan Dapur Siswa Madani</h1>
              <p className="text-blue-800 font-bold text-xs md:text-sm">Kolej Harun Aminurrashid (KHAR), UPSI</p>
              
              <div className="pt-2 flex justify-center gap-2 flex-wrap">
                <button
                  onClick={() => setShowLogModal(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-xs"
                >
                  <ShoppingBag className="w-4 h-4" /> Log / Rekod Bahan Diguna
                </button>
                <button
                  onClick={() => setShowCancelModal(true)}
                  className="bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Batal Tempahan
                </button>
                <button
                  onClick={() => setShowRulesModal(true)}
                  className="bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-300 px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                >
                  <BookOpen className="w-3.5 h-3.5 text-blue-600" /> Tatacara Dapur
                </button>
              </div>
            </div>
            <img src="/logo-dapur-siswa.jpg" alt="Logo Dapur Siswa" className="h-16 md:h-20 object-contain" />
          </div>
        </div>

        {/* Pemilihan Blok & Tarikh */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
            <button onClick={() => setLocation('Blok 4')} className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-sm font-bold ${location === 'Blok 4' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-700'}`}>Dapur Blok 4</button>
            <button onClick={() => setLocation('Blok 6')} className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-sm font-bold ${location === 'Blok 6' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-700'}`}>Dapur Blok 6</button>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Calendar className="w-5 h-5 text-slate-600" />
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="border border-slate-300 p-2 rounded-xl text-slate-900 font-bold text-sm bg-white" />
          </div>
        </div>

        {/* Notification Alert */}
        {message && (
          <div className={`p-4 rounded-xl flex items-center gap-2 text-sm font-bold ${message.type === 'success' ? 'bg-[#00A354]/15 text-slate-900 border border-[#00A354]' : 'bg-[#FF2900]/15 text-slate-900 border border-[#FF2900]'}`}>
            {message.type === 'success' ? <CheckCircle className="w-5 h-5 text-[#00A354]" /> : <AlertCircle className="w-5 h-5 text-[#FF2900]" />}
            <span>{message.text}</span>
          </div>
        )}

        {/* Grid Slot Masa */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-1">
            <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-700" /> Pilih Slot Masa Bagi ({location})
            </h2>
            <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border">
              Waktu Operasi: 8:00 AM – 10:00 PM (1 Slot = 30 Minit)
            </span>
          </div>
          
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 lg:grid-cols-7 gap-2">
            {TIME_SLOTS.map((slot) => {
              const status = getSlotStatus(selectedDate, slot, bookedSlotTimes, now);
              return (
                <button
                  key={slot}
                  onClick={() => { if (status === 'AVAILABLE') setSelectedSlot(slot); }}
                  className={`p-2.5 rounded-xl text-xs font-black flex flex-col items-center justify-center border transition ${
                    status === 'PAST' ? 'bg-slate-200 text-slate-600 cursor-not-allowed border-slate-300' :
                    status === 'BOOKED' ? 'bg-[#FF2900] text-white cursor-not-allowed border-rose-700' :
                    selectedSlot === slot ? 'bg-blue-600 text-white ring-4 ring-blue-200 scale-105 border-blue-700' :
                    'bg-[#00A354] text-white cursor-pointer hover:brightness-95 border-emerald-700'
                  }`}
                >
                  <span className="text-xs font-extrabold">{slot}</span>
                  <span className="text-[9px] font-bold mt-0.5 px-1 rounded bg-black/20">
                    {status === 'PAST' ? 'Lepas' : status === 'BOOKED' ? 'Penuh' : 'Boleh'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* PERALATAN & BAHAN */}
        <div className="grid md:grid-cols-2 gap-6">
          
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-3">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm border-b pb-2">
              <Utensils className="w-4 h-4 text-blue-600" /> Peralatan Dapur
            </h3>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              <input type="text" placeholder="Cari peralatan..." value={equipSearch} onChange={(e) => setEquipSearch(e.target.value)} className="w-full border border-slate-300 p-1.5 pl-8 rounded-xl text-xs text-slate-900 placeholder:text-slate-500 bg-slate-50 font-semibold" />
            </div>
            <div className="grid grid-cols-2 gap-2.5 max-h-60 overflow-y-auto">
              {filteredEquipment.map(eq => (
                <div key={eq.id} className="p-2.5 bg-slate-100 border border-slate-300 rounded-xl text-xs flex justify-between items-center font-extrabold text-slate-900">
                  <span className="leading-tight pr-1">{eq.item_name}</span>
                  <span className="bg-blue-600 text-white px-2 py-0.5 rounded-full text-[10px] shrink-0">{eq.quantity} unit</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-3">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm border-b pb-2">
              <Carrot className="w-4 h-4 text-[#00A354]" /> Baki Inventori Bahan ({location})
            </h3>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              <input type="text" placeholder="Cari bahan..." value={ingSearch} onChange={(e) => setIngSearch(e.target.value)} className="w-full border border-slate-300 p-1.5 pl-8 rounded-xl text-xs text-slate-900 placeholder:text-slate-500 bg-slate-50 font-semibold" />
            </div>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {INGREDIENT_CATEGORIES.map(cat => {
                const items = filteredIngredients.filter(i => (i.category || 'Bahan Basah') === cat);
                if (items.length === 0) return null;
                return (
                  <div key={cat} className="space-y-1">
                    <span className="text-[10px] font-extrabold text-purple-100 uppercase bg-purple-900 px-2 py-0.5 rounded-md inline-block">{cat}</span>
                    <div className="grid grid-cols-2 gap-2">
                      {items.map(ing => {
                        const isCountable = ing.is_countable;
                        const isOut = isCountable ? (ing.stock_quantity || 0) <= 0 : ing.quantity === 'Tiada';
                        
                        return (
                          <div key={ing.id} className={`p-2 border rounded-xl text-xs flex justify-between items-center font-extrabold ${isOut ? 'bg-rose-100 border-rose-300 text-rose-950' : 'bg-slate-100 border-slate-300 text-slate-900'}`}>
                            <span className="leading-tight pr-1 text-slate-900 font-extrabold">{ing.item_name}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-md text-white font-black shrink-0 ${isOut ? 'bg-rose-600' : 'bg-emerald-700'}`}>
                              {isCountable ? `${ing.stock_quantity || 0} ${ing.unit_label || 'unit'}` : (ing.quantity || 'Ada')}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* HUBUNGI PIC / CONTACTS */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
          <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm border-b pb-2">
            <PhoneCall className="w-4 h-4 text-emerald-600" /> Hubungi PIC / Nombor Bantuan Kecemasan Dapur
          </h3>
          
          <p className="text-xs text-slate-600 font-medium">
            Sila hubungi nombor berikut jika memerlukan bantuan peralatan, masalah kebersihan, tong gas habis, atau sebarang isu di dapur:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {contactsList.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4 font-medium col-span-full">Tiada nombor bantuan dimasukkan lagi oleh pihak pentadbir.</p>
            ) : (
              contactsList.map((c) => (
                <div key={c.id} className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex justify-between items-center text-xs shadow-2xs hover:bg-emerald-100/50 transition">
                  <div className="pr-2">
                    <span className="text-[10px] font-black text-emerald-950 uppercase block">{c.role}</span>
                    <p className="font-extrabold text-slate-900 text-sm leading-tight">{c.name}</p>
                  </div>
                  <a
                    href={`tel:${c.phone_number}`}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 text-xs shrink-0 shadow-xs"
                  >
                    <Phone className="w-3.5 h-3.5" /> {c.phone_number}
                  </a>
                </div>
              ))
            )}
          </div>
        </div>

        {/* FOOTER HAK CIPTA RASMI & PEREKA */}
        <footer className="mt-12 text-center text-xs text-slate-600 font-bold pb-6 border-t border-slate-200 pt-6 no-print">
          <p>© 2026 Sistem Tempahan Dapur Siswa Madani. Hak Cipta Terpelihara Kolej Harun Aminurrashid (KHAR), UPSI.</p>
          <p className="text-[11px] text-slate-500 font-semibold mt-1">Designed by: Astranova</p>
        </footer>

      </div>

      {/* POPUP MODAL: TATACARA PENGGUNAAN DAPUR (SAAT PERTAMA MASUK) */}
      {showRulesModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 md:p-8 shadow-2xl space-y-5 border border-slate-200 max-h-[90vh] overflow-y-auto">
            
            <div className="text-center space-y-2 border-b pb-4">
              <div className="flex justify-center items-center gap-2">
                <img src="/logo-khar.png" alt="Logo KHAR" className="h-10 object-contain" />
                <img src="/logo-dapur-siswa.jpg" alt="Logo Dapur Siswa" className="h-10 object-contain" />
              </div>
              <h3 className="font-extrabold text-slate-900 text-lg md:text-xl pt-2 flex items-center justify-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-600" /> Tatacara Penggunaan Dapur Siswa
              </h3>
              <p className="text-xs font-bold text-blue-700">Kolej Harun Aminurrashid (KHAR)</p>
            </div>

            <div className="space-y-3 text-xs md:text-sm text-slate-700 font-semibold leading-relaxed">
              <p className="font-extrabold text-slate-900 text-xs uppercase tracking-wider text-blue-900 bg-blue-50 p-2 rounded-lg border border-blue-200 text-center">
                Peraturan & Etika Yang Wajib Dipatuhi:
              </p>
              <ol className="list-decimal pl-5 space-y-2.5">
                <li><strong>Slot Masa Tempahan:</strong> Setiap tempahan slot dihadkan mengikut waktu yang telah dipilih sahaja. Sila patuhi tempoh masa penggunaan dapur.</li>
                <li><strong>Kebersihan Ruang Memasak:</strong> Pastikan ruang dapur, sinki, meja dan peralatan yang digunakan dicuci, dilap dan dibersihkan semula selepas selesai.</li>
                <li><strong>Keselamatan Suis Elektrik:</strong> Pastikan semua suis peralatan elektrik dipatikan dan dicabut selepas selesai menggunakan dapur.</li>
                <li><strong>Log / Rekod Bahan Diguna:</strong> Sila rekodkan sebarang bahan masakan yang diambil menerusi butang <em>"Log / Rekod Bahan Diguna"</em> untuk tujuan kemaskini inventori.</li>
                <li><strong>Tanggungjawab & Kerosakan:</strong> Jaga keselamatan peralatan dapur. Laporkan sebarang isu atau kerosakan peralatan dengan segera kepada PIC/EXCO bertugas.</li>
              </ol>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setShowRulesModal(false)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-3.5 rounded-2xl text-xs md:text-sm transition shadow-lg flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" /> Saya Faham & Teruskan Ke Tempahan
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL: LOG BAHAN MASAKAN DIGUNA */}
      {showLogModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto border border-slate-200">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-emerald-600" /> Log Bahan Diguna ({location})
              </h3>
              <button onClick={() => setShowLogModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleLogIngredientsSubmit} className="space-y-3">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                <p className="text-xs text-emerald-950 font-bold flex items-center gap-1">
                  <KeyRound className="w-4 h-4 text-emerald-700" /> Verifikasi Tempahan Anda
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    placeholder="No. Matrik"
                    value={logMatrix}
                    onChange={(e) => setLogMatrix(e.target.value)}
                    className="w-full border border-slate-300 p-2.5 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-500 bg-white focus:ring-2 focus:ring-emerald-500"
                  />
                  <input
                    type="text"
                    required
                    placeholder="KOD TEMPAHAN"
                    value={logCode}
                    onChange={(e) => setLogCode(e.target.value)}
                    className="w-full border border-slate-300 p-2.5 rounded-xl text-xs font-mono font-bold text-slate-900 placeholder:text-slate-500 bg-white uppercase focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-900 mb-1.5 block">
                  Pilih Bahan & Kuantiti Yang Diambil Dari Dapur ({location})
                </label>
                <div className="space-y-3 max-h-52 overflow-y-auto border border-slate-300 p-3 rounded-xl bg-slate-50">
                  {INGREDIENT_CATEGORIES.map(cat => {
                    const catItems = filteredIngredients.filter(i => (i.category || 'Bahan Basah') === cat);
                    if (catItems.length === 0) return null;
                    return (
                      <div key={cat} className="space-y-1">
                        <span className="text-[10px] font-extrabold text-purple-100 uppercase bg-purple-900 px-2 py-0.5 rounded-md inline-block">{cat}</span>
                        <div className="space-y-1 pt-1">
                          {catItems.map(ing => {
                            const isCountable = ing.is_countable;
                            const maxStock = ing.stock_quantity || 0;
                            const isOut = isCountable ? maxStock <= 0 : ing.quantity === 'Tiada';
                            const currentQty = selectedIngQty[ing.id] || 0;
                            const isChecked = selectedPantryCheck[ing.id] || false;

                            return (
                              <div key={ing.id} className={`flex items-center justify-between text-xs p-2 rounded-xl border ${isOut ? 'bg-rose-50 text-rose-900 border-rose-200' : 'bg-white border-slate-300 shadow-2xs'}`}>
                                <span className="font-extrabold text-slate-900 text-xs leading-tight pr-1">
                                  {ing.item_name} {isCountable && <span className="text-blue-700 font-bold">(Stok: {maxStock} {ing.unit_label || ''})</span>}
                                </span>

                                {isOut ? (
                                  <span className="text-[10px] font-extrabold text-rose-600 bg-rose-100 px-2 py-0.5 rounded-md shrink-0">Habis</span>
                                ) : isCountable ? (
                                  <input
                                    type="number"
                                    min="0"
                                    max={maxStock}
                                    placeholder="Qty"
                                    value={currentQty || ''}
                                    onChange={(e) => setSelectedIngQty({ ...selectedIngQty, [ing.id]: Number(e.target.value) })}
                                    className="w-16 border border-slate-400 p-1.5 rounded-lg text-xs font-black text-center text-slate-900 placeholder:text-slate-500 bg-slate-100 shrink-0 focus:bg-white"
                                  />
                                ) : (
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => setSelectedPantryCheck({ ...selectedPantryCheck, [ing.id]: e.target.checked })}
                                    className="w-4 h-4 rounded text-[#00A354] shrink-0"
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <input
                  type="text"
                  placeholder="Bahan lain yang diguna (cth: Perencah sup, Tepung)"
                  value={customIngredients}
                  onChange={(e) => setCustomIngredients(e.target.value)}
                  className="w-full border border-slate-300 p-2.5 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-500 mt-2 bg-white"
                />
              </div>

              <button type="submit" disabled={logLoading} className="w-full bg-emerald-600 text-white font-extrabold py-3 rounded-xl hover:bg-emerald-700 transition text-sm shadow-md">
                {logLoading ? 'Mengesahkan & Memotong Stok...' : 'Sahkan & Potong Stok Inventori'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* POPUP BORANG TEMPAHAN SLOT */}
      {selectedSlot && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto border border-slate-200">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-slate-900 text-base">Borang Tempahan Slot ({selectedSlot})</h3>
              <button onClick={() => setSelectedSlot(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSubmitBooking} className="space-y-3">
              <div>
                <label className="text-xs font-extrabold text-slate-900">Nama Penuh</label>
                <input type="text" required placeholder="Ahmad Safwan" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full border border-slate-300 p-2.5 rounded-xl text-sm font-bold text-slate-900 placeholder:text-slate-500 mt-1 bg-white" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-extrabold text-slate-900">Nombor Matrik</label>
                  <input type="text" required placeholder="D2024XXXXXXX" value={matrixNumber} onChange={(e) => setMatrixNumber(e.target.value)} className="w-full border border-slate-300 p-2.5 rounded-xl text-sm font-bold text-slate-900 placeholder:text-slate-500 mt-1 bg-white" />
                </div>
                <div>
                  <label className="text-xs font-extrabold text-slate-900">Bilangan Pengguna</label>
                  <input type="number" min="1" max="10" required value={paxCount} onChange={(e) => setPaxCount(Number(e.target.value))} className="w-full border border-slate-300 p-2.5 rounded-xl text-sm font-extrabold text-slate-900 mt-1 bg-white" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-extrabold text-slate-900">No. Telefon</label>
                  <input type="tel" required placeholder="012-3456789" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className="w-full border border-slate-300 p-2.5 rounded-xl text-sm font-bold text-slate-900 placeholder:text-slate-500 mt-1 bg-white" />
                </div>
                <div>
                  <label className="text-xs font-extrabold text-slate-900">Rumah / Bilik</label>
                  <input type="text" required placeholder="5-G-1-1" value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} className="w-full border border-slate-300 p-2.5 rounded-xl text-sm font-bold text-slate-900 placeholder:text-slate-500 mt-1 bg-white" />
                </div>
              </div>

              {/* AYAT PERSETUJUAN KEMASKINI: MEMATIKAN SUIS */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <label className="flex items-start gap-2 cursor-pointer text-xs font-bold text-amber-950">
                  <input type="checkbox" required checked={agreedRules} onChange={(e) => setAgreedRules(e.target.checked)} className="mt-0.5 rounded text-amber-600 w-4 h-4" />
                  <span>Saya berjanji akan membersihkan peralatan dan mematikan suis selepas selesai menggunakan dapur.</span>
                </label>
              </div>

              <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white font-extrabold py-3 rounded-xl hover:bg-blue-700 transition text-sm shadow-md">
                {loading ? 'Mengesahkan tempahan...' : 'Sahkan & Submit Tempahan'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Self-Cancellation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-xl space-y-4 border border-slate-200">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-rose-600" /> Batal Tempahan Saya
              </h3>
              <button onClick={() => setShowCancelModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSelfCancel} className="space-y-3">
              <div>
                <label className="text-xs font-extrabold text-slate-900">Nombor Matrik</label>
                <input type="text" required placeholder="D2024XXXXXXX" value={cancelMatrix} onChange={(e) => setCancelMatrix(e.target.value)} className="w-full border border-slate-300 p-2.5 rounded-xl text-sm font-bold text-slate-900 placeholder:text-slate-500 mt-1 bg-white" />
              </div>
              <div>
                <label className="text-xs font-extrabold text-slate-900">Kod Tempahan (6 Aksara)</label>
                <input type="text" required placeholder="A1B2C3" value={cancelCode} onChange={(e) => setCancelCode(e.target.value)} className="w-full border border-slate-300 p-2.5 rounded-xl text-sm font-mono font-bold text-slate-900 placeholder:text-slate-500 mt-1 bg-white uppercase" />
              </div>
              <button type="submit" disabled={cancelLoading} className="w-full bg-rose-600 text-white font-extrabold py-3 rounded-xl hover:bg-rose-700 transition text-sm shadow-md">
                {cancelLoading ? 'Membatalkan...' : 'Sahkan Pembatalan'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Digital Kitchen Pass */}
      {latestPass && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50 print-overlay">
          <div id="printable-pass" className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-5 border border-slate-200">
            <div className="text-center space-y-2 border-b pb-4">
              <div className="flex justify-center items-center gap-2">
                <img src="/logo-khar.png" alt="Logo KHAR" className="h-8 object-contain" />
                <img src="/logo-dapur-siswa.jpg" alt="Logo Dapur Siswa" className="h-8 object-contain" />
              </div>
              <h3 className="font-extrabold text-slate-900 text-lg">PAS DAPUR SISWA MADANI</h3>
              <span className="px-3 py-1 bg-[#00A354]/15 text-[#00A354] border border-[#00A354]/40 rounded-full text-xs font-extrabold inline-block">
                CONFIRMED & VALID
              </span>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs text-slate-800">
              <p><strong>Nama Pelajar:</strong> {latestPass.full_name}</p>
              <p><strong>No. Matrik:</strong> {latestPass.matrix_number}</p>
              <p><strong>Lokasi Dapur:</strong> <span className="text-blue-700 font-bold">{latestPass.location}</span></p>
              <p><strong>Tarikh & Masa:</strong> <span className="text-[#00A354] font-bold">{latestPass.booking_date} ({latestPass.time_slot})</span></p>
              <p><strong>Kod Tempahan / Batal:</strong> <code className="bg-slate-200 px-2 py-0.5 rounded font-mono font-bold text-slate-900">{latestPass.cancellation_code}</code></p>
            </div>

            <div className="flex gap-3 no-print">
              <button onClick={() => window.print()} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-xs">
                <Printer className="w-4 h-4" /> Cetak Pas
              </button>
              <button onClick={() => setLatestPass(null)} className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition">
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}