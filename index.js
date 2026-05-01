const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const dayjs = require('dayjs');

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] 
});

const bosses = {
    pig1: { name: "[[Sly]First Pig]", emoji: "🕵️", group: "🌊 ESDELRON LAKE", map: "Esdelron Lake", status: "DEAD", next: null },
    pig2: { name: "[[Violent]Second Pig]", emoji: "😡", group: "🌊 ESDELRON LAKE", map: "Esdelron Lake", status: "DEAD", next: null },
    pig3: { name: "[[Swift]Third Pig]", emoji: "⚡", group: "🌊 ESDELRON LAKE", map: "Esdelron Lake", status: "DEAD", next: null },
    ice_queen: { name: "[Ice Queen]", emoji: "👸", group: "❄️ ICE CASTLE", map: "Ice Castle F3", status: "DEAD", next: null },
    ice_golem: { name: "[Ice Golem]", emoji: "🗿", group: "❄️ ICE CASTLE", map: "Ice Castle F3", status: "DEAD", next: null },
    ice_sword: { name: "[Iceman(Sword)]", emoji: "⚔️", group: "❄️ ICE CASTLE", map: "Ice Castle F2", status: "DEAD", next: null },
    ice_shield: { name: "[Iceman(Shield)]", emoji: "🛡️", group: "❄️ ICE CASTLE", map: "Ice Castle F1", status: "DEAD", next: null },
    pillar: { name: "[Guardian of Pillar]", emoji: "🏛️", group: "🌵 POIBUS", map: "Southern Poibus", status: "DEAD", next: null },
    ohm: { name: "[Unstable Ohm]", emoji: "🌀", group: "🌀 OTHER MAPS", map: "Blue Eye", status: "DEAD", next: null }
};

client.on('ready', () => {
    console.log(`Radar Online as ${client.user.tag}`);
    // Update the dashboard every 60 seconds
    setInterval(updateDashboard, 60000);
});

async function updateDashboard() {
    const channel = await client.channels.fetch(process.env.DASHBOARD_ID);
    if (!channel) return;

    const embed = new EmbedBuilder()
        .setTitle("🛰️ SOVEREIGN INTEL: BOSS RADAR")
        .setColor("#00AAFF")
        .setTimestamp();

    // Group logic
    const groups = ["🌊 ESDELRON LAKE", "❄️ ICE CASTLE", "🌵 POIBUS", "🌀 OTHER MAPS"];
    
    groups.forEach(groupName => {
        let fieldContent = "";
        for (const id in bosses) {
            const b = bosses[id];
            if (b.group === groupName) {
                const statusStr = b.status === "ALIVE" ? `🟢 **ALIVE** (Spawned ${b.spawnTime})` : `💀 DEAD (Exp: ${b.next ? b.next.format('HH:mm') : '??:??'})`;
                fieldContent += `${b.emoji} **${b.name}**\n└ ${statusStr}\n`;
            }
        }
        embed.addFields({ name: groupName, value: fieldContent || "No data", inline: false });
    });

    const messages = await channel.messages.fetch({ limit: 10 });
    const lastMsg = messages.find(m => m.author.id === client.user.id);

    if (lastMsg) {
        lastMsg.edit({ embeds: [embed] });
    } else {
        channel.send({ embeds: [embed] });
    }
}

client.on('messageCreate', async (message) => {
    const content = message.content;
    for (const id in bosses) {
        if (content.includes(bosses[id].name)) {
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
});

client.login(process.env.BOT_TOKEN);
