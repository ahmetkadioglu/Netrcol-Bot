const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('istatistik')
        .setDescription('Bot istatistiklerini gösterir'),
    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('📊 Bot İstatistikleri')
            .addFields(
                { name: '🌐 Sunucular', value: `${interaction.client.guilds.cache.size}`, inline: true },
                { name: '👥 Kullanıcılar', value: `${interaction.client.users.cache.size}`, inline: true },
                { name: '🏓 Ping', value: `${Math.round(interaction.client.ws.ping)}ms`, inline: true },
                { name: '🕒 Çalışma Süresi', value: `<t:${Math.floor((Date.now() - interaction.client.uptime) / 1000)}:R>`, inline: true },
                { name: '💾 Bellek', value: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`, inline: true },
                { name: '📚 Discord.js', value: `v${require('discord.js').version}`, inline: true }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};