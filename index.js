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
 * BOSS DATABASE
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
    pig1: { name: "1st Pig", aliases: ["Sly Pig"], group: "🐷 Esdelron Lake", icon: "🐷", thumbnail: "https://monosakarida.wordpress.com/wp-content/uploads/2013/12/babi.jpg?w=300", status: "DEAD", lastKilled: null, next: null },
    pig2: { name: "2nd Pig", aliases: ["Violent Pig"], group: "🐷 Esdelron Lake", icon: "🐷", status: "DEAD", lastKilled: null, next: null },
    pig3: { name: "3rd Pig", aliases: ["Swift Pig"], group: "🐷 Esdelron Lake", icon: "🐷", status: "DEAD", lastKilled: null, next: null },
    pillar: { 
        name: "Pillar", 
        aliases: ["Pillar"], 
        group: "🗿 Southern Poibus", 
        thumbnail: "https://i.imgur.com/VVap6tO.jpg", 
        icon: "🗿", 
        status: "DEAD", 
        lastKilled: null, 
        isWindow: true, // Special flag for Pillar
        windowMin: 10,  // 10 hours min
        windowMax: 12   // 12 hours max
    },
    ice_queen: { name: "Ice Queen", aliases: ["Ice Queen"], group: "🏰 Ice Castle", thumbnail: "https://static.wikia.nocookie.net/sealonline/images/8/89/Ice_Castle.png", icon: "👸", status: "DEAD", lastKilled: null, next: null },
    ice_golem: { name: "Ice Golem", aliases: ["Ice Golem"], group: "🏰 Ice Castle", icon: "🧊", status: "DEAD", lastKilled: null, next: null },
    ice_sword: { name: "Ice Sword", aliases: ["Ice Sword"], group: "🏰 Ice Castle", icon: "⚔️", status: "DEAD", lastKilled: null, next: null },
    ice_shield: { name: "Ice Shield", aliases: ["Ice Shield"], group: "🏰 Ice Castle", icon: "🛡️", status: "DEAD", lastKilled: null, next: null },
    ohm: { name: "U. Ohm", aliases: ["Unstable Ohm"], group: "🧿 Blue Eye", thumbnail: "https://i.ytimg.com/vi/ViT66zjeN9I/maxresdefault.jpg", icon: "🧿", status: "DEAD", lastKilled: null, next: null }
};

client.on('ready', () => {
    console.log(`Radar Online: ${client.user.tag}`);
    updateDashboard(); 
    setInterval(updateDashboard, 60000); 
});

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

        const messages = await channel.messages.fetch({ limit: 10 });
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

                if (b.isFixed) {
                    let target = dayjs().tz("Asia/Jakarta").hour(10).minute(0).second(0);
                    if (now.isAfter(target)) target = target.add(1, 'day');
                    const dur = dayjs.duration(target.diff(now));
                    descriptionBody += `${b.icon} ${b.name.padEnd(10)} | ⏰ ${b.fixedTime} (in ${Math.floor(dur.asHours())}h ${dur.minutes()}m)\n`;
                } 
                else if (b.isWindow && b.lastKilled) {
                    const winStart = b.lastKilled.add(b.windowMin, 'hour');
                    const winEnd = b.lastKilled.add(b.windowMax, 'hour');
                    const statusEmoji = now.isAfter(winStart) ? "🟡" : "💀";
                    
                    const timeRange = `${winStart.format('HH:mm')}-${winEnd.format('HH:mm')}`;
                    let countdown = "";
                    
                    if (now.isBefore(winStart)) {
                        const dur = dayjs.duration(winStart.diff(now));
                        countdown = ` (in ${Math.floor(dur.asHours())}h ${dur.minutes()}m)`;
                    } else if (now.isBefore(winEnd)) {
                        countdown = ` (WINDOW)`;
                    } else {
                        countdown = ` (READY)`;
                    }

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

client.login(process.env.BOT_TOKEN);
