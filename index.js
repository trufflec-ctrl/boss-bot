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

/**
 * BOSS DATABASE
 * Updated with your specific Map URLs.
 */
const bosses = {
    world_boss: { 
        name: "World Boss", 
        group: "🛰️ GLOBAL OPERATIONS", 
        banner: "https://cdn.moogold.com/2024/10/Seal-M.jpg", 
        icon: "🛡️",
        isFixed: true 
    },
    pig1: { name: "Sly Pig", aliases: ["Sly Pig"], group: "ESDELRON LAKE", banner: "https://static.wikia.nocookie.net/sealonline/images/f/f3/Three_Piglets_Raid.jpg", icon: "🐷", status: "DEAD", lastKilled: null, next: null, alerted: false },
    pig2: { name: "Violent Pig", aliases: ["Violent Pig"], group: "ESDELRON LAKE", icon: "🐷", status: "DEAD", lastKilled: null, next: null, alerted: false },
    pig3: { name: "Swift Pig", aliases: ["Swift Pig"], group: "ESDELRON LAKE", icon: "🐷", status: "DEAD", lastKilled: null, next: null, alerted: false },
    pillar: { name: "Pillar", aliases: ["Pillar"], group: "SOUTHERN POIBUS", banner: "https://i.imgur.com/VVap6tO.jpg", icon: "🗿", status: "DEAD", lastKilled: null, next: null, alerted: false },
    ice_queen: { name: "Ice Queen", aliases: ["Ice Queen"], group: "ICE CASTLE", banner: "https://static.wikia.nocookie.net/sealonline/images/b/b3/Ice_Castle.png", icon: "👸", status: "DEAD", lastKilled: null, next: null, alerted: false },
    ice_golem: { name: "Ice Golem", aliases: ["Ice Golem"], group: "ICE CASTLE", icon: "🧊", status: "DEAD", lastKilled: null, next: null, alerted: false },
    ice_sword: { name: "Iceman (S)", aliases: ["Iceman (Sword)"], group: "ICE CASTLE", icon: "⚔️", status: "DEAD", lastKilled: null, next: null, alerted: false },
    ice_shield: { name: "Iceman (Shield)", aliases: ["Iceman Shield"], group: "ICE CASTLE", icon: "🛡️", status: "DEAD", lastKilled: null, next: null, alerted: false },
    ohm: { name: "Unstable Ohm", aliases: ["Unstable Ohm"], group: "BLUE EYE", banner: "https://i.ytimg.com/vi/ViT66zjeN9I/maxresdefault.jpg", icon: "🧿", status: "DEAD", lastKilled: null, next: null, alerted: false }
};

client.on('ready', () => {
    console.log(`Tactical Radar Online: ${client.user.tag}`);
    updateDashboard(); 
    setInterval(() => {
        updateDashboard();
        checkAlerts();
    }, 60000); 
});

async function checkAlerts() {
    const alertChannelId = process.env.ALERT_CHANNEL_ID || process.env.DASHBOARD_ID;
    try {
        const alertChannel = await client.channels.fetch(alertChannelId);
        if (!alertChannel) return;
        const now = dayjs();
        for (const id in bosses) {
            const b = bosses[id];
            if (!b.isFixed && b.status === "DEAD" && b.next && !b.alerted) {
                const diffInMinutes = b.next.diff(now, 'minute');
                if (diffInMinutes <= 15 && diffInMinutes > 0) {
                    await alertChannel.send(`⚠️ **PREPARING SPAWN:** ${b.icon} **${b.name}** in ~15 mins!`);
                    b.alerted = true; 
                }
            }
        }
    } catch (e) { console.error("Alert logic error:", e); }
}

async function updateDashboard() {
    try {
        const channel = await client.channels.fetch(process.env.DASHBOARD_ID);
        if (!channel) return;

        const groups = {};
        for (const id in bosses) {
            const b = bosses[id];
            if (!groups[b.group]) groups[b.group] = [];
            groups[b.group].push(b);
        }

        const messages = await channel.messages.fetch({ limit: 15 });
        const botMsgArray = Array.from(messages.filter(m => m.author.id === client.user.id).values()).reverse();
        const groupNames = Object.keys(groups);
        
        for (let i = 0; i < groupNames.length; i++) {
            const zoneName = groupNames[i];
            const zoneBosses = groups[zoneName];
            
            const embeds = zoneBosses.map((b, index) => {
                let statusText = "";
                if (b.isFixed) {
                    statusText = `\`[STATIC] | SCHEDULED\``;
                } else {
                    const statusLabel = b.status === "ALIVE" ? "🟢 ALIVE" : "💀 DEAD ";
                    const last = b.lastKilled ? b.lastKilled.format('HH:mm') : "--:--";
                    const expected = b.status === "ALIVE" ? " --:-- " : (b.next ? b.next.format('HH:mm') : "--:--");
                    let countdown = "";
                    
                    if (b.status === "DEAD" && b.next) {
                        const diffH = b.next.diff(dayjs(), 'hour');
                        const diffM = b.next.diff(dayjs(), 'minute') % 60;
                        countdown = (diffH >= 0) ? `\n*(Spawn in ${diffH}h ${diffM}m)*` : `\n*(Overdue!)*`;
                    }
                    statusText = `**Status:** ${statusLabel}\n**Last:** \`${last}\` | **Next:** \`${expected}\` ${countdown}`;
                }

                const eb = new EmbedBuilder()
                    .setColor(b.status === "ALIVE" ? "#2ecc71" : "#2b2d31")
                    .setTitle(`${b.icon} ${b.name}`)
                    .setDescription(statusText);
                
                // If this is the first boss in the group, set the Zone Banner
                if (b.banner) {
                    eb.setImage(b.banner);
                    eb.setAuthor({ name: `📍 ${zoneName}` });
                }
                
                return eb;
            });

            if (botMsgArray[i]) {
                await botMsgArray[i].edit({ embeds });
            } else {
                await channel.send({ embeds });
            }
        }
    } catch (err) {
        console.error("Dashboard update failed:", err);
    }
}

client.on('messageCreate', async (message) => {
    if (message.channel.id !== process.env.LOG_SOURCE_ID) return;
    const content = message.content;
    const dateMatch = content.match(/\[(\d{2}-\d{2}-\d{4} \d{2}:\d{2}:\d{2})\]/);
    let baseTime = dayjs();
    if (dateMatch) baseTime = dayjs(dateMatch[1], 'DD-MM-YYYY HH:mm:ss');

    for (const id in bosses) {
        const b = bosses[id];
        if (b.isFixed) continue; 
        const matchesAlias = b.aliases && b.aliases.some(a => content.toLowerCase().includes(a.toLowerCase()));
        if (matchesAlias) {
            if (content.includes("muncul")) {
                b.status = "ALIVE";
                b.lastKilled = null;
                b.alerted = false;
                updateDashboard();
            } else if (content.includes("dikalahkan")) {
                b.status = "DEAD";
                b.lastKilled = baseTime;
                b.next = baseTime.add(12, 'hour');
                b.alerted = false;
                updateDashboard();
            }
        }
    }
});

client.login(process.env.BOT_TOKEN);
