import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const { cancellation_code, matrix_number } = await req.json();

    if (!cancellation_code || !matrix_number) {
      return NextResponse.json({ error: 'Sila masukkan No. Matrik dan Kod Pembatalan.' }, { status: 400 });
    }

    const cleanCode = cancellation_code.trim();
    const cleanMatrix = matrix_number.trim();

    // Semak tempahan sepadan (Menggunakan .ilike untuk sokong huruf besar/kecil)
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('*')
      .ilike('cancellation_code', cleanCode)
      .ilike('matrix_number', cleanMatrix)
      .eq('status', 'confirmed')
      .maybeSingle();

    if (fetchError || !booking) {
      return NextResponse.json(
        { error: 'Kod pembatalan atau No. Matrik tidak sah / tempahan telah pun dibatalkan.' },
        { status: 400 }
      );
    }

    // Kemaskini status tempahan kepada cancelled
    const { error: updateError } = await supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', booking.id);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true, booking });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}