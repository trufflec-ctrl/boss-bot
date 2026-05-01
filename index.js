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

/**
 * DATABASE BOSS
 * Menambahkan zona World Boss agar muncul di Dashboard
 */
const bosses = {
    // WORLD BOSS ZONE
    wb_bale: { name: "Bale", group: "🛡️ World Boss", icon: "👹", status: "ALIVE", lastKilled: null, next: null, alias: "Bale", isStatic: true },
    
    // ESDELRON LAKE
    pig1: { name: "1st Pig", group: "🐷 Esdelron Lake", icon: "🐷", status: "ALIVE", lastKilled: null, next: null, alias: "[Sly]First Pig" },
    pig2: { name: "2nd Pig", group: "🐷 Esdelron Lake", icon: "🐷", status: "ALIVE", lastKilled: null, next: null, alias: "[Violent]Second Pig" },
    pig3: { name: "3rd Pig", group: "🐷 Esdelron Lake", icon: "🐷", status: "ALIVE", lastKilled: null, next: null, alias: "[Swift]Third Pig" },
    
    // SOUTHERN POIBUS
    pillar: { name: "Pillar", group: "🗿 Southern Poibus", icon: "🗿", status: "ALIVE", isWindow: true, windowMin: 10, windowMax: 12, alias: "Guardian of Pillar" },
    
    // ICE CASTLE
    ice_queen: { name: "Ice Queen", group: "🏰 Ice Castle", icon: "👸", status: "ALIVE", alias: "Ice Queen" },
    ice_golem: { name: "Ice Golem", group: "🏰 Ice Castle", icon: "🧊", status: "ALIVE", alias: "Ice Golem" },
    ice_sword: { name: "Ice Sword", group: "🏰 Ice Castle", icon: "⚔️", status: "ALIVE", alias: "Iceman(Sword)" },
    ice_shield: { name: "Ice Shield", group: "🏰 Ice Castle", icon: "🛡️", status: "ALIVE", alias: "Iceman(Shield)" },
    
    // BLUE EYE
    ohm: { name: "U. Ohm", group: "🧿 Blue Eye", icon: "🧿", status: "ALIVE", alias: "Unstable Ohm" }
};

async function updateDashboard() {
    try {
        if (!process.env.DASHBOARD_ID) return;
        const channel = await client.channels.fetch(process.env.DASHBOARD_ID);
        if (!channel) return;

        // Kelompokkan boss berdasarkan grupnya
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
            
            const eb = new EmbedBuilder()
                .setTitle(zoneName)
                .setColor(zoneName.includes("World") ? "#e74c3c" : zoneName.includes("Ice") ? "#3498db" : "#2b2d31")
                .setTimestamp();

            let descriptionBody = "```ml\n";
            zoneBosses.forEach(b => {
                const now = dayjs().tz("Asia/Jakarta");
                
                // Cek auto-respawn
                if (b.next && now.isAfter(b.next)) {
                    b.status = "ALIVE";
                }

                if (b.isStatic) {
                    descriptionBody += `💠 ${b.name.padEnd(12)} | 🕒 SCHEDULED\n`;
                } else if (b.isWindow && b.lastKilled) {
                    const winStart = b.lastKilled.add(b.windowMin, 'hour');
                    const statusEmoji = now.isAfter(winStart) ? "🟡" : "💀";
                    descriptionBody += `${statusEmoji} ${b.name.padEnd(12)} | ⏰ ${winStart.format('HH:mm')}\n`;
                } else {
                    const statusEmoji = b.status === "ALIVE" ? "🟢" : "💀";
                    const nextT = b.next ? b.next.format('HH:mm') : "--:--";
                    descriptionBody += `${statusEmoji} ${b.name.padEnd(12)} | ⏰ ${nextT}\n`;
                }
            });
            descriptionBody += "```";
            eb.setDescription(descriptionBody);

            if (botMsgArray[i]) {
                await botMsgArray[i].edit({ embeds: [eb] });
            } else {
                await channel.send({ embeds: [eb] });
            }
        }
    } catch (err) { 
        console.error("Dashboard Error:", err); 
    }
}

client.on('messageCreate', async (message) => {
    if (message.channel.id !== process.env.LOG_CHANNEL_ID) return;
    if (message.author.bot) return;

    const isDeath = message.content.includes("dikalahkan");
    const isSpawn = message.content.includes("muncul");
    const timeMatch = message.content.match(/\[(\d{2}-\d{2}-\d{4} \d{2}:\d{2}:\d{2})\]$/);

    if (timeMatch && (isDeath || isSpawn)) {
        const logTimeStr = timeMatch[1];
        const eventTime = dayjs(logTimeStr, "DD-MM-YYYY HH:mm:ss").tz("Asia/Jakarta");

        for (const key in bosses) {
            if (message.content.includes(bosses[key].alias)) {
                if (isDeath) {
                    bosses[key].status = "DEAD";
                    bosses[key].lastKilled = eventTime;
                    if (!bosses[key].isWindow && !bosses[key].isStatic) {
                        bosses[key].next = eventTime.add(12, 'hour');
                    }
                } else if (isSpawn) {
                    bosses[key].status = "ALIVE";
                    bosses[key].next = null;
                }
                
                console.log(`✅ Log Logged: ${bosses[key].name} is now ${bosses[key].status}`);
                message.react(isDeath ? '💀' : '🟢').catch(() => {});
                updateDashboard();
                break;
            }
        }
    }
});

client.on('ready', () => {
    console.log(`Sovereign Radar Online! Monitoring WB & Maps.`);
    updateDashboard();
    setInterval(updateDashboard, 60000);
});

client.login(process.env.BOT_TOKEN);
