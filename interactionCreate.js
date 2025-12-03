// events/interactionCreate.js - FINAL VERSION (BOT MAINTENANCE CHECK)
const { Events, EmbedBuilder } = require('discord.js');
// Yeni bakım sistemi fonksiyonlarını içe aktarıyoruz
const { isBotMaintenance, canUseCommandsDuringMaintenance } = require('../commands/admin/maintenance');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        // Sadece Slash Komutları (Chat Input) ile ilgileniyoruz
        // (Buton, Menü ve Modalları ilgili event dosyaları yönetiyor)
        if (!interaction.isChatInputCommand()) return;

        const command = interaction.client.commands.get(interaction.commandName);

        if (!command) {
            console.error(`No command matching ${interaction.commandName} was found.`);
            return;
        }

        // --- BAKIM MODU KONTROLÜ (GÜNCELLENDİ) ---
        // Artık 'isBotMaintenance()' kullanıyoruz. 
        // Bu fonksiyon bakım kapsamı 'discord' veya 'both' ise true döner.
        if (isBotMaintenance() && !canUseCommandsDuringMaintenance(interaction.user.id)) {
            const maintenanceEmbed = new EmbedBuilder()
                .setColor('#FFA500')
                .setTitle('🚧 Maintenance Mode')
                .setDescription('The bot is currently under maintenance.\nPlease try again later.')
                .setTimestamp();
            
            return interaction.reply({ embeds: [maintenanceEmbed], flags: 64 });
        }

        // Komutu Çalıştır
        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(`Error executing ${interaction.commandName}`);
            console.error(error);

            const errorEmbed = new EmbedBuilder()
                .setColor('#ED4245')
                .setTitle('❌ Error')
                .setDescription('An error occurred while executing this command.');

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ embeds: [errorEmbed], flags: 64 });
            } else {
                await interaction.reply({ embeds: [errorEmbed], flags: 64 });
            }
        }
    },
};