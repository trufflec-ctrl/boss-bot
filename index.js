async function updateDashboard() {
    const channel = await client.channels.fetch(process.env.DASHBOARD_ID);
    if (!channel) return;

    const embed = new EmbedBuilder()
        .setTitle("🛰️ SOVEREIGN BOSS RADAR")
        .setDescription(`**Last System Ping:** <t:${Math.floor(Date.now() / 1000)}:R>\n*All timers are based on a 12h rotation.*`)
        .setColor("#2b2d31") // Sleek dark grey
        .setThumbnail("https://i.imgur.com/83p1D7A.png"); // Optional: Add a cool icon URL here

    const groups = ["🌊 ESDELRON LAKE", "❄️ ICE CASTLE", "🌵 POIBUS", "🌀 OTHER MAPS"];
    
    groups.forEach(groupName => {
        let fieldContent = "";
        for (const id in bosses) {
            const b = bosses[id];
            if (b.group === groupName) {
                const statusEmoji = b.status === "ALIVE" ? "🟢" : "🔴";
                const timeInfo = b.status === "ALIVE" 
                    ? `LIVE since ${b.spawnTime}` 
                    : `ETA: ${b.next ? b.next.format('HH:mm') : '--:--'}`;
                
                // Using a code-block style for a "Terminal" look
                fieldContent += `${statusEmoji} \`${timeInfo}\` **${b.name}**\n`;
            }
        }
        embed.addFields({ name: `\n${groupName}`, value: fieldContent || "📡 *Scanning...*", inline: false });
    });

    const messages = await channel.messages.fetch({ limit: 10 });
    const lastMsg = messages.find(m => m.author.id === client.user.id);

    if (lastMsg) {
        await lastMsg.edit({ embeds: [embed] });
    } else {
        await channel.send({ embeds: [embed] });
    }
}
