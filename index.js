const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const express = require('express');
const bodyParser = require('body-parser');
const dayjs = require('dayjs');
const duration = require('dayjs/plugin/duration');
const customParseFormat = require('dayjs/plugin/customParseFormat');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

// Initialize DayJS Plugins
dayjs.extend(customParseFormat);
dayjs.extend(duration);
dayjs.extend(utc);
dayjs.extend(timezone);

// Initialize Express for the Webhook
const app = express();
app.use(bodyParser.json());

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent
    ] 
});

/**
 * BOSS DATABASE
 * These IDs (keys) are used by the scraper webhook to identify which boss died.
 */
const bosses = {
    world_boss: { 
        name: "Bracelet", 
        group: "💫 WB Zone (Elim)", 
        thumbnail: "https://static.wikia.nocookie.net/sealonline/images/6/66/NobleMadam2.jpg/revision/latest?cb=20140828055744", 
        icon: "💎",
        isFixed: true,
        fixedTime: "10:00" 
    },
    pig1: { name: "1st Pig", group: "🐷 Esdelron Lake", icon: "🐷", status: "ALIVE", lastKilled: null, next: null },
    pig2: { name: "2nd Pig", group: "🐷 Esdelron Lake", icon: "🐷", status: "ALIVE", lastKilled: null, next: null },
    pig3: { name: "3rd Pig", group: "🐷 Esdelron Lake", icon: "🐷", status: "ALIVE", lastKilled: null, next: null },
    pillar: { 
        name: "Pillar", 
        group: "🗿 Southern Poibus", 
        thumbnail: "https://i.imgur.com/VVap6tO.jpg", 
        icon: "🗿", 
        status: "ALIVE", 
        lastKilled: null, 
        isWindow: true, 
        windowMin: 10,  
        windowMax: 12   
    },
    ice_queen: { name: "Ice Queen", group: "🏰 Ice Castle", thumbnail: "https://static.wikia.nocookie.net/sealonline/images/8/89/Ice_Castle.png", icon: "👸", status: "ALIVE", lastKilled: null, next: null },
    ice_golem: { name: "Ice Golem", group: "🏰 Ice Castle", icon: "🧊", status: "ALIVE", lastKilled: null, next: null },
    ice_sword: { name: "Ice Sword", group: "🏰 Ice Castle", icon: "⚔️", status: "ALIVE", lastKilled: null, next: null },
    ice_shield: { name: "Ice Shield", group: "🏰 Ice Castle", icon: "🛡️", status: "ALIVE", lastKilled: null, next: null },
    ohm: { name: "U. Ohm", group: "🧿 Blue Eye", thumbnail: "https://i.ytimg.com/vi/ViT66zjeN9I/maxresdefault.jpg", icon: "🧿", status: "ALIVE", lastKilled: null, next: null }
};

// HELPER: Re-render the visual dashboard in Discord
async function updateDashboard() {
    try {
        const channel = await client.channels.fetch(process.env.DASHBOARD_ID);
        if (!channel) return;

        // Group bosses by their 'group' property for separate embeds
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
            const zoneImage = zoneBosses.find(b => b.thumbnail)?.thumbnail || "https://i.imgur.com/8Qz5QnB.png";
            
            const eb = new EmbedBuilder()
                .setTitle(zoneName)
                .setThumbnail(zoneImage)
                .setColor(zoneName.includes("Ice") ? "#0099ff" : "#2b2d31");

            let descriptionBody = "```ml\n";

            zoneBosses.forEach(b => {
                const now = dayjs().tz("Asia/Jakarta");

                // Check if boss should be ALIVE based on time
                if (b.next && now.isAfter(b.next)) {
                    b.status = "ALIVE";
                }

                if (b.isFixed) {
                    let target = dayjs().tz("Asia/Jakarta").hour(10).minute(0).second(0);
                    if (now.isAfter(target)) target = target.add(1, 'day');
                    const dur = dayjs.duration(target.diff(now));
                    descriptionBody += `${b.icon} ${b.name.padEnd(10)} | ⏰ ${b.fixedTime} (in ${Math.floor(dur.asHours())}h ${dur.minutes()}m)\n`;
                } 
                else if (b.isWindow && b.lastKilled) {
                    const winStart = b.lastKilled.add(b.windowMin, 'hour');
                    const winEnd = b.lastKilled.add(b.windowMax, 'hour');
                    
                    let statusEmoji = "💀";
                    let countdown = "";

                    if (now.isBefore(winStart)) {
                        const dur = dayjs.duration(winStart.diff(now));
                        countdown = ` (in ${Math.floor(dur.asHours())}h ${dur.minutes()}m)`;
                    } else if (now.isBefore(winEnd)) {
                        statusEmoji = "🟡";
                        countdown = ` (WINDOW)`;
                    } else {
                        statusEmoji = "🟢";
                        countdown = ` (READY)`;
                    }

                    const timeRange = `${winStart.format('HH:mm')}-${winEnd.format('HH:mm')}`;
                    descriptionBody += `${statusEmoji} ${b.name.padEnd(10)} | ⏰ ${timeRange}${countdown}\n`;
                }
                else {
                    const statusEmoji = b.status === "ALIVE" ? "🟢" : "💀";
                    const nextT = b.next ? b.next.format('HH:mm') : "--:--";
                    let timeInfo = `⏰ ${nextT}`;
                    
                    if (b.status === "DEAD" && b.next) {
                        const diff = b.next.diff(now);
                        if (diff > 0) {
                            const dur = dayjs.duration(diff);
                            timeInfo += ` (in ${Math.floor(dur.asHours())}h ${dur.minutes()}m)`;
                        } else {
                            timeInfo += ` (READY)`;
                        }
                    }
                    descriptionBody += `${statusEmoji} ${b.name.padEnd(10)} | ${timeInfo}\n`;
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
        console.error("Dashboard update failed:", err);
    }
}

// WEBHOOK: Listens for signals from the scraper script
app.post('/webhook', (req, res) => {
    const { bossId, timestamp } = req.body;
    console.log(`[WEBHOOK] Received kill for ${bossId} at ${timestamp}`);

    if (bosses[bossId]) {
        const killTime = dayjs(timestamp).tz("Asia/Jakarta");
        
        bosses[bossId].status = "DEAD";
        bosses[bossId].lastKilled = killTime;
        
        // Standard respawn is 12 hours unless it's a fixed or window boss
        if (!bosses[bossId].isFixed && !bosses[bossId].isWindow) {
            bosses[bossId].next = killTime.add(12, 'hour');
        }

        updateDashboard();
        res.status(200).send({ status: "success" });
    } else {
        res.status(400).send({ status: "error", message: "Boss ID not recognized" });
    }
});

// Health check endpoint for hosting service
app.get('/', (req, res) => res.send("Boss Radar Webhook is Online 🟢"));

client.on('ready', () => {
    console.log(`Bot logged in as ${client.user.tag}`);
    // Initial dashboard draw
    updateDashboard(); 
    // Auto-refresh countdowns every 60 seconds
    setInterval(updateDashboard, 60000); 
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`HTTP Server (Webhooks) running on port ${PORT}`));

client.login(process.env.BOT_TOKEN);
