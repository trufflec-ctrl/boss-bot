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
    pig1: { name: "Sly Pig", group: "🌊 ESDELRON LAKE", status: "DEAD", next: null },
    pig2: { name: "Violent Pig", group: "🌊 ESDELRON LAKE", status: "DEAD", next: null },
    pig3: { name: "Swift Pig", group: "🌊 ESDELRON LAKE", status: "DEAD", next: null },
    ice_queen: { name: "Ice Queen", group: "❄️ ICE CASTLE", status: "DEAD", next: null },
    ice_golem: { name: "Ice Golem", group: "❄️ ICE CASTLE", status: "DEAD", next: null },
    ice_sword: { name: "Iceman (S)", group: "❄️ ICE CASTLE", status: "DEAD", next: null },
    ice_shield: { name: "Iceman (H)", group: "❄️ ICE CASTLE", status: "DEAD", next: null },
    pillar: { name: "Guardian", group: "🌵 POIBUS", status: "DEAD", next: null },
    ohm: { name: "Unstable Ohm", group: "🌀 OTHER", status: "DEAD", next: null }
};

client.on('clientReady', () => {
    console.log(`Radar Online as ${client.user.tag}`);
    updateDashboard(); 
    setInterval(updateDashboard, 60000); // Pulse every 60s
});

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
                    
                    // The core of the "Boxy" look:
                    fieldContent += `[${statusText}] ${timeText} | ${b.name}\n`;
                }
            }
            
            // inline: true + code block = Card/Box appearance
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
    // Only listen to the source channel (or wherever the logs appear)
    const content = message.content;
    
    for (const id in bosses) {
        const b = bosses[id];
        if (content.includes(b.name) || content.toLowerCase().includes(id)) {
            if (content.includes("muncul")) {
                b.status = "ALIVE";
                b.spawnTime = dayjs().format('HH:mm');
                updateDashboard();
            } else if (content.includes("dikalahkan")) {
                b.status = "DEAD";
                b.next = dayjs().add(12, 'hour');
                updateDashboard();
            }
        }
    }
});

client.login(process.env.BOT_TOKEN);
