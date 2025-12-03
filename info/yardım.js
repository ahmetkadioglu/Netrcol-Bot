const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Shows a list of all available commands'),
    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setColor('#ff512f') // Dashboard temasıyla uyumlu
            .setTitle('🔥 Netrcol Bot Commands')
            .setDescription('Here is the complete list of commands to manage your server.')
            .setThumbnail(interaction.client.user.displayAvatarURL())
            .addFields(
                { 
                    name: '🎫 Ticket System', 
                    value: '`/ticket-setup` · `/ticket-settings` · `/ticket-disable`\n`/ticket-close` · `/topic-add` · `/topic-settings` · `/topic-clear`', 
                    inline: false 
                },
                { 
                    name: '📝 Registration System', 
                    value: '`/regist-setup` · `/regist-settings` · `/regist-disable`', 
                    inline: false 
                },
                { 
                    name: '🛡️ Moderation & Jail', 
                    value: '`/jail` · `/unjail` · `/jail-setup`\n`/warn` · `/warnings`\n`/ban` · `/unban` · `/kick` · `/timeout` · `/untimeout`\n`/lock` · `/unlock` · `/clear`', 
                    inline: false 
                },
                { 
                    name: '🎁 Giveaways & Events', 
                    value: '`/giveaway start` · `/giveaway end` · `/giveaway reroll`', 
                    inline: false 
                },
                { 
                    name: '🔊 Voice & Welcome', 
                    value: '`/jtc-setup` (Join to Create Room)\n`/welcome setup` · `/welcome test` · `/welcome disable`', 
                    inline: false 
                },
                { 
                    name: '📜 Logging & System', 
                    value: '`/logs-setup` · `/logs-edit` · `/logs-disable`\n`/maintenance` (Admin Only)', 
                    inline: false 
                },
                { 
                    name: '📊 Information', 
                    value: '`/botstats` · `/serverinfo` · `/botinfo` · `/ping`', 
                    inline: false 
                }
            )
            .setFooter({ text: 'Netrcol Bot v3.2.0 • Developed with ❤️' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};