// commands/tickets/ticket-setup.js - STEP 1: CREATION CHANNEL (EMBED)
const { SlashCommandBuilder, StringSelectMenuBuilder, ActionRowBuilder, ChannelType, PermissionsBitField, EmbedBuilder } = require('discord.js');
const ticketManager = require('../../utils/ticketManager');
const db = require('../../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket-setup')
        .setDescription('Start the interactive ticket system setup'),
    async execute(interaction) {
        const { guild, member } = interaction;

        if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({
                content: '❌ Administrator permissions required!',
                flags: 64
            });
        }

        const existingSettings = await db.getTicketSettings(guild.id);
        if (existingSettings && existingSettings.enabled) {
            return interaction.reply({
                content: '❌ System already setup! Use `/ticket-disable` first.',
                flags: 64
            });
        }

        // Oturumu başlat
        ticketManager.startSetup(interaction.user.id, guild.id);

        // Metin kanallarını al
        const channels = guild.channels.cache
            .filter(channel => channel.type === ChannelType.GuildText)
            .sort((a, b) => a.position - b.position)
            .first(25);

        if (channels.size === 0) {
            return interaction.reply({ content: '❌ No text channels found.', flags: 64 });
        }

        // Menü oluştur
        const channelSelect = new StringSelectMenuBuilder()
            .setCustomId('ticket_setup_creation_channel') // ARTIK İLK ADIM BU
            .setPlaceholder('Select channel for ticket panel...')
            .addOptions(
                channels.map(channel => ({
                    label: `#${channel.name.substring(0, 25)}`,
                    value: channel.id,
                    description: `Position: ${channel.position}`,
                    emoji: '📢'
                }))
            );

        const row = new ActionRowBuilder().addComponents(channelSelect);

        // Embed oluştur
        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('🛠️ Ticket Setup: Step 1/5')
            .setDescription('**Select Ticket Panel Channel**\n\nWhere should the "Create Ticket" panel be sent?\nUsers will click the button in this channel to open tickets.')
            .setFooter({ text: 'Step 1: Panel Channel' });

        await interaction.reply({
            embeds: [embed],
            components: [row],
            flags: 64
        });
    },
};