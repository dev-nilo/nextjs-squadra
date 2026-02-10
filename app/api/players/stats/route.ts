import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
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

    // Fetch players from Supabase
    const { data: players, error } = await supabase
      .from('players')
      .select('*')
      .eq('user_id', user.id)

    if (error) {
      console.error('[v0] Error fetching players:', error)
      return NextResponse.json(
        { error: 'Failed to fetch players' },
        { status: 500 }
      )
    }

    // Calculate statistics
    const stats = {
      totalPlayers: players?.length || 0,
      avgRating: players && players.length > 0
        ? Math.round(
            players.reduce((sum, p) => sum + (p.rating || 0), 0) /
            players.length
          )
        : 0,
      positions: players?.reduce(
        (acc, p) => {
          acc[p.position] = (acc[p.position] || 0) + 1
          return acc
        },
        {} as Record<string, number>
      ) || {},
    }

    return NextResponse.json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('[v0] Stats calculation error:', error)
    return NextResponse.json(
      { error: 'Failed to calculate stats' },
      { status: 500 }
    )
  }
}
