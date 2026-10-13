export const TIME_SLOTS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30',
  '20:00', '20:30',
];

export function getSlotStatus(
  selectedDate: string,
  slotTime: string,
  bookedSlots: string[],
  now: Date | null
): 'PAST' | 'BOOKED' | 'AVAILABLE' {
  if (!now || !selectedDate) return 'AVAILABLE';

  const [hours, minutes] = slotTime.split(':').map(Number);
  const [year, month, day] = selectedDate.split('-').map(Number);

  // Bina datetime bagi slot dalam zon masa tempatan
  const slotDate = new Date(year, month - 1, day, hours, minutes, 0, 0);

  // 1. KEUTAMAAN UTAMA: Semak jika waktu slot sudah LEPAS berbanding waktu sekarang
  if (slotDate < now) {
    return 'PAST'; // Akan sentiasa bertukar KELABU ("Lepas")
  }

  // 2. Jika waktu slot BELUM LEPAS, semak sama ada ia telah ditempah
  if (bookedSlots.includes(slotTime)) {
    return 'BOOKED'; // Merah ("Penuh")
  }

  return 'AVAILABLE'; // Hijau ("Boleh")
}