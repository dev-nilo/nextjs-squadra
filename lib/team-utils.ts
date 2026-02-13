import { Player, TeamData } from "@/types";
import { TEAM_COLORS } from "./constants";

export const generateTeams = (
    selectedPlayers: Player[],
    numTeams: number
): TeamData[] => {
    // Fisher-Yates shuffle for true randomization
    const shuffleArray = <T>(array: T[]): T[] => {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    };

    // Shuffle players first for randomization, then sort by rating within tiers
    const shuffledPlayers = shuffleArray(selectedPlayers);

    // Group players by rating tiers (90+, 80-89, 70-79, etc.) and shuffle within tiers
    const ratingTiers: Player[][] = [[], [], [], [], []];
    shuffledPlayers.forEach((player) => {
        if (player.rating >= 90) ratingTiers[0].push(player);
        else if (player.rating >= 80) ratingTiers[1].push(player);
        else if (player.rating >= 70) ratingTiers[2].push(player);
        else if (player.rating >= 60) ratingTiers[3].push(player);
        else ratingTiers[4].push(player);
    });

    // Flatten tiers (already shuffled within each tier)
    const sortedPlayers = ratingTiers.flat();

    // Initialize teams array with configurable number of teams
    const teams: Player[][] = Array.from({ length: numTeams }, () => []);

    // Initialize attribute sums for each team
    const emptyAttributes = {
        velocidade: 0,
        resistencia: 0,
        chute: 0,
        posicionamento: 0,
        defesa: 0,
        drible: 0,
        passe: 0,
        fisico: 0,
    };
    const teamAttributeSums = Array.from({ length: numTeams }, () => ({
        ...emptyAttributes,
    }));

    // Distribute players based on total attribute sum balance with randomization for ties
    sortedPlayers.forEach((player) => {
        // Calculate total attribute sum for each team
        const teamTotals = teamAttributeSums.map((sums) =>
            Object.values(sums).reduce((a, b) => a + b, 0)
        );

        // Find all teams with the lowest total (for random tie-breaking)
        const minTotal = Math.min(...teamTotals);
        const teamsWithMinTotal = teamTotals
            .map((total, idx) => ({ total, idx }))
            .filter((t) => t.total === minTotal);

        // Randomly select among tied teams
        const minIndex =
            teamsWithMinTotal[Math.floor(Math.random() * teamsWithMinTotal.length)]
                .idx;

        // Add player to the selected team
        teams[minIndex].push(player);

        // Update attribute sums for the chosen team
        teamAttributeSums[minIndex].velocidade += player.attributes.velocidade;
        teamAttributeSums[minIndex].resistencia += player.attributes.resistencia;
        teamAttributeSums[minIndex].chute += player.attributes.chute;
        teamAttributeSums[minIndex].posicionamento +=
            player.attributes.posicionamento;
        teamAttributeSums[minIndex].defesa += player.attributes.defesa;
        teamAttributeSums[minIndex].drible += player.attributes.drible;
        teamAttributeSums[minIndex].passe += player.attributes.passe;
        teamAttributeSums[minIndex].fisico += player.attributes.fisico;
    });

    // Calculate average overall rating for each team
    const resultTeams: TeamData[] = teams.map((teamMembers, idx) => {
        const colorIdx = idx % TEAM_COLORS.length;
        return {
            name: `TIME ${String.fromCharCode(65 + idx)}`,
            members: teamMembers,
            avg: teamMembers.length
                ? Math.round(
                    teamMembers.reduce((sum, p) => sum + p.rating, 0) /
                    teamMembers.length
                )
                : 0,
            color: TEAM_COLORS[colorIdx].color,
            borderColor: TEAM_COLORS[colorIdx].borderColor,
            headerColor: TEAM_COLORS[colorIdx].headerColor,
        };
    });

    return resultTeams;
};
