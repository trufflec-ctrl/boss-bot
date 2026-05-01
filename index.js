require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const dayjs = require('dayjs');
const duration = require('dayjs/plugin/duration');
const customParseFormat = require('dayjs/plugin/customParseFormat');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(customParseFormat);
dayjs.extend(duration);
dayjs.extend(utc);
dayjs.extend(timezone);

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent 
    ] 
});

const mapImages = {
    "🐷 Esdelron Lake": "https://i.imgur.com/8QO6p2R.png",
    "🗿 Southern Poibus": "https://i.imgur.com/vH6vA0n.png",
    "🏰 Ice Castle": "https://i.imgur.com/GzB9Z8x.png",
    "🧿 Blue Eye": "https://i.imgur.com/LhB2uYJ.png"
};

const bosses = {
    // WORLD BOSS - FIXED 10 AM DAILY
    wb: { name: "Bracelet", group: "🛡️ World Boss", icon: "👹", status: "ALIVE", isFixed: true, fixTime: "10:00", alias: "Bracelet" },
    
    // ESDELRON LAKE
    pig1: { name: "1st Pig", group: "🐷 Esdelron Lake", icon: "🐷", status: "ALIVE", alias: "First Pig" },
    pig2: { name: "2nd Pig", group: "🐷 Esdelron Lake", icon: "🐷", status: "ALIVE", alias: "Second Pig" },
    pig3: { name: "3rd Pig", group: "🐷 Esdelron Lake", icon: "🐷", status: "ALIVE", alias: "Third Pig" },
    
    // SOUTHERN POIBUS
    pillar: { name: "Pillar", group: "🗿 Southern Poibus", icon: "🗿", status: "ALIVE", isWindow: true, windowMin: 10, alias: "Guardian of Pillar" },
    
    // ICE CASTLE
    ice_queen: { name: "Ice Queen", group: "🏰 Ice Castle", icon: "👸", status: "ALIVE", alias: "Ice Queen" },
    ice_golem: { name: "Ice Golem", group: "🏰 Ice Castle", icon: "🧊", status: "ALIVE", alias: "Ice Golem" },
    ice_sword: { name: "Iceman (S)", group: "🏰 Ice Castle", icon: "⚔️", status: "ALIVE", alias: "Iceman(Sword)" },
    ice_shield: { name: "Iceman (H)", group: "🏰 Ice Castle", icon: "🛡️", status: "ALIVE", alias: "Iceman(Shield)" },
    
    // BLUE EYE
    ohm: { name: "U. Ohm", group: "🧿 Blue Eye", icon: "🧿", status: "ALIVE", alias: "Unstable Ohm" }
};

function getCountdown(targetTime) {
    if (!targetTime) return "";
    const now = dayjs().tz("Asia/Jakarta");
    const diff = targetTime.diff(now);
    if (diff <= 0) return "SPAWNING...";
    const hrs = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `[${hrs}h ${mins}m]`;
}

async function updateDashboard() {
    try {
        if (!process.env.DASHBOARD_ID) return;
        const channel = await client.channels.fetch(process.env.DASHBOARD_ID);
        if (!channel) return;

        const groups = {};
        for (const id in bosses) {
            const b = bosses[id];
            if (!groups[b.group]) groups[b.group] = [];
            groups[b.group].push(b);
        }

        const messages = await channel.messages.fetch({ limit: 10 });
        const botMsgArray = Array.from(messages.filter(m => m.author.id === client.user.id).values()).reverse();
        const groupNames = Object.keys(groups);
        
        for (let i = 0; i < groupNames.length; i++) {
            const zoneName = groupNames[i];
            const zoneBosses = groups[zoneName];
            const eb = new EmbedBuilder()
                .setTitle(zoneName)
                .setColor(zoneName.includes("World") ? "#e74c3c" : "#2b2d31")
                .setTimestamp();

            if (mapImages[zoneName]) eb.setImage(mapImages[zoneName]);

            let desc = "```ml\n";
            zoneBosses.forEach(b => {
                const now = dayjs().tz("Asia/Jakarta");
                
                // Update Logic for FIXED WB
                if (b.isFixed) {
                    const todayFix = dayjs().tz("Asia/Jakarta").format("YYYY-MM-DD") + " " + b.fixTime;
                    let target = dayjs.tz(todayFix, "YYYY-MM-DD HH:mm", "Asia/Jakarta");
                    if (now.isAfter(target)) target = target.add(1, 'day');
                    
                    const timeTo = getCountdown(target);
                    desc += `💠 ${b.name.padEnd(10)} | ⏰ ${b.fixTime} ${timeTo}\n`;
                } 
                // Update Logic for normal bosses
                else {
                    if (b.next && now.isAfter(b.next)) {
                        b.status = "ALIVE";
                        b.next = null;
                    }
                    const statusEmoji = b.status === "ALIVE" ? "🟢" : "💀";
                    const timeStr = b.next ? b.next.format('HH:mm') : "--:--";
                    const cd = b.status === "DEAD" ? getCountdown(b.next) : "";
                    desc += `${statusEmoji} ${b.name.padEnd(10)} | ⏰ ${timeStr.padEnd(5)} ${cd}\n`;
                }
            });
            desc += "```";
            eb.setDescription(desc);

            if (botMsgArray[i]) {
                await botMsgArray[i].edit({ embeds: [eb] });
            } else {
                await channel.send({ embeds: [eb] });
            }
        }
    } catch (err) { console.error("Update Error:", err); }
}

client.on('messageCreate', async (message) => {
    if (message.channel.id !== process.env.LOG_CHANNEL_ID || message.author.bot) return;

    const content = message.content;
    const isDeath = content.includes("dikalahkan") || content.includes("defeated");
    const timeMatch = content.match(/\[(\d{2}-\d{2}-\d{4} \d{2}:\d{2}:\d{2})\]/);

    if (timeMatch && isDeath) {
        const eventTime = dayjs(timeMatch[1], "DD-MM-YYYY HH:mm:ss").tz("Asia/Jakarta");
        for (const key in bosses) {
            const b = bosses[key];
            if (content.toLowerCase().includes(b.alias.toLowerCase())) {
                b.status = "DEAD";
                b.lastKilled = eventTime;
                b.next = eventTime.add(12, 'hour');
                message.react('💀').catch(() => {});
                updateDashboard();
                return;
            }
        }
    }
});

client.on('ready', () => {
    console.log("Tactical Radar Online.");
    updateDashboard();
    setInterval(updateDashboard, 30000);
});

client.login(process.env.BOT_TOKEN);
