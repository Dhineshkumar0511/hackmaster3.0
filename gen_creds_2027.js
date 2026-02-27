import fs from 'fs';

const teamNames = [
    "Shadow Strikers", "Quantum Falcons", "Iron Titans", "Neon Ninjas", "Thunder Wolves",
    "Crimson Raiders", "Pixel Predators", "Velocity Vipers", "Storm Breakers", "Silent Assassins",
    "Mystic Mavericks", "Turbo Tornadoes", "Cyber Spartans", "Rogue Warriors", "Alpha Avengers",
    "Frost Giants", "Blaze Brigade", "Phantom Forces", "Inferno Squad", "Titan Legends",
    "Rapid Raptors", "Omega Knights", "The Code Crushers", "Gravity Gladiators", "Skyline Sharks",
    "Dragon Dynasty", "Silver Sabers", "Voltage Vikings", "Ironclad Crew", "Zenith Zephyrs",
    "Atomic Arrows", "Nova Navigators", "Chaos Commanders", "Stealth Storm", "Firestorm Falcons",
    "Echo Enforcers", "Night Howlers", "The Brainstormers", "Hyper Hawks", "Titan Tribe",
    "Obsidian Order", "Radiant Rebels", "Apex Predators", "Turbo Trailblazers", "Cosmic Crushers",
    "Lunar Pathfinders"
];

let csv = "Team Number,Team Name,Username,Password,Batch\n";

teamNames.forEach((name, i) => {
    const teamNum = i + 1;
    const username = `t27-${String(teamNum).padStart(3, '0')}`;
    const password = `team27@${String(teamNum).padStart(3, '0')}`;
    csv += `${teamNum},"${name}",${username},${password},2027\n`;
});

fs.writeFileSync('batch_2027_creds.csv', csv);
console.log('CSV mapping created!');
