async function updateDashboard() {
    const channel = await client.channels.fetch(process.env.DASHBOARD_ID);
    if (!channel) return;

    const embed = new EmbedBuilder()
        .setAuthor({ name: "SOVEREIGN TACTICAL RADAR", iconURL: "https://i.imgur.com/83p1D7A.png" })
        .setColor("#2b2d31")
        .setDescription(`>>> **SYSTEM STATUS:** ONLINE\n**LAST SCAN:** <t:${Math.floor(Date.now() / 1000)}:R>`)
        .setTimestamp();

    const groups = ["🌊 ESDELRON LAKE", "❄️ ICE CASTLE", "🌵 POIBUS", "🌀 OTHER MAPS"];
    
    groups.forEach(groupName => {
        let fieldContent = "";
        for (const id in bosses) {
            const b = bosses[id];
            if (b.group === groupName) {
                // Creates a boxy [ STATUS ] [ TIME ] Name format
                const statusLabel = b.status === "ALIVE" ? "UP  " : "DOWN";
                const timeLabel = b.status === "ALIVE" 
                    ? b.spawnTime 
                    : (b.next ? b.next.format('HH:mm') : "--:--");
                
                fieldContent += `\`${statusLabel}\` \`${timeLabel}\` **${b.name}**\n`;
            }
        }
        
        // inline: true makes them look like boxes/cards
        embed.addFields({ 
            name: `──────────────\n${groupName}`, 
            value: fieldContent || "📡 *Scanning...*", 
            inline: true 
        });
    });

    const messages = await channel.messages.fetch({ limit: 10 });
    const lastMsg = messages.find(m => m.author.id === client.user.id);

    if (lastMsg) {
        await lastMsg.edit({ embeds: [embed] });
    } else {
        await channel.send({ embeds: [embed] });
    }
}
