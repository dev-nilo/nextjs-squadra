import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { normalizePlayer } from '@/lib/player-utils'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
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

    // Fetch players from Supabase
    const { data: players, error } = await supabase
      .from('players')
      .select('*')
      .eq('user_id', user.id)

    if (error) {
      console.error('[app] Error fetching players:', error)
      return NextResponse.json(
        { error: 'Failed to fetch players' },
        { status: 500 }
      )
    }

    const normalized = (players ?? []).map((p: any) => normalizePlayer(p))

    // Calculate statistics
    const stats = {
      totalPlayers: normalized.length,
      avgRating:
        normalized.length > 0
          ? Math.round(
              normalized.reduce((sum, p) => sum + p.rating, 0) /
                normalized.length,
            )
          : 0,
      positions: normalized.reduce(
        (acc: Record<string, number>, p: any) => {
          acc[p.position] = (acc[p.position] || 0) + 1
          return acc
        },
        {} as Record<string, number>,
      ),
    }

    return NextResponse.json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('[app] Stats calculation error:', error)
    return NextResponse.json(
      { error: 'Failed to calculate stats' },
      { status: 500 }
    )
  }
}
