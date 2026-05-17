import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// 서비스 롤 키로 RLS 우회
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { action, phone, name, check_date, check_in_time, check_out_time } = body

  const supabase = getAdminClient()
  const today = check_date ?? new Date().toISOString().split('T')[0]
  const now = new Date().toISOString()

  if (action === 'checkin') {
    const { data: existing } = await supabase
      .from('attendance')
      .select('*')
      .eq('phone', phone)
      .eq('check_date', today)
      .single()

    if (existing?.check_in_time) {
      return NextResponse.json({ error: '이미 출근 기록이 있습니다.' }, { status: 400 })
    }

    if (existing) {
      const { error } = await supabase
        .from('attendance')
        .update({ check_in_time: check_in_time ?? now })
        .eq('id', existing.id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    } else {
      const { error } = await supabase.from('attendance').insert({
        phone,
        name,
        check_date: today,
        check_in_time: check_in_time ?? now,
      })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, time: check_in_time ?? now })
  }

  if (action === 'checkout') {
    const { data: existing } = await supabase
      .from('attendance')
      .select('*')
      .eq('phone', phone)
      .eq('check_date', today)
      .single()

    if (!existing?.check_in_time) {
      return NextResponse.json({ error: '출근 기록이 없습니다.' }, { status: 400 })
    }
    if (existing.check_out_time) {
      return NextResponse.json({ error: '이미 퇴근 기록이 있습니다.' }, { status: 400 })
    }

    const { error } = await supabase
      .from('attendance')
      .update({ check_out_time: check_out_time ?? now })
      .eq('id', existing.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true, time: check_out_time ?? now, check_in_time: existing.check_in_time })
  }

  return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })
}
