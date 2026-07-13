import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface Attributes {
  velocidade: number
  resistencia: number
  chute: number
  posicionamento: number
  defesa: number
  drible: number
  passe: number
  fisico: number
}

interface Player {
  id: string
  name: string
  position: string
  image: string | null
  attributes: Attributes
  rating: number
  user_id?: string
}

interface BalanceRequest {
  players: Player[]
  teamCount?: number
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { players, teamCount = 2 }: BalanceRequest = await request.json()

    if (!players || players.length === 0) {
      return NextResponse.json(
        { error: 'No players provided' },
        { status: 400 }
      )
    }

    // Reject payloads that claim ownership of another tenant's players
    const foreign = players.find((p) => p.user_id && p.user_id !== user.id)
    if (foreign) {
      return NextResponse.json(
        { error: 'Forbidden: players from another user' },
        { status: 403 }
      )
    }

    const teamsArray = Array.from({ length: teamCount }, () => ({
      members: [] as Player[],
      totalRating: 0,
      avgRating: 0,
    }))

    const sortedPlayers = [...players].sort((a, b) => b.rating - a.rating)

    sortedPlayers.forEach((player, index) => {
      const actualIndex =
        Math.floor(index / teamCount) % 2 === 0
          ? index % teamCount
          : teamCount - 1 - (index % teamCount)
      const team = teamsArray[actualIndex % teamCount]

      team.members.push(player)
      team.totalRating += player.rating
    })

    teamsArray.forEach((team) => {
      team.avgRating =
        team.members.length > 0
          ? Math.round(team.totalRating / team.members.length)
          : 0
    })

    return NextResponse.json({
      teams: teamsArray,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[app] Team balancing error:', error)
    return NextResponse.json(
      { error: 'Failed to balance teams' },
      { status: 500 }
    )
  }
}
