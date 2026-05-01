const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const dayjs = require('dayjs');
const duration = require('dayjs/plugin/duration');
const customParseFormat = require('dayjs/plugin/customParseFormat');

dayjs.extend(customParseFormat);
dayjs.extend(duration);

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
        name: "World Boss", 
        group: "🛰️ GLOBAL OPERATIONS", 
        thumbnail: "https://cdn.moogold.com/2024/10/Seal-M.jpg", 
        icon: "🛡️",
        isFixed: true 
    },
    pig1: { name: "Sly Pig", aliases: ["Sly Pig"], group: "ESDELRON LAKE", icon: "🐷", status: "DEAD", lastKilled: null, next: null },
    pig2: { name: "Violent Pig", aliases: ["Violent Pig"], group: "ESDELRON LAKE", icon: "🐷", status: "DEAD", lastKilled: null, next: null },
    pig3: { name: "Swift Pig", aliases: ["Swift Pig"], group: "ESDELRON LAKE", icon: "🐷", status: "DEAD", lastKilled: null, next: null },
    pillar: { name: "Pillar", aliases: ["Pillar"], group: "SOUTHERN POIBUS", thumbnail: "https://i.imgur.com/VVap6tO.jpg", icon: "🗿", status: "DEAD", lastKilled: null, next: null },
    ice_queen: { name: "Ice Queen", aliases: ["Ice Queen"], group: "ICE CASTLE", thumbnail: "https://static.wikia.nocookie.net/sealonline/images/8/89/Ice_Castle.png", icon: "👸", status: "DEAD", lastKilled: null, next: null },
    ice_golem: { name: "Ice Golem", aliases: ["Ice Golem"], group: "ICE CASTLE", icon: "🧊", status: "DEAD", lastKilled: null, next: null },
    ice_sword: { name: "Iceman (S)", aliases: ["Iceman (Sword)"], group: "ICE CASTLE", icon: "⚔️", status: "DEAD", lastKilled: null, next: null },
    ice_shield: { name: "Iceman (SH)", aliases: ["Iceman Shield"], group: "ICE CASTLE", icon: "🛡️", status: "DEAD", lastKilled: null, next: null },
    ohm: { name: "Unstable Ohm", aliases: ["Unstable Ohm"], group: "BLUE EYE", thumbnail: "https://i.ytimg.com/vi/ViT66zjeN9I/maxresdefault.jpg", icon: "🧿", status: "DEAD", lastKilled: null, next: null }
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
            
            // Fix Image consistency: Using setAuthor icon ensures all zone pics are the same size
            const zoneImage = zoneBosses.find(b => b.thumbnail)?.thumbnail || "https://i.imgur.com/8Qz5QnB.png";
            
            const eb = new EmbedBuilder()
                .setAuthor({ name: zoneName, iconURL: zoneImage })
                .setColor(zoneName.includes("ICE") ? "#0099ff" : "#2b2d31");

            let descriptionBody = "";

            zoneBosses.forEach(b => {
                if (b.isFixed) {
                    descriptionBody += `${b.icon} **${b.name}** • \`STATIC\`\n`;
                } else {
                    const statusEmoji = b.status === "ALIVE" ? "🟢" : "💀";
                    const lastT = b.lastKilled ? b.lastKilled.format('HH:mm') : "--:--";
                    const nextT = b.next ? b.next.format('HH:mm') : "--:--";
                    
                    let timeRemaining = "";
                    if (b.status === "DEAD" && b.next) {
                        const diff = b.next.diff(dayjs());
                        if (diff > 0) {
                            const dur = dayjs.duration(diff);
                            timeRemaining = ` [${Math.floor(dur.asHours())}h ${dur.minutes()}m]`;
                        } else {
                            timeRemaining = ` [READY]`;
                        }
                    }
                    
                    // ULTRA-COMPACT: All info on one single line
                    descriptionBody += `${statusEmoji} **${b.name}** \`L:${lastT} N:${nextT}\`${timeRemaining}\n`;
                }
            });

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

// ... messageCreate logic remains the same
client.login(process.env.BOT_TOKEN);
