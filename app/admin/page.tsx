'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { TIME_SLOTS } from '@/lib/utils';
import {
  Calendar, Clock, CheckCircle, XCircle, Trash2, LogOut, Search,
  FileSpreadsheet, Plus, Utensils, Carrot, Megaphone,
  PhoneCall, Pencil, X, Lock, Unlock, UserCheck, ShoppingBag
} from 'lucide-react';

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

export default function AdminDashboard() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Filter States
  const [selectedLocation, setSelectedLocation] = useState<'Blok 4' | 'Blok 6'>('Blok 4');
  const [selectedIngLocation, setSelectedIngLocation] = useState<'Blok 4' | 'Blok 6'>('Blok 4');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Data States
  const [bookings, setBookings] = useState<any[]>([]);
  const [equipment, setEquipment] = useState<any[]>([]);
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [notices, setNotices] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'bookings' | 'equipment' | 'ingredients' | 'notices' | 'contacts'>('bookings');

  // Modal State: Urus Blok Slot Pentadbiran (DIKOSONGKAN NILAI AWAL)
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockReason, setBlockReason] = useState(''); // Kosong
  const [blockStaff, setBlockStaff] = useState('');   // Kosong
  const [blockIngQty, setBlockIngQty] = useState<{ [id: string]: number }>({});
  const [blockCustomIngredients, setBlockCustomIngredients] = useState('');
  const [autoDeductStock, setAutoDeductStock] = useState(true);

  // Modal State: Rekod Bahan Manual Bagi Mana-mana Tempahan
  const [editingBookingBahan, setEditingBookingBahan] = useState<any | null>(null);
  const [editBookingIngQty, setEditBookingIngQty] = useState<{ [id: string]: number }>({});
  const [editBookingCustomIng, setEditBookingCustomIng] = useState('');

  // Form States (Peralatan)
  const [newEquipName, setNewEquipName] = useState('');
  const [newEquipQty, setNewEquipQty] = useState(1);

  // Form States (Bahan Baru)
  const [newIngName, setNewIngName] = useState('');
  const [newIngCategory, setNewIngCategory] = useState('Bahan Basah');
  const [newIngIsCountable, setNewIngIsCountable] = useState(true);
  const [newIngStockQty, setNewIngStockQty] = useState(10);
  const [newIngUnitLabel, setNewIngUnitLabel] = useState('unit');
  const [newIngStatus, setNewIngStatus] = useState('Ada');

  // Edit Modal State (Bahan)
  const [editingIng, setEditingIng] = useState<any | null>(null);

  // Form States (Pengumuman)
  const [newNoticeContent, setNewNoticeContent] = useState('');

  // Form States (Nombor Bantuan / Contacts)
  const [newContactName, setNewContactName] = useState('');
  const [newContactRole, setNewContactRole] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');

  useEffect(() => {
    const auth = sessionStorage.getItem('admin_authenticated');
    if (!auth) {
      router.push('/admin/login');
    } else {
      setIsAuthenticated(true);
      setSelectedDate(new Date().toISOString().split('T')[0]);
    }
  }, [router]);

  const fetchAdminData = async () => {
    if (!selectedDate) return;

    // Fetch Bookings
    const { data: bookingData } = await supabase
      .from('bookings')
      .select('*')
      .eq('location', selectedLocation)
      .eq('booking_date', selectedDate)
      .order('time_slot', { ascending: true });

    if (bookingData) setBookings(bookingData);

    // Fetch Equipment
    const { data: equipData } = await supabase.from('equipment').select('*').order('item_name', { ascending: true });
    if (equipData) setEquipment(equipData);

    // Fetch Ingredients
    const { data: ingData } = await supabase.from('ingredients').select('*').order('item_name', { ascending: true });
    if (ingData) setIngredients(ingData);

    // Fetch Notices
    const { data: noticeData } = await supabase.from('notices').select('*').order('created_at', { ascending: false });
    if (noticeData) setNotices(noticeData);

    // Fetch Contacts
    const { data: contactData } = await supabase.from('contacts').select('*').order('created_at', { ascending: true });
    if (contactData) setContacts(contactData);
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchAdminData();
    }
  }, [isAuthenticated, selectedLocation, selectedDate]);

  const handleLogout = () => {
    sessionStorage.removeItem('admin_authenticated');
    router.push('/admin/login');
  };

  // Helper: Pengasingan Maklumat Petugas & Bahan
  const parseBookingDetails = (b: any) => {
    const isAdmin = b.matrix_number === 'ADMIN';
    let petugas = '-';
    let bahan = b.items_used || 'Belum direkodkan';

    if (isAdmin) {
      const raw = b.items_used || '';
      if (raw.includes('||')) {
        const parts = raw.split('||').map((p: string) => p.trim());
        parts.forEach((p: string) => {
          if (p.startsWith('Petugas:')) petugas = p.replace('Petugas:', '').trim();
          if (p.startsWith('Bahan:')) bahan = p.replace('Bahan:', '').trim();
        });
      } else if (raw.startsWith('Petugas:')) {
        petugas = raw.replace('Petugas:', '').trim();
        bahan = 'Tiada / Belum direkodkan';
      } else if (raw.startsWith('Bahan:')) {
        bahan = raw.replace('Bahan:', '').trim();
      } else {
        bahan = raw || 'Kegunaan Pentadbiran';
      }
    }

    return {
      petugas: petugas || '-',
      bahan: bahan || 'Belum direkodkan'
    };
  };

  // Logik Blok & Rekod Bahan Pentadbiran
  const handleBlockSlot = async (slotTime: string) => {
    const selectedBahanList: string[] = [];
    const locationIngs = ingredients.filter(i => (i.location || 'Blok 4') === selectedLocation);

    for (const [ingId, qty] of Object.entries(blockIngQty)) {
      if (qty > 0) {
        const ingItem = locationIngs.find(i => i.id === ingId);
        if (ingItem) {
          selectedBahanList.push(`${ingItem.item_name} (${qty} ${ingItem.unit_label || 'unit'})`);
          
          if (autoDeductStock && ingItem.is_countable) {
            const newStock = Math.max(0, (ingItem.stock_quantity || 0) - qty);
            await supabase.from('ingredients').update({
              stock_quantity: newStock,
              quantity: newStock > 0 ? 'Ada' : 'Tiada'
            }).eq('id', ingId);
          }
        }
      }
    }

    if (blockCustomIngredients.trim()) {
      selectedBahanList.push(blockCustomIngredients.trim());
    }

    const bahanString = selectedBahanList.length > 0 ? selectedBahanList.join(', ') : 'Tiada bahan direkod';
    const formattedItemsUsed = `Petugas: ${blockStaff.trim() || '-'} || Bahan: ${bahanString}`;

    const existing = bookings.find(b => b.time_slot.slice(0, 5) === slotTime && b.matrix_number === 'ADMIN');
    
    if (existing) {
      const { error } = await supabase.from('bookings').update({
        full_name: blockReason.trim() || 'DIBLOK PENTADBIRAN',
        items_used: formattedItemsUsed
      }).eq('id', existing.id);

      if (error) alert('Gagal mengemaskini slot: ' + error.message);
    } else {
      const { error } = await supabase.from('bookings').insert([{
        full_name: blockReason.trim() || 'DIBLOK PENTADBIRAN',
        matrix_number: 'ADMIN',
        phone_number: '-',
        room_number: '-',
        pax_count: 1,
        items_used: formattedItemsUsed,
        location: selectedLocation,
        booking_date: selectedDate,
        time_slot: slotTime,
        cancellation_code: 'ADMIN',
        status: 'confirmed'
      }]);

      if (error) alert('Gagal menyekat slot: ' + error.message);
    }

    fetchAdminData();
  };

  const handleUnblockSlot = async (bookingId: string) => {
    const { error } = await supabase.from('bookings').delete().eq('id', bookingId);
    if (error) alert('Gagal membuka slot: ' + error.message);
    else fetchAdminData();
  };

  // Simpan Log Bahan Secara Manual Oleh Admin
  const handleSaveAdminLogBahan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBookingBahan) return;

    const selectedBahanList: string[] = [];
    const locationIngs = ingredients.filter(i => (i.location || 'Blok 4') === editingBookingBahan.location);

    for (const [ingId, qty] of Object.entries(editBookingIngQty)) {
      if (qty > 0) {
        const ingItem = locationIngs.find(i => i.id === ingId);
        if (ingItem) {
          selectedBahanList.push(`${ingItem.item_name} (${qty} ${ingItem.unit_label || 'unit'})`);
          
          if (ingItem.is_countable) {
            const newStock = Math.max(0, (ingItem.stock_quantity || 0) - qty);
            await supabase.from('ingredients').update({
              stock_quantity: newStock,
              quantity: newStock > 0 ? 'Ada' : 'Tiada'
            }).eq('id', ingId);
          }
        }
      }
    }

    if (editBookingCustomIng.trim()) {
      selectedBahanList.push(editBookingCustomIng.trim());
    }

    const bahanString = selectedBahanList.length > 0 ? selectedBahanList.join(', ') : 'Tiada bahan direkod';
    let newItemsUsed = bahanString;

    if (editingBookingBahan.matrix_number === 'ADMIN') {
      const details = parseBookingDetails(editingBookingBahan);
      newItemsUsed = `Petugas: ${details.petugas} || Bahan: ${bahanString}`;
    }

    await supabase.from('bookings').update({ items_used: newItemsUsed }).eq('id', editingBookingBahan.id);

    setEditingBookingBahan(null);
    setEditBookingIngQty({});
    setEditBookingCustomIng('');
    fetchAdminData();
  };

  // Status Booking Actions
  const handleUpdateStatus = async (id: string, status: 'confirmed' | 'cancelled') => {
    await supabase.from('bookings').update({ status }).eq('id', id);
    fetchAdminData();
  };

  const handleDeleteBooking = async (id: string) => {
    if (confirm('Adakah anda pasti mahu memadam rekod tempahan ini?')) {
      await supabase.from('bookings').delete().eq('id', id);
      fetchAdminData();
    }
  };

  // Equipment Actions
  const handleAddEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEquipName) return;

    await supabase.from('equipment').insert([{ item_name: newEquipName, quantity: newEquipQty }]);
    setNewEquipName('');
    setNewEquipQty(1);
    fetchAdminData();
  };

  const handleDeleteEquipment = async (id: string) => {
    if (confirm('Padam peralatan ini?')) {
      await supabase.from('equipment').delete().eq('id', id);
      fetchAdminData();
    }
  };

  // Ingredient Actions
  const handleAddIngredient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIngName) return;

    const { error } = await supabase.from('ingredients').insert([{
      item_name: newIngName,
      category: newIngCategory,
      location: selectedIngLocation,
      is_countable: newIngIsCountable,
      stock_quantity: newIngIsCountable ? newIngStockQty : 0,
      unit_label: newIngIsCountable ? newIngUnitLabel : 'unit',
      quantity: newIngIsCountable ? (newIngStockQty > 0 ? 'Ada' : 'Tiada') : newIngStatus
    }]);

    if (error) {
      alert('Gagal menambah bahan: ' + error.message);
      return;
    }

    setNewIngName('');
    setNewIngStockQty(10);
    fetchAdminData();
  };

  const handleUpdateIngredient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingIng) return;

    const { error } = await supabase.from('ingredients').update({
      item_name: editingIng.item_name,
      category: editingIng.category,
      location: editingIng.location,
      is_countable: editingIng.is_countable,
      stock_quantity: editingIng.is_countable ? Number(editingIng.stock_quantity) : 0,
      unit_label: editingIng.is_countable ? editingIng.unit_label : 'unit',
      quantity: editingIng.is_countable ? (Number(editingIng.stock_quantity) > 0 ? 'Ada' : 'Tiada') : editingIng.quantity
    }).eq('id', editingIng.id);

    if (error) {
      alert('Gagal mengemaskini bahan: ' + error.message);
      return;
    }

    setEditingIng(null);
    fetchAdminData();
  };

  const handleDeleteIngredient = async (id: string) => {
    if (confirm('Padam bahan masakan ini?')) {
      await supabase.from('ingredients').delete().eq('id', id);
      fetchAdminData();
    }
  };

  const handleUpdateStock = async (id: string, newStock: number) => {
    await supabase.from('ingredients').update({
      stock_quantity: newStock,
      quantity: newStock > 0 ? 'Ada' : 'Tiada'
    }).eq('id', id);
    fetchAdminData();
  };

  // Notice Actions
  const handleAddNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoticeContent) return;

    await supabase.from('notices').insert([{ content: newNoticeContent, is_active: true }]);
    setNewNoticeContent('');
    fetchAdminData();
  };

  const handleToggleNoticeStatus = async (id: string, currentStatus: boolean) => {
    await supabase.from('notices').update({ is_active: !currentStatus }).eq('id', id);
    fetchAdminData();
  };

  const handleDeleteNotice = async (id: string) => {
    if (confirm('Padam pengumuman ini?')) {
      await supabase.from('notices').delete().eq('id', id);
      fetchAdminData();
    }
  };

  // Contacts Actions
  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactName || !newContactPhone || !newContactRole) return;

    await supabase.from('contacts').insert([{
      name: newContactName,
      role: newContactRole,
      phone_number: newContactPhone
    }]);

    setNewContactName('');
    setNewContactRole('');
    setNewContactPhone('');
    fetchAdminData();
  };

  const handleDeleteContact = async (id: string) => {
    if (confirm('Padam nombor bantuan ini?')) {
      await supabase.from('contacts').delete().eq('id', id);
      fetchAdminData();
    }
  };

  // FUNKSI EKSPORT CSV (LAJUR DIPISAHKAN)
  const handleExportCSV = () => {
    if (bookings.length === 0) {
      alert('Tiada data tempahan untuk dieksport.');
      return;
    }

    const headers = [
      'Masa Slot',
      'Nama Pengguna / Program',
      'No. Matrik',
      'No. Telefon',
      'No. Bilik',
      'Pax',
      'Petugas Bertugas (PIC)',
      'Bahan Masakan Diguna',
      'Kod Tempahan',
      'Status Tempahan'
    ];

    const csvRows = [headers.join(',')];

    bookings.forEach(b => {
      const details = parseBookingDetails(b);
      let statusText = b.status === 'confirmed' ? 'DISAHKAN' : b.status === 'cancelled' ? 'DIBATALKAN' : b.status;
      if (b.matrix_number === 'ADMIN') {
        statusText = 'DIBLOK PENTADBIRAN';
      }

      const row = [
        `"${b.time_slot}"`,
        `"${b.full_name.replace(/"/g, '""')}"`,
        `"${b.matrix_number}"`,
        `"${b.phone_number}"`,
        `"${b.room_number}"`,
        `"${b.pax_count} pax"`,
        `"${details.petugas.replace(/"/g, '""')}"`,
        `"${details.bahan.replace(/"/g, '""')}"`,
        `"${b.cancellation_code}"`,
        `"${statusText}"`
      ];
      csvRows.push(row.join(','));
    });

    const csvContent = '\uFEFF' + csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Laporan_Tempahan_${selectedLocation}_${selectedDate}.csv`;
    a.click();
  };

  const filteredBookings = bookings.filter(b =>
    b.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.matrix_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (b.cancellation_code && b.cancellation_code.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredLocationIngredients = ingredients.filter(i => (i.location || 'Blok 4') === selectedLocation);

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Top Navbar */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <img src="/logo-dapur-siswa.jpg" alt="Logo" className="h-12 object-contain" />
            <div>
              <h1 className="text-xl font-extrabold text-slate-900">Dashboard Pentadbir Dapur Siswa</h1>
              <p className="text-xs font-bold text-blue-700">Kolej Harun Aminurrashid (KHAR)</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold px-4 py-2 rounded-xl text-xs flex items-center gap-2 border border-rose-200 transition"
          >
            <LogOut className="w-4 h-4" /> Log Keluar
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex bg-white p-1.5 rounded-2xl border shadow-sm gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('bookings')}
            className={`flex-1 min-w-[120px] py-2.5 px-4 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 ${
              activeTab === 'bookings' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Calendar className="w-4 h-4" /> Tempahan
          </button>
          <button
            onClick={() => setActiveTab('equipment')}
            className={`flex-1 min-w-[120px] py-2.5 px-4 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 ${
              activeTab === 'equipment' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Utensils className="w-4 h-4" /> Peralatan
          </button>
          <button
            onClick={() => setActiveTab('ingredients')}
            className={`flex-1 min-w-[120px] py-2.5 px-4 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 ${
              activeTab === 'ingredients' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Carrot className="w-4 h-4" /> Inventori Bahan
          </button>
          <button
            onClick={() => setActiveTab('contacts')}
            className={`flex-1 min-w-[120px] py-2.5 px-4 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 ${
              activeTab === 'contacts' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <PhoneCall className="w-4 h-4" /> Hubungi PIC
          </button>
          <button
            onClick={() => setActiveTab('notices')}
            className={`flex-1 min-w-[120px] py-2.5 px-4 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 ${
              activeTab === 'notices' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Megaphone className="w-4 h-4" /> Noticeboard
          </button>
        </div>

        {/* TAB 1: TEMPAHAN */}
        {activeTab === 'bookings' && (
          <div className="space-y-4">
            
            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-2xl border shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex bg-slate-100 p-1 rounded-xl w-full md:w-auto">
                <button onClick={() => setSelectedLocation('Blok 4')} className={`px-5 py-2 rounded-lg text-xs font-extrabold ${selectedLocation === 'Blok 4' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'}`}>Dapur Blok 4</button>
                <button onClick={() => setSelectedLocation('Blok 6')} className={`px-5 py-2 rounded-lg text-xs font-extrabold ${selectedLocation === 'Blok 6' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'}`}>Dapur Blok 6</button>
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <button
                  onClick={() => setShowBlockModal(true)}
                  className="bg-purple-700 hover:bg-purple-800 text-white font-extrabold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition"
                >
                  <Lock className="w-4 h-4" /> Urus & Blok Slot Masa Pentadbiran
                </button>

                <div className="flex items-center gap-2 bg-white border border-slate-300 p-1.5 rounded-xl">
                  <Calendar className="w-4 h-4 text-slate-500" />
                  <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="text-xs font-extrabold text-slate-900 bg-transparent" />
                </div>

                <div className="relative flex-1 md:w-44">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Cari nama / matrik / kod..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full border border-slate-300 p-1.5 pl-8 rounded-xl text-xs text-slate-900 placeholder:text-slate-500 bg-slate-50 font-semibold"
                  />
                </div>

                <button
                  onClick={handleExportCSV}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition"
                >
                  <FileSpreadsheet className="w-4 h-4" /> Eksport CSV
                </button>
              </div>
            </div>

            {/* Jadual Rekod Tempahan */}
            <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b text-slate-700 font-black uppercase text-[10px]">
                      <th className="p-3.5">Masa</th>
                      <th className="p-3.5">Nama / Program</th>
                      <th className="p-3.5">No. Matrik</th>
                      <th className="p-3.5">Telefon / Bilik</th>
                      <th className="p-3.5">Pax</th>
                      <th className="p-3.5">Petugas Bertugas (PIC)</th>
                      <th className="p-3.5">Bahan Masakan Digunakan</th>
                      <th className="p-3.5">Kod</th>
                      <th className="p-3.5 text-center">Status</th>
                      <th className="p-3.5 text-center">Tindakan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-semibold text-slate-800">
                    {filteredBookings.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="p-8 text-center text-slate-400 font-bold">
                          Tiada rekod tempahan dijumpai bagi tarikh & blok ini.
                        </td>
                      </tr>
                    ) : (
                      filteredBookings.map((b) => {
                        const isAdminBlock = b.matrix_number === 'ADMIN';
                        const details = parseBookingDetails(b);

                        return (
                          <tr key={b.id} className={`hover:bg-slate-50 ${isAdminBlock ? 'bg-purple-50/50' : ''}`}>
                            <td className="p-3.5 font-black text-blue-700">{b.time_slot}</td>
                            <td className="p-3.5">
                              <p className={`font-extrabold ${isAdminBlock ? 'text-purple-900' : 'text-slate-900'}`}>
                                {b.full_name}
                              </p>
                            </td>
                            <td className="p-3.5 font-mono text-[11px] text-slate-600">{b.matrix_number}</td>
                            <td className="p-3.5">
                              <p className="text-slate-900">{b.phone_number}</p>
                              <p className="text-[10px] text-slate-500">Bilik: {b.room_number}</p>
                            </td>
                            <td className="p-3.5 font-bold">{b.pax_count} pax</td>
                            
                            {/* LAJUR PETUGAS BERTUGAS */}
                            <td className="p-3.5 font-extrabold text-purple-900 max-w-[150px]">
                              {isAdminBlock ? (
                                <span className="bg-purple-100 text-purple-900 px-2 py-1 rounded-lg text-[11px] inline-block">
                                  {details.petugas}
                                </span>
                              ) : (
                                <span className="text-slate-400 font-normal">-</span>
                              )}
                            </td>

                            {/* LAJUR BAHAN MASAKAN DIGUNAKAN */}
                            <td className="p-3.5 max-w-[200px] text-[11px] text-slate-900 font-semibold leading-relaxed">
                              {details.bahan}
                            </td>

                            <td className="p-3.5 font-mono font-bold text-slate-900 bg-slate-100 rounded text-center">
                              {b.cancellation_code}
                            </td>
                            <td className="p-3.5 text-center">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                                isAdminBlock ? 'bg-purple-200 text-purple-900' :
                                b.status === 'confirmed' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                              }`}>
                                {isAdminBlock ? 'DIBLOK' : b.status}
                              </span>
                            </td>
                            <td className="p-3.5 text-center space-x-1 whitespace-nowrap">
                              <button
                                onClick={() => setEditingBookingBahan(b)}
                                title="Rekod / Edit Bahan Diguna"
                                className="p-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg font-bold text-[10px] inline-flex items-center gap-1 border border-emerald-200"
                              >
                                <ShoppingBag className="w-3.5 h-3.5" /> Rekod Bahan
                              </button>

                              {isAdminBlock ? (
                                <button
                                  onClick={() => handleUnblockSlot(b.id)}
                                  title="Buka Sekatan Slot"
                                  className="p-1.5 bg-purple-100 text-purple-800 hover:bg-purple-200 rounded-lg font-bold text-[10px] inline-flex items-center gap-1"
                                >
                                  <Unlock className="w-3.5 h-3.5" /> Buka
                                </button>
                              ) : (
                                <>
                                  {b.status === 'confirmed' ? (
                                    <button
                                      onClick={() => handleUpdateStatus(b.id, 'cancelled')}
                                      title="Batalkan Tempahan"
                                      className="p-1.5 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100"
                                    >
                                      <XCircle className="w-4 h-4" />
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => handleUpdateStatus(b.id, 'confirmed')}
                                      title="Sahkan Tempahan"
                                      className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100"
                                    >
                                      <CheckCircle className="w-4 h-4" />
                                    </button>
                                  )}
                                </>
                              )}

                              <button
                                onClick={() => handleDeleteBooking(b.id)}
                                title="Padam Rekod"
                                className="p-1.5 bg-rose-50 text-rose-700 rounded-lg hover:bg-rose-100"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: PERALATAN */}
        {activeTab === 'equipment' && (
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white p-5 rounded-2xl border shadow-sm space-y-4">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-600" /> Tambah Peralatan Baru
              </h3>
              <form onSubmit={handleAddEquipment} className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-800">Nama Peralatan</label>
                  <input
                    type="text"
                    required
                    placeholder="cth: Periuk Nasi Elektrik"
                    value={newEquipName}
                    onChange={(e) => setNewEquipName(e.target.value)}
                    className="w-full border border-slate-300 p-2 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-500 mt-1 bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-800">Kuantiti (Unit)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newEquipQty}
                    onChange={(e) => setNewEquipQty(Number(e.target.value))}
                    className="w-full border border-slate-300 p-2 rounded-xl text-xs font-bold text-slate-900 mt-1 bg-white"
                  />
                </div>
                <button type="submit" className="w-full bg-blue-600 text-white font-extrabold py-2.5 rounded-xl text-xs hover:bg-blue-700 transition">
                  Tambah Peralatan
                </button>
              </form>
            </div>

            <div className="md:col-span-2 bg-white p-5 rounded-2xl border shadow-sm space-y-3">
              <h3 className="font-extrabold text-slate-900 text-sm border-b pb-2">Senarai Peralatan Dapur</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {equipment.map(eq => (
                  <div key={eq.id} className="p-3 bg-slate-50 border rounded-xl flex justify-between items-center text-xs">
                    <div>
                      <p className="font-extrabold text-slate-900">{eq.item_name}</p>
                      <p className="text-[10px] text-blue-700 font-bold">{eq.quantity} Unit Disediakan</p>
                    </div>
                    <button onClick={() => handleDeleteEquipment(eq.id)} className="text-rose-600 hover:text-rose-800 p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: INVENTORI BAHAN */}
        {activeTab === 'ingredients' && (
          <div className="space-y-4">
            
            <div className="bg-white p-4 rounded-2xl border shadow-sm flex items-center justify-between gap-4">
              <span className="text-xs font-extrabold text-slate-900">Pilih Dapur Blok Untuk Urus Inventori:</span>
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setSelectedIngLocation('Blok 4')}
                  className={`px-5 py-1.5 rounded-lg text-xs font-extrabold ${selectedIngLocation === 'Blok 4' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-700'}`}
                >
                  Inventori Blok 4
                </button>
                <button
                  onClick={() => setSelectedIngLocation('Blok 6')}
                  className={`px-5 py-1.5 rounded-lg text-xs font-extrabold ${selectedIngLocation === 'Blok 6' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-700'}`}
                >
                  Inventori Blok 6
                </button>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              
              <div className="bg-white p-5 rounded-2xl border shadow-sm space-y-4">
                <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                  <Plus className="w-4 h-4 text-emerald-600" /> Tambah Bahan ({selectedIngLocation})
                </h3>
                <form onSubmit={handleAddIngredient} className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-slate-800">Nama Bahan</label>
                    <input
                      type="text"
                      required
                      placeholder="cth: Telur Ayam"
                      value={newIngName}
                      onChange={(e) => setNewIngName(e.target.value)}
                      className="w-full border border-slate-300 p-2 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-500 mt-1 bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-800">Kategori</label>
                    <select
                      value={newIngCategory}
                      onChange={(e) => setNewIngCategory(e.target.value)}
                      className="w-full border border-slate-300 p-2 rounded-xl text-xs font-bold text-slate-900 mt-1 bg-white"
                    >
                      {INGREDIENT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="isCountable"
                      checked={newIngIsCountable}
                      onChange={(e) => setNewIngIsCountable(e.target.checked)}
                      className="rounded text-blue-600 w-4 h-4"
                    />
                    <label htmlFor="isCountable" className="text-xs font-bold text-slate-800 cursor-pointer">Bahan Boleh Dikira (Stok Bilangan)</label>
                  </div>

                  {newIngIsCountable ? (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs font-bold text-slate-800">Baki Stok</label>
                        <input
                          type="number"
                          min="0"
                          value={newIngStockQty}
                          onChange={(e) => setNewIngStockQty(Number(e.target.value))}
                          className="w-full border border-slate-300 p-2 rounded-xl text-xs font-bold text-slate-900 mt-1 bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-800">Unit (cth: biji/pack)</label>
                        <input
                          type="text"
                          value={newIngUnitLabel}
                          onChange={(e) => setNewIngUnitLabel(e.target.value)}
                          className="w-full border border-slate-300 p-2 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-500 mt-1 bg-white"
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="text-xs font-bold text-slate-800">Status Stok</label>
                      <select
                        value={newIngStatus}
                        onChange={(e) => setNewIngStatus(e.target.value)}
                        className="w-full border border-slate-300 p-2 rounded-xl text-xs font-bold text-slate-900 mt-1 bg-white"
                      >
                        <option value="Ada">Ada</option>
                        <option value="Sedikit">Sedikit</option>
                        <option value="Tiada">Tiada / Habis</option>
                      </select>
                    </div>
                  )}

                  <button type="submit" className="w-full bg-emerald-600 text-white font-extrabold py-2.5 rounded-xl text-xs hover:bg-emerald-700 transition">
                    Tambah Bahan Ke {selectedIngLocation}
                  </button>
                </form>
              </div>

              <div className="md:col-span-2 bg-white p-5 rounded-2xl border shadow-sm space-y-4">
                <h3 className="font-extrabold text-slate-900 text-sm border-b pb-2">
                  Senarai Inventori Bahan ({selectedIngLocation})
                </h3>
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                  {INGREDIENT_CATEGORIES.map(cat => {
                    const catItems = ingredients.filter(
                      i => (i.category || 'Bahan Basah') === cat && (i.location || 'Blok 4') === selectedIngLocation
                    );
                    if (catItems.length === 0) return null;

                    return (
                      <div key={cat} className="space-y-2 border-b pb-3">
                        <span className="text-[10px] font-extrabold text-purple-100 uppercase bg-purple-900 px-2 py-0.5 rounded-md inline-block">
                          {cat}
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {catItems.map((ing) => {
                            const isCountable = ing.is_countable;

                            return (
                              <div key={ing.id} className="p-2.5 bg-slate-50 border rounded-xl flex justify-between items-center text-xs">
                                <div>
                                  <p className="font-extrabold text-slate-900">{ing.item_name}</p>
                                  <p className="text-[10px] text-slate-600 font-bold">
                                    {isCountable ? `Stok: ${ing.stock_quantity || 0} ${ing.unit_label || ''}` : `Status: ${ing.quantity}`}
                                  </p>
                                </div>

                                <div className="flex items-center gap-1.5">
                                  {isCountable && (
                                    <input
                                      type="number"
                                      min="0"
                                      value={ing.stock_quantity || 0}
                                      onChange={(e) => handleUpdateStock(ing.id, Number(e.target.value))}
                                      className="w-14 border border-slate-300 p-1 rounded-md text-xs font-extrabold text-center text-slate-900 bg-white"
                                    />
                                  )}
                                  
                                  <button
                                    onClick={() => setEditingIng({ ...ing })}
                                    title="Edit Bahan"
                                    className="p-1 text-blue-600 hover:text-blue-800 bg-blue-50 rounded-lg border border-blue-200"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    onClick={() => handleDeleteIngredient(ing.id)}
                                    title="Padam Bahan"
                                    className="p-1 text-rose-600 hover:text-rose-800 bg-rose-50 rounded-lg border border-rose-200"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
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

          </div>
        )}

        {/* TAB 4: HUBUNGI PIC / CONTACTS */}
        {activeTab === 'contacts' && (
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white p-5 rounded-2xl border shadow-sm space-y-4">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-600" /> Tambah Nombor Bantuan
              </h3>
              <form onSubmit={handleAddContact} className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-800">Nama PIC</label>
                  <input
                    type="text"
                    required
                    placeholder="cth: Encik Fairuz / Ahmad Safwan"
                    value={newContactName}
                    onChange={(e) => setNewContactName(e.target.value)}
                    className="w-full border border-slate-300 p-2 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-500 mt-1 bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-800">Peranan / Jawatan (Bebas Taip)</label>
                  <input
                    type="text"
                    required
                    placeholder="cth: EXCO FOOD SECURITY / Felo Bertugas Blok 4"
                    value={newContactRole}
                    onChange={(e) => setNewContactRole(e.target.value)}
                    className="w-full border border-slate-300 p-2 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-500 mt-1 bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-800">Nombor Telefon</label>
                  <input
                    type="tel"
                    required
                    placeholder="cth: 011-35324950"
                    value={newContactPhone}
                    onChange={(e) => setNewContactPhone(e.target.value)}
                    className="w-full border border-slate-300 p-2 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-500 mt-1 bg-white"
                  />
                </div>
                <button type="submit" className="w-full bg-emerald-600 text-white font-extrabold py-2.5 rounded-xl text-xs hover:bg-emerald-700 transition">
                  Simpan Nombor PIC
                </button>
              </form>
            </div>

            <div className="md:col-span-2 bg-white p-5 rounded-2xl border shadow-sm space-y-3">
              <h3 className="font-extrabold text-slate-900 text-sm border-b pb-2">Senarai Nombor Bantuan & PIC Dapur</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {contacts.length === 0 ? (
                  <p className="text-xs text-slate-400 col-span-full py-4 text-center">Tiada nombor dimasukkan lagi.</p>
                ) : (
                  contacts.map(c => (
                    <div key={c.id} className="p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-xl flex justify-between items-center text-xs">
                      <div>
                        <span className="text-[10px] font-black text-emerald-900 uppercase block">{c.role}</span>
                        <p className="font-extrabold text-slate-900 text-sm leading-tight">{c.name}</p>
                        <p className="text-emerald-700 font-bold">{c.phone_number}</p>
                      </div>
                      <button onClick={() => handleDeleteContact(c.id)} className="text-rose-600 hover:text-rose-800 p-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: NOTICEBOARD */}
        {activeTab === 'notices' && (
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white p-5 rounded-2xl border shadow-sm space-y-4">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-amber-600" /> Pengumuman Baru
              </h3>
              <form onSubmit={handleAddNotice} className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-800">Kandungan Pengumuman</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Tulis maklumat penting bagi pengguna dapur..."
                    value={newNoticeContent}
                    onChange={(e) => setNewNoticeContent(e.target.value)}
                    className="w-full border border-slate-300 p-2 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-500 mt-1 bg-white"
                  />
                </div>
                <button type="submit" className="w-full bg-amber-500 text-slate-950 font-extrabold py-2.5 rounded-xl text-xs hover:bg-amber-600 transition">
                  Siarkan Pengumuman
                </button>
              </form>
            </div>

            <div className="md:col-span-2 bg-white p-5 rounded-2xl border shadow-sm space-y-3">
              <h3 className="font-extrabold text-slate-900 text-sm border-b pb-2 flex justify-between items-center">
                <span>Pengurusan Pengumuman</span>
                <span className="text-[10px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded font-extrabold">
                  {notices.filter(n => n.is_active).length} Dipaparkan
                </span>
              </h3>
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {notices.map(n => (
                  <div key={n.id} className={`p-4 rounded-xl border flex justify-between items-center gap-3 ${n.is_active ? 'bg-amber-50/80 border-amber-300' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${n.is_active ? 'bg-emerald-600 text-white' : 'bg-slate-400 text-white'}`}>
                          {n.is_active ? 'Dipaparkan (Aktif)' : 'Disimpan (Arkib)'}
                        </span>
                        <span className="text-[10px] text-slate-400">{new Date(n.created_at).toLocaleString()}</span>
                      </div>
                      <p className="text-xs font-bold text-slate-900">{n.content}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleToggleNoticeStatus(n.id, n.is_active)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1 ${
                          n.is_active ? 'bg-amber-600 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                        }`}
                      >
                        {n.is_active ? 'Matikan' : 'Aktifkan'}
                      </button>

                      <button onClick={() => handleDeleteNotice(n.id)} className="text-rose-600 hover:text-rose-800 p-1.5 bg-rose-50 rounded-lg border border-rose-200">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* FOOTER HAK CIPTA RASMI & PEREKA */}
        <footer className="mt-12 text-center text-xs text-slate-600 font-bold pb-6 border-t border-slate-200 pt-6 no-print">
          <p>© 2026 Sistem Tempahan Dapur Siswa Madani. Hak Cipta Terpelihara Kolej Harun Aminurrashid (KHAR), UPSI.</p>
          <p className="text-[11px] text-slate-500 font-semibold mt-1">Designed by: Astranova</p>
        </footer>

      </div>

      {/* POPUP MODAL: URUS, BLOK & REKOD BAHAN PENTADBIRAN */}
      {showBlockModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-2xl rounded-3xl p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto border border-slate-200">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                  <Lock className="w-5 h-5 text-purple-700" /> Urus Sekatan Slot Masa & Rekod Bahan
                </h3>
                <p className="text-xs font-bold text-purple-700">Lokasi: {selectedLocation} | Tarikh: {selectedDate}</p>
              </div>
              <button onClick={() => setShowBlockModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-extrabold text-slate-900">1. Tujuan Sekatan / Program</label>
                  <input
                    type="text"
                    value={blockReason}
                    onChange={(e) => setBlockReason(e.target.value)}
                    placeholder="cth: DIBLOK PENTADBIRAN (Agihan Makanan)"
                    className="w-full border border-slate-300 p-2.5 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-400 mt-1 bg-slate-50 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-extrabold text-purple-900 flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-purple-700" /> 2. Nama Petugas Bertugas (PIC)
                  </label>
                  <input
                    type="text"
                    value={blockStaff}
                    onChange={(e) => setBlockStaff(e.target.value)}
                    placeholder="cth: Ahmad Safwan & Nurul Izzah"
                    className="w-full border border-purple-300 p-2.5 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-400 mt-1 bg-purple-50 focus:bg-white"
                  />
                </div>
              </div>

              {/* BAHAGIAN ADMIN REKOD BAHAN DIGUNA */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-extrabold text-slate-900 flex items-center gap-1">
                    <Carrot className="w-4 h-4 text-emerald-600" /> 3. Bahan Masakan Digunakan Bagi Slot Ini (Pilihan):
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-[10px] font-bold text-emerald-800">
                    <input
                      type="checkbox"
                      checked={autoDeductStock}
                      onChange={(e) => setAutoDeductStock(e.target.checked)}
                      className="rounded text-emerald-600 w-3.5 h-3.5"
                    />
                    <span>Potong Stok Inventori Automatik</span>
                  </label>
                </div>

                <div className="max-h-36 overflow-y-auto space-y-1.5 p-2 bg-white border rounded-xl">
                  {filteredLocationIngredients.length === 0 ? (
                    <p className="text-[11px] text-slate-400 text-center py-2">Tiada bahan dimasukkan dalam inventori bagi {selectedLocation}.</p>
                  ) : (
                    filteredLocationIngredients.map((ing) => (
                      <div key={ing.id} className="flex items-center justify-between text-xs p-1.5 bg-slate-50 rounded-lg border">
                        <span className="font-extrabold text-slate-800 text-[11px]">
                          {ing.item_name} {ing.is_countable && <span className="text-blue-600 font-normal">(Stok: {ing.stock_quantity || 0})</span>}
                        </span>
                        {ing.is_countable ? (
                          <input
                            type="number"
                            min="0"
                            placeholder="Qty"
                            value={blockIngQty[ing.id] || ''}
                            onChange={(e) => setBlockIngQty({ ...blockIngQty, [ing.id]: Number(e.target.value) })}
                            className="w-14 border p-1 rounded text-xs text-center font-bold text-slate-900 bg-white"
                          />
                        ) : (
                          <input
                            type="checkbox"
                            checked={!!blockIngQty[ing.id]}
                            onChange={(e) => setBlockIngQty({ ...blockIngQty, [ing.id]: e.target.checked ? 1 : 0 })}
                            className="rounded text-emerald-600 w-4 h-4"
                          />
                        )}
                      </div>
                    ))
                  )}
                </div>

                <input
                  type="text"
                  placeholder="Bahan lain / Catatan tambahan (cth: Perencah Khas 2 paket)"
                  value={blockCustomIngredients}
                  onChange={(e) => setBlockCustomIngredients(e.target.value)}
                  className="w-full border border-slate-300 p-2 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 bg-white"
                />
              </div>

              <p className="text-xs font-extrabold text-slate-700 pt-1">Klik pada slot masa di bawah untuk Blok / Kemaskini atau Buka semula:</p>

              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                {TIME_SLOTS.map((slot) => {
                  const existingBooking = bookings.find(b => b.time_slot.slice(0, 5) === slot && b.status === 'confirmed');
                  const isBlockedByAdmin = existingBooking && existingBooking.matrix_number === 'ADMIN';
                  const isBookedByStudent = existingBooking && existingBooking.matrix_number !== 'ADMIN';

                  return (
                    <div key={slot} className="flex flex-col gap-1">
                      {isBlockedByAdmin ? (
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => handleBlockSlot(slot)}
                            className="p-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-t-xl text-[11px] font-extrabold transition shadow-xs"
                            title="Klik untuk Kemaskini Petugas/Bahan pada Slot Ini"
                          >
                            <span>{slot}</span>
                            <span className="text-[8px] bg-purple-900 block rounded mt-0.5 py-0.5">Kemaskini</span>
                          </button>
                          <button
                            onClick={() => handleUnblockSlot(existingBooking.id)}
                            className="p-1 bg-purple-100 text-purple-900 hover:bg-purple-200 rounded-b-xl text-[9px] font-bold flex items-center justify-center gap-0.5"
                            title="Klik untuk Buka Semula Slot"
                          >
                            <Unlock className="w-2.5 h-2.5" /> Buka
                          </button>
                        </div>
                      ) : isBookedByStudent ? (
                        <div
                          className="p-2 bg-rose-100 border border-rose-300 text-rose-800 rounded-xl text-xs font-extrabold flex flex-col items-center justify-center opacity-80"
                          title={`Ditempah oleh ${existingBooking.full_name}`}
                        >
                          <span>{slot}</span>
                          <span className="text-[8px] bg-rose-600 text-white px-1 py-0.5 rounded mt-0.5">Pelajar</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleBlockSlot(slot)}
                          className="p-2 bg-slate-100 hover:bg-purple-100 hover:text-purple-900 border border-slate-300 text-slate-800 rounded-xl text-xs font-extrabold flex flex-col items-center justify-center transition"
                          title="Klik untuk Blok Slot Masa Ini"
                        >
                          <span>{slot}</span>
                          <span className="text-[9px] text-slate-500 font-bold mt-0.5 flex items-center gap-0.5">
                            <Lock className="w-2.5 h-2.5" /> Blok
                          </span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-3 border-t flex justify-end">
              <button
                onClick={() => setShowBlockModal(false)}
                className="bg-slate-900 text-white font-extrabold px-5 py-2.5 rounded-xl text-xs hover:bg-slate-800 transition"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP MODAL: ADMIN REKOD / EDIT BAHAN UNTUK SEBARANG TEMPAHAN */}
      {editingBookingBahan && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-xl space-y-4 border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-emerald-600" /> Rekod Bahan Diguna oleh Admin
                </h3>
                <p className="text-xs font-bold text-slate-600">Tempahan: {editingBookingBahan.full_name} ({editingBookingBahan.time_slot})</p>
              </div>
              <button onClick={() => setEditingBookingBahan(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSaveAdminLogBahan} className="space-y-3">
              <div>
                <label className="text-xs font-extrabold text-slate-900 mb-1 block">Pilih Bahan Masakan Dapur ({editingBookingBahan.location}):</label>
                <div className="space-y-1.5 max-h-48 overflow-y-auto border p-2.5 rounded-xl bg-slate-50">
                  {ingredients.filter(i => (i.location || 'Blok 4') === editingBookingBahan.location).map(ing => (
                    <div key={ing.id} className="flex items-center justify-between text-xs p-1.5 bg-white rounded-lg border">
                      <span className="font-bold text-slate-800 text-[11px]">
                        {ing.item_name} {ing.is_countable && <span className="text-blue-600 font-normal">(Stok: {ing.stock_quantity || 0})</span>}
                      </span>
                      {ing.is_countable ? (
                        <input
                          type="number"
                          min="0"
                          placeholder="Qty"
                          value={editBookingIngQty[ing.id] || ''}
                          onChange={(e) => setEditBookingIngQty({ ...editBookingIngQty, [ing.id]: Number(e.target.value) })}
                          className="w-14 border p-1 rounded text-xs text-center font-bold text-slate-900 bg-slate-50"
                        />
                      ) : (
                        <input
                          type="checkbox"
                          checked={!!editBookingIngQty[ing.id]}
                          onChange={(e) => setEditBookingIngQty({ ...editBookingIngQty, [ing.id]: e.target.checked ? 1 : 0 })}
                          className="rounded text-emerald-600 w-4 h-4"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-900 mb-1 block">Bahan Lain / Catatan Tambahan:</label>
                <input
                  type="text"
                  placeholder="cth: Kicap Manis, Garam"
                  value={editBookingCustomIng}
                  onChange={(e) => setEditBookingCustomIng(e.target.value)}
                  className="w-full border border-slate-300 p-2.5 rounded-xl text-xs font-bold text-slate-900 bg-white"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setEditingBookingBahan(null)} className="flex-1 bg-slate-200 text-slate-800 font-bold py-2.5 rounded-xl text-xs">
                  Batal
                </button>
                <button type="submit" className="flex-1 bg-emerald-600 text-white font-extrabold py-2.5 rounded-xl text-xs hover:bg-emerald-700 transition shadow-md">
                  Simpan & Potong Stok
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POPUP MODAL: EDIT BAHAN MASAKAN */}
      {editingIng && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-xl space-y-4 border border-slate-200">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Pencil className="w-4 h-4 text-blue-600" /> Kemaskini Maklumat Bahan
              </h3>
              <button onClick={() => setEditingIng(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleUpdateIngredient} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-800">Nama Bahan</label>
                <input
                  type="text"
                  required
                  value={editingIng.item_name || ''}
                  onChange={(e) => setEditingIng({ ...editingIng, item_name: e.target.value })}
                  className="w-full border border-slate-300 p-2 rounded-xl text-xs font-bold text-slate-900 mt-1 bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-800">Kategori</label>
                  <select
                    value={editingIng.category || 'Bahan Basah'}
                    onChange={(e) => setEditingIng({ ...editingIng, category: e.target.value })}
                    className="w-full border border-slate-300 p-2 rounded-xl text-xs font-bold text-slate-900 mt-1 bg-white"
                  >
                    {INGREDIENT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-800">Lokasi Blok Dapur</label>
                  <select
                    value={editingIng.location || 'Blok 4'}
                    onChange={(e) => setEditingIng({ ...editingIng, location: e.target.value })}
                    className="w-full border border-slate-300 p-2 rounded-xl text-xs font-bold text-slate-900 mt-1 bg-white"
                  >
                    <option value="Blok 4">Dapur Blok 4</option>
                    <option value="Blok 6">Dapur Blok 6</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="editIsCountable"
                  checked={editingIng.is_countable ?? true}
                  onChange={(e) => setEditingIng({ ...editingIng, is_countable: e.target.checked })}
                  className="rounded text-blue-600 w-4 h-4"
                />
                <label htmlFor="editIsCountable" className="text-xs font-bold text-slate-800 cursor-pointer">Bahan Boleh Dikira (Stok Bilangan)</label>
              </div>

              {editingIng.is_countable ? (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-bold text-slate-800">Baki Stok</label>
                    <input
                      type="number"
                      min="0"
                      value={editingIng.stock_quantity ?? 0}
                      onChange={(e) => setEditingIng({ ...editingIng, stock_quantity: Number(e.target.value) })}
                      className="w-full border border-slate-300 p-2 rounded-xl text-xs font-bold text-slate-900 mt-1 bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-800">Unit Label</label>
                    <input
                      type="text"
                      value={editingIng.unit_label || 'unit'}
                      onChange={(e) => setEditingIng({ ...editingIng, unit_label: e.target.value })}
                      className="w-full border border-slate-300 p-2 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-500 mt-1 bg-white"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="text-xs font-bold text-slate-800">Status Stok</label>
                  <select
                    value={editingIng.quantity || 'Ada'}
                    onChange={(e) => setEditingIng({ ...editingIng, quantity: e.target.value })}
                    className="w-full border border-slate-300 p-2 rounded-xl text-xs font-bold text-slate-900 mt-1 bg-white"
                  >
                    <option value="Ada">Ada</option>
                    <option value="Sedikit">Sedikit</option>
                    <option value="Tiada">Tiada / Habis</option>
                  </select>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingIng(null)}
                  className="flex-1 bg-slate-200 text-slate-800 font-bold py-2.5 rounded-xl text-xs hover:bg-slate-300 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white font-extrabold py-2.5 rounded-xl text-xs hover:bg-blue-700 transition shadow-md"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </main>
  );
}