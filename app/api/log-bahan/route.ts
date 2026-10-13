import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Fungsi bantuan untuk mengecam dan menggabungkan kuantiti bahan yang sama secara automatik
function parseAndCombineItems(
  existingStr: string,
  newItems: { name: string; qty?: number | null; unit?: string }[]
): string {
  const itemsMap: { [key: string]: { name: string; qty: number | null; unit: string } } = {};

  const addItem = (name: string, qty: number | null = null, unit: string = '') => {
    const cleanName = name.trim();
    if (!cleanName) return;
    const key = cleanName.toLowerCase();

    if (!itemsMap[key]) {
      itemsMap[key] = { name: cleanName, qty, unit: unit.trim() };
    } else {
      if (qty !== null && qty !== undefined) {
        if (itemsMap[key].qty !== null && itemsMap[key].qty !== undefined) {
          itemsMap[key].qty! += qty;
        } else {
          itemsMap[key].qty = qty;
        }
        if (unit && !itemsMap[key].unit) {
          itemsMap[key].unit = unit.trim();
        }
      }
    }
  };

  // 1. Ekstrak senarai bahan yang sudah direkodkan sebelum ini
  if (existingStr) {
    const parts = existingStr.split(',').map((p) => p.trim()).filter(Boolean);
    for (const part of parts) {
      // Padanan untuk format: "NamaBahan (X unit)"
      const match = part.match(/^(.+?)\s*\(([\d.]+)\s*([^)]*)\)$/);
      if (match) {
        const item_name = match[1];
        const item_qty = parseFloat(match[2]);
        const item_unit = match[3] || '';
        addItem(item_name, isNaN(item_qty) ? null : item_qty, item_unit);
      } else {
        addItem(part, null, '');
      }
    }
  }

  // 2. Tambah bahan baharu yang baru di-log oleh pelajar
  for (const item of newItems) {
    addItem(item.name, item.qty, item.unit || '');
  }

  // 3. Bina semula rentetan ayat yang sudah digabungkan secara kemas
  const resultParts: string[] = [];
  for (const key in itemsMap) {
    const item = itemsMap[key];
    if (item.qty !== null && item.qty !== undefined) {
      if (item.unit) {
        resultParts.push(`${item.name} (${item.qty} ${item.unit})`);
      } else {
        resultParts.push(`${item.name} (${item.qty})`);
      }
    } else {
      resultParts.push(item.name);
    }
  }

  return resultParts.join(', ');
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { matrix_number, cancellation_code, used_ingredients, custom_ingredients } = body;

    // 1. Verifikasi rekod tempahan
    const { data: booking, error: bookingErr } = await supabase
      .from('bookings')
      .select('*')
      .eq('matrix_number', matrix_number)
      .eq('cancellation_code', cancellation_code)
      .eq('status', 'confirmed')
      .single();

    if (bookingErr || !booking) {
      return NextResponse.json(
        { error: 'Rekod tempahan tidak dijumpai. Sila semak No. Matrik & Kod Tempahan anda.' },
        { status: 400 }
      );
    }

    const itemsToAdd: { name: string; qty?: number | null; unit?: string }[] = [];

    // 2. Pemprosesan bahan masakan berkuantiti & tolak stok inventori Supabase
    if (used_ingredients && Array.isArray(used_ingredients)) {
      for (const item of used_ingredients) {
        const { id, qty } = item;
        if (!id || !qty || qty <= 0) continue;

        const { data: ing } = await supabase
          .from('ingredients')
          .select('*')
          .eq('id', id)
          .single();

        if (ing) {
          if (ing.is_countable) {
            const currentStock = ing.stock_quantity || 0;
            const newStock = Math.max(0, currentStock - Number(qty));

            await supabase
              .from('ingredients')
              .update({
                stock_quantity: newStock,
                quantity: newStock > 0 ? 'Ada' : 'Tiada',
              })
              .eq('id', id);

            itemsToAdd.push({
              name: ing.item_name,
              qty: Number(qty),
              unit: ing.unit_label || 'unit',
            });
          } else {
            itemsToAdd.push({
              name: ing.item_name,
              qty: null,
              unit: '',
            });
          }
        }
      }
    }

    // 3. Pemprosesan bahan bebas yang ditaip oleh pelajar (custom_ingredients)
    if (custom_ingredients && custom_ingredients.trim()) {
      const parts = custom_ingredients.split(',').map((p: string) => p.trim()).filter(Boolean);
      for (const part of parts) {
        const match = part.match(/^(.+?)\s*\(([\d.]+)\s*([^)]*)\)$/);
        if (match) {
          const item_name = match[1];
          const item_qty = parseFloat(match[2]);
          const item_unit = match[3] || '';
          itemsToAdd.push({
            name: item_name,
            qty: isNaN(item_qty) ? null : item_qty,
            unit: item_unit,
          });
        } else {
          itemsToAdd.push({
            name: part,
            qty: null,
            unit: '',
          });
        }
      }
    }

    // 4. Bersihkan teks "Belum direkodkan" jika wujud
    let existingItemsStr = (booking.items_used || '')
      .replace(/Belum direkodkan,?\s*/gi, '')
      .replace(/Belum direkod,?\s*/gi, '')
      .trim();

    // 5. Gabungkan item secara automatik (cth: Sardin 1 tin + Sardin 1 tin = Sardin 2 tin)
    const updatedItemsStr = parseAndCombineItems(existingItemsStr, itemsToAdd);

    // 6. Kemaskini rekod tempahan di Supabase
    const { error: updateErr } = await supabase
      .from('bookings')
      .update({ items_used: updatedItemsStr || 'Tiada bahan diambil' })
      .eq('id', booking.id);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Bahan masakan berjaya direkodkan dan kuantiti telah digabungkan!',
      items_used: updatedItemsStr,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Ralat server' }, { status: 500 });
  }
}