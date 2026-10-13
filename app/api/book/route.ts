import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      full_name,
      matrix_number,
      phone_number,
      room_number,
      pax_count,
      paxCount,
      items_used,
      location,
      booking_date,
      time_slot,
    } = body;

    // Sokong kedua-dua nama pembolehubah (pax_count atau paxCount)
    const actualPaxCount = pax_count || paxCount || 1;

    // Penjanaan Kod Pembatalan 6 Aksara
    const cancellation_code = Math.random().toString(36).substring(2, 8).toUpperCase();

    // Semak sama ada slot sudah ditempah oleh pengguna lain
    const { data: existing } = await supabase
      .from('bookings')
      .select('id')
      .eq('location', location)
      .eq('booking_date', booking_date)
      .eq('time_slot', time_slot)
      .eq('status', 'confirmed');

    if (existing && existing.length > 0) {
      return NextResponse.json(
        { error: 'Slot ini telah pun ditempah oleh pengguna lain.' },
        { status: 400 }
      );
    }

    // Masukkan rekod tempahan ke dalam pangkalan data
    const { data, error } = await supabase
      .from('bookings')
      .insert([
        {
          full_name,
          matrix_number,
          phone_number,
          room_number,
          pax_count: Number(actualPaxCount),
          items_used: items_used || 'Belum direkodkan',
          location,
          booking_date,
          time_slot,
          cancellation_code,
          status: 'confirmed',
        },
      ])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Tempahan Berjaya!', booking: data });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Ralat semasa memproses tempahan.' },
      { status: 500 }
    );
  }
}