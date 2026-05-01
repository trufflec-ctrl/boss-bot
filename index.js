const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const dayjs = require('dayjs');

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent
    ] 
});

// Boss Data with fixed locations for the "Card" layout
const bosses = {
    pig1: { name: "Sly Pig", group: "🌊 ESDELRON LAKE", status: "DEAD", next: null, alerted: false },
    pig2: { name: "Violent Pig", group: "🌊 ESDELRON LAKE", status: "DEAD", next: null, alerted: false },
    pig3: { name: "Swift Pig", group: "🌊 ESDELRON LAKE", status: "DEAD", next: null, alerted: false },
    ice_queen: { name: "Ice Queen", group: "❄️ ICE CASTLE", status: "DEAD", next: null, alerted: false },
    ice_golem: { name: "Ice Golem", group: "❄️ ICE CASTLE", status: "DEAD", next: null, alerted: false },
    ice_sword: { name: "Iceman (S)", group: "❄️ ICE CASTLE", status: "DEAD", next: null, alerted: false },
    ice_shield: { name: "Iceman (H)", group: "❄️ ICE CASTLE", status: "DEAD", next: null, alerted: false },
    pillar: { name: "Guardian", group: "🌵 POIBUS", status: "DEAD", next: null, alerted: false },
    ohm: { name: "Unstable Ohm", group: "🌀 OTHER", status: "DEAD", next: null, alerted: false }
};

client.on('clientReady', () => {
    console.log(`Radar Online as ${client.user.tag}`);
    updateDashboard(); 
    
    // Pulse every 60s for dashboard and alert checks
    setInterval(() => {
        updateDashboard();
        checkAlerts();
    }, 60000); 
});

// New Function: Checks if any boss is spawning in 15 minutes
async function checkAlerts() {
    const alertChannel = await client.channels.fetch(process.env.ALERT_CHANNEL_ID || process.env.DASHBOARD_ID);
    if (!alertChannel) return;

    const now = dayjs();
    
    for (const id in bosses) {
        const b = bosses[id];
        if (b.status === "DEAD" && b.next && !b.alerted) {
            const diffInMinutes = b.next.diff(now, 'minute');
            
            // Alert if spawn is within 15 minutes
            if (diffInMinutes <= 15 && diffInMinutes > 0) {
                await alertChannel.send(`⚠️ **TACTICAL ALERT:** ${b.name} spawning in ~15 minutes at ${b.group}! Prepare for intercept.`);
                b.alerted = true; // Mark alerted so it doesn't spam every minute
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
            .setDescription(`>>> **SYSTEM:** ACTIVE\n**LAST SCAN:** <t:${Math.floor(Date.now() / 1000)}:R>`)
            .setColor("#2b2d31")
            .setFooter({ text: "Tactical Data Feed v1.0" });

        const groups = ["🌊 ESDELRON LAKE", "❄️ ICE CASTLE", "🌵 POIBUS", "🌀 OTHER"];
        
        groups.forEach(groupName => {
            let fieldContent = "";
            for (const id in bosses) {
                const b = bosses[id];
                if (b.group === groupName) {
                    const statusText = b.status === "ALIVE" ? "UP  " : "DOWN";
                    const timeText = b.status === "ALIVE" 
                        ? (b.spawnTime || "--:--") 
                        : (b.next ? b.next.format('HH:mm') : "--:--");
                    
                    fieldContent += `[${statusText}] ${timeText} | ${b.name}\n`;
                }
            }
            
            embed.addFields({ 
                name: groupName, 
                value: `\`\`\`ml\n${fieldContent || "Scanning..."}\`\`\``, 
                inline: true 
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
    // Check if message is from the authorized log channel
    if (message.channel.id !== process.env.LOG_SOURCE_ID) return;

    const content = message.content;
    
    for (const id in bosses) {
        const b = bosses[id];
        if (content.includes(b.name)) {
            if (content.includes("muncul")) {
                b.status = "ALIVE";
                b.spawnTime = dayjs().format('HH:mm');
                b.alerted = false; // Reset alert status for next death cycle
                updateDashboard();
            } else if (content.includes("dikalahkan")) {
                b.status = "DEAD";
                b.next = dayjs().add(12, 'hour');
                b.alerted = false; // Prepare for new spawn alert
                updateDashboard();
            }
        }
    }
});

client.login(process.env.BOT_TOKEN);
