export const TIME_SLOTS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30',
  '20:00', '20:30'
];

export function getSlotStatus(
  selectedDate: string,
  slotTime: string,
  bookedSlots: string[],
  now: Date | null
) {
  if (!now) return 'AVAILABLE';

  const todayStr = now.toISOString().split('T')[0];
  
  if (selectedDate === todayStr) {
    const [hours, minutes] = slotTime.split(':').map(Number);
    const slotDateTime = new Date(now);
    slotDateTime.setHours(hours, minutes, 0, 0);

    if (slotDateTime < now) {
      return 'PAST';
    }
  }

  if (bookedSlots.includes(slotTime)) {
    return 'BOOKED';
  }

  return 'AVAILABLE';
}