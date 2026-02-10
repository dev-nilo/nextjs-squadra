import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { playerIds }: { playerIds: string[] } = await request.json()

    if (!playerIds || playerIds.length === 0) {
      return NextResponse.json(
        { error: 'No player IDs provided' },
        { status: 400 }
      )
    }

    // Delete players in batch
    const { error } = await supabase
      .from('players')
      .delete()
      .eq('user_id', user.id)
      .in('id', playerIds)

    if (error) {
      console.error('[v0] Bulk delete error:', error)
      return NextResponse.json(
        { error: 'Failed to delete players' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      deletedCount: playerIds.length,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('[v0] Bulk delete error:', error)
    return NextResponse.json(
      { error: 'Failed to process bulk delete' },
      { status: 500 }
    )
  }
}
