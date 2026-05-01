const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const dayjs = require('dayjs');

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] 
});

// Boss Data with fixed locations
const bosses = {
    pig1: { name: "Sly Pig", emoji: "🕵️", group: "🌊 ESDELRON LAKE", map: "Esdelron Lake", status: "DEAD", next: null },
    pig2: { name: "Violent Pig", emoji: "😡", group: "🌊 ESDELRON LAKE", map: "Esdelron Lake", status: "DEAD", next: null },
    pig3: { name: "Swift Pig", emoji: "⚡", group: "🌊 ESDELRON LAKE", map: "Esdelron Lake", status: "DEAD", next: null },
    ice_queen: { name: "Ice Queen", emoji: "👸", group: "❄️ ICE CASTLE", map: "Ice Castle F3", status: "DEAD", next: null },
    ice_golem: { name: "Ice Golem", emoji: "🗿", group: "❄️ ICE CASTLE", map: "Ice Castle F3", status: "DEAD", next: null },
    ice_sword: { name: "Iceman (S)", emoji: "⚔️", group: "❄️ ICE CASTLE", map: "Ice Castle F2", status: "DEAD", next: null },
    ice_shield: { name: "Iceman (H)", emoji: "🛡️", group: "❄️ ICE CASTLE", map: "Ice Castle F1", status: "DEAD", next: null },
    pillar: { name: "Guardian", emoji: "🏛️", group: "🌵 POIBUS", map: "Southern Poibus", status: "DEAD", next: null },
    ohm: { name: "Unstable Ohm", emoji: "🌀", group: "🌀 OTHER", map: "Blue Eye", status: "DEAD", next: null }
};

client.on('clientReady', () => {
    console.log(`Radar Online as ${client.user.tag}`);
    updateDashboard(); // Run once on startup
    setInterval(updateDashboard, 60000); // Update every minute
});

async function updateDashboard() {
    try {
        const channel = await client.channels.fetch(process.env.DASHBOARD_ID);
        if (!channel) return;

        const embed = new EmbedBuilder()
            .setTitle("🛰️ SOVEREIGN TACTICAL RADAR")
            .setDescription(`>>> **SYSTEM:** ACTIVE\n**LAST SCAN:** <t:${Math.floor(Date.now() / 1000)}:R>`)
            .setColor("#2b2d31");

        const groups = ["🌊 ESDELRON LAKE", "❄️ ICE CASTLE", "🌵 POIBUS", "🌀 OTHER"];
        
        groups.forEach(groupName => {
            let fieldContent = "";
            for (const id in bosses) {
                const b = bosses[id];
                if (b.group === groupName) {
                    const statusText = b.status === "ALIVE" ? "UP  " : "DOWN";
                    const timeText = b.status === "ALIVE" ? b.spawnTime : (b.next ? b.next.format('HH:mm') : "--:--");
                    fieldContent += `\`${statusText}\` \`${timeText}\` ${b.name}\n`;
                }
            }
            // inline: true creates the box/column effect
            embed.addFields({ name: groupName, value: `\`\`\`ml\n${fieldContent || "Scanning..."}\`\`\``, inline: true });
        });

        const messages = await channel.messages.fetch({ limit: 10 });
        const lastMsg = messages.find(m => m.author.id === client.user.id);

        if (lastMsg) {
            await lastMsg.edit({ embeds: [embed] });
        } else {
            await channel.send({ embeds: [embed] });
        }
    } catch (err) {
        console.error("Dashboard Update Error:", err);
    }
}

client.on('messageCreate', async (message) => {
    if (message.author.bot && message.channel.id !== process.env.DASHBOARD_ID) {
        const content = message.content;
        for (const id in bosses) {
            // Check for the boss name in the log
            if (content.includes(bosses[id].name) || content.includes(id)) {
                if (content.includes("muncul")) {
                    bosses[id].status = "ALIVE";
                    bosses[id].spawnTime = dayjs().format('HH:mm');
                } else if (content.includes("dikalahkan")) {
                    bosses[id].status = "DEAD";
                    bosses[id].next = dayjs().add(12, 'hour');
                }
                updateDashboard();
            }
        }
    }
});

client.login(process.env.BOT_TOKEN);
