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

// DATABASE BOSS (Alias disesuaikan tepat dengan log kamu)
const bosses = {
    pig1: { name: "1st Pig", group: "🐷 Esdelron Lake", icon: "🐷", status: "ALIVE", lastKilled: null, next: null, alias: "[Sly]First Pig" },
    pig2: { name: "2nd Pig", group: "🐷 Esdelron Lake", icon: "🐷", status: "ALIVE", lastKilled: null, next: null, alias: "[Violent]Second Pig" },
    pig3: { name: "3rd Pig", group: "🐷 Esdelron Lake", icon: "🐷", status: "ALIVE", lastKilled: null, next: null, alias: "[Swift]Third Pig" },
    pillar: { name: "Pillar", group: "🗿 Southern Poibus", icon: "🗿", status: "ALIVE", isWindow: true, windowMin: 10, windowMax: 12, alias: "Guardian of Pillar" },
    ice_queen: { name: "Ice Queen", group: "🏰 Ice Castle", icon: "👸", status: "ALIVE", alias: "Ice Queen" },
    ice_golem: { name: "Ice Golem", group: "🏰 Ice Castle", icon: "🧊", status: "ALIVE", alias: "Ice Golem" },
    ice_sword: { name: "Ice Sword", group: "🏰 Ice Castle", icon: "⚔️", status: "ALIVE", alias: "Iceman(Sword)" },
    ice_shield: { name: "Ice Shield", group: "🏰 Ice Castle", icon: "🛡️", status: "ALIVE", alias: "Iceman(Shield)" },
    ohm: { name: "U. Ohm", group: "🧿 Blue Eye", icon: "🧿", status: "ALIVE", alias: "Unstable Ohm" }
};

function findBossKey(text) {
    for (const key in bosses) {
        if (text.includes(bosses[key].alias)) return key;
    }
    return null;
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
                .setColor(zoneName.includes("Ice") ? "#0099ff" : "#2b2d31");

            let descriptionBody = "```ml\n";
            zoneBosses.forEach(b => {
                const now = dayjs().tz("Asia/Jakarta");
                if (b.next && now.isAfter(b.next)) b.status = "ALIVE";

                if (b.isWindow && b.lastKilled) {
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

            if (botMsgArray[i]) await botMsgArray[i].edit({ embeds: [eb] });
            else await channel.send({ embeds: [eb] });
        }
    } catch (err) { console.error(err); }
}

client.on('messageCreate', async (message) => {
    // Pastikan channel ID sesuai dengan variabel LOG_CHANNEL_ID di Railway
    if (message.channel.id !== process.env.LOG_CHANNEL_ID) return;
    if (message.author.bot) return;

    // Regex khusus untuk menangani format: [Monster]::[[Sly]First Pig] dikalahkan ... [timestamp]
    // Pola ini mencari teks di antara [Monster]::[ dan ] terakhir sebelum kata "dikalahkan" atau "muncul"
    const bossPart = message.content.split(']')[1] + ']'; // Menangkap [[Sly]First Pig]
    const isDeath = message.content.includes("dikalahkan");
    
    // Ambil timestamp di bagian paling akhir pesan
    const timeMatch = message.content.match(/\[(\d{2}-\d{2}-\d{4} \d{2}:\d{2}:\d{2})\]$/);

    if (timeMatch) {
        const logTimeStr = timeMatch[1];
        const killTime = dayjs(logTimeStr, "DD-MM-YYYY HH:mm:ss").tz("Asia/Jakarta");

        for (const key in bosses) {
            if (message.content.includes(bosses[key].alias)) {
                if (isDeath) {
                    bosses[key].status = "DEAD";
                    bosses[key].lastKilled = killTime;
                    if (!bosses[key].isWindow) {
                        bosses[key].next = killTime.add(12, 'hour');
                    }
                } else {
                    // Jika log adalah "muncul", set status jadi ALIVE
                    bosses[key].status = "ALIVE";
                    bosses[key].next = null;
                }
                
                console.log(`✅ Update: ${bosses[key].name} (${isDeath ? 'DEAD' : 'ALIVE'})`);
                message.react(isDeath ? '💀' : '✨').catch(() => {});
                updateDashboard();
                break;
            }
        }
    }
});

client.on('ready', () => {
    console.log(`Radar Sovereign Aktif!`);
    updateDashboard();
    setInterval(updateDashboard, 60000);
});

client.login(process.env.BOT_TOKEN);
