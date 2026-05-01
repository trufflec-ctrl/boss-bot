const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');
dayjs.extend(customParseFormat);

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent
    ] 
});

// Boss Data with Aliases and Categories
const bosses = {
    // FIXED BOSSES (Static)
    world_boss: { name: "World Boss", group: "🏰 WORLD BOSS ZONE (ELIM)", isFixed: true, note: "Spawns at Fixed Times" },

    // TRACKED BOSSES
    pig1: { name: "Sly Pig", aliases: ["Sly Pig"], group: "🌊 ESDELRON LAKE", status: "DEAD", next: null, alerted: false },
    pig2: { name: "Violent Pig", aliases: ["Violent Pig"], group: "🌊 ESDELRON LAKE", status: "DEAD", next: null, alerted: false },
    pig3: { name: "Swift Pig", aliases: ["Swift Pig"], group: "🌊 ESDELRON LAKE", status: "DEAD", next: null, alerted: false },
    
    pillar: { name: "Guardian", aliases: ["Guardian of Pillar", "Guardian"], group: "🌵 SOUTHERN POIBUS", status: "DEAD", next: null, alerted: false },

    ice_queen: { name: "Ice Queen", aliases: ["Ice Queen"], group: "❄️ ICE CASTLE", status: "DEAD", next: null, alerted: false },
    ice_golem: { name: "Ice Golem", aliases: ["Ice Golem"], group: "❄️ ICE CASTLE", status: "DEAD", next: null, alerted: false },
    ice_sword: { name: "Iceman (S)", aliases: ["Iceman (Sword)"], group: "❄️ ICE CASTLE", status: "DEAD", next: null, alerted: false },
    ice_shield: { name: "Iceman (H)", aliases: ["Iceman (Heavy Armor)"], group: "❄️ ICE CASTLE", status: "DEAD", next: null, alerted: false },
    
    ohm: { name: "Unstable Ohm", aliases: ["Unstable Ohm", "Ohm"], group: "🌀 BLUE EYE", status: "DEAD", next: null, alerted: false }
};

client.on('ready', () => {
    console.log(`Radar Online as ${client.user.tag}`);
    updateDashboard(); 
    
    setInterval(() => {
        updateDashboard();
        checkAlerts();
    }, 60000); 
});

async function checkAlerts() {
    const alertChannel = await client.channels.fetch(process.env.ALERT_CHANNEL_ID || process.env.DASHBOARD_ID);
    if (!alertChannel) return;

    const now = dayjs();
    for (const id in bosses) {
        const b = bosses[id];
        if (!b.isFixed && b.status === "DEAD" && b.next && !b.alerted) {
            const diffInMinutes = b.next.diff(now, 'minute');
            if (diffInMinutes <= 15 && diffInMinutes > 0) {
                await alertChannel.send(`⚠️ **TACTICAL ALERT:** ${b.name} spawning in ~15 minutes at ${b.group}!`);
                b.alerted = true; 
            }
        }
    }
}

async function updateDashboard() {
    try {
        const channel = await client.channels.fetch(process.env.DASHBOARD_ID);
        if (!channel) return;

        const embed = new EmbedBuilder()
            .setTitle("🛰️ SOVEREIGN TACTICAL RADAR")
            .setDescription(`>>> **SYSTEM:** ACTIVE\n**SCAN TIME:** <t:${Math.floor(Date.now() / 1000)}:R>`)
            .setColor("#2b2d31")
            .setFooter({ text: "Tactical Data Feed v1.2" });

        // Ordered list of locations for row-based appearance
        const orderedGroups = [
            "🏰 WORLD BOSS ZONE (ELIM)",
            "🌊 ESDELRON LAKE",
            "🌵 SOUTHERN POIBUS",
            "❄️ ICE CASTLE",
            "🌀 BLUE EYE"
        ];
        
        orderedGroups.forEach(groupName => {
            let fieldContent = "";
            for (const id in bosses) {
                const b = bosses[id];
                if (b.group === groupName) {
                    if (b.isFixed) {
                        fieldContent += `[INFO] --:-- | ${b.name} (${b.note})\n`;
                    } else {
                        const statusText = b.status === "ALIVE" ? "UP  " : "DOWN";
                        const timeText = b.status === "ALIVE" 
                            ? (b.spawnTime || "--:--") 
                            : (b.next ? b.next.format('HH:mm') : "--:--");
                        
                        fieldContent += `[${statusText}] ${timeText} | ${b.name}\n`;
                    }
                }
            }
            
            // Adding as a non-inline field creates the "Row" look
            embed.addFields({ 
                name: groupName, 
                value: `\`\`\`ml\n${fieldContent || "No data."}\`\`\``, 
                inline: false 
            });
        });

        const messages = await channel.messages.fetch({ limit: 5 });
        const lastMsg = messages.find(m => m.author.id === client.user.id);

        if (lastMsg) {
            await lastMsg.edit({ embeds: [embed] });
        } else {
            await channel.send({ embeds: [embed] });
        }
    } catch (err) {
        console.error("Dashboard Error:", err);
    }
}

client.on('messageCreate', async (message) => {
    if (message.channel.id !== process.env.LOG_SOURCE_ID) return;

    const content = message.content;
    const dateMatch = content.match(/\[(\d{2}-\d{2}-\d{4} \d{2}:\d{2}:\d{2})\]/);
    let baseTime = dayjs();
    if (dateMatch) {
        baseTime = dayjs(dateMatch[1], 'DD-MM-YYYY HH:mm:ss');
    }

    for (const id in bosses) {
        const b = bosses[id];
        if (b.isFixed) continue; // Skip fixed bosses for log parsing

        const isTarget = b.aliases && b.aliases.some(alias => content.toLowerCase().includes(alias.toLowerCase()));
        
        if (isTarget) {
            if (content.includes("muncul")) {
                b.status = "ALIVE";
                b.spawnTime = baseTime.format('HH:mm');
                b.alerted = false;
                updateDashboard();
            } else if (content.includes("dikalahkan")) {
                b.status = "DEAD";
                b.next = baseTime.add(12, 'hour');
                b.alerted = false;
                updateDashboard();
            }
        }
    }
});

client.login(process.env.BOT_TOKEN);
