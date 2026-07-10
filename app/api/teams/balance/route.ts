import { NextRequest, NextResponse } from 'next/server'

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
}

interface BalanceRequest {
  players: Player[]
  teamCount?: number
}

export async function POST(request: NextRequest) {
  try {
    const { players, teamCount = 2 }: BalanceRequest = await request.json()

    if (!players || players.length === 0) {
      return NextResponse.json(
        { error: 'No players provided' },
        { status: 400 }
      )
    }

    // Balance teams based on total attribute sum
    const teamsArray = Array.from({ length: teamCount }, () => ({
      members: [] as Player[],
      totalRating: 0,
      avgRating: 0,
    }))

    // Sort players by rating in descending order
    const sortedPlayers = [...players].sort((a, b) => b.rating - a.rating)

    // Distribute players using a snake draft algorithm
    sortedPlayers.forEach((player, index) => {
      const teamIndex = Math.floor(index / teamCount) % teamCount
      const actualIndex = index % teamCount === 0 ? index / teamCount : teamCount - (index % teamCount)
      const team = teamsArray[actualIndex % teamCount]
      
      team.members.push(player)
      team.totalRating += player.rating
    })

    // Calculate averages
    teamsArray.forEach(team => {
      team.avgRating = team.members.length > 0 
        ? Math.round(team.totalRating / team.members.length)
        : 0
    })

    return NextResponse.json({
      teams: teamsArray,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('[app] Team balancing error:', error)
    return NextResponse.json(
      { error: 'Failed to balance teams' },
      { status: 500 }
    )
  }
}
