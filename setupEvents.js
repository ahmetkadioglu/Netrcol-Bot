// events/setupEvents.js - REORDERED & EMBEDDED
const { Events, StringSelectMenuBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, EmbedBuilder } = require('discord.js');
const ticketManager = require('../utils/ticketManager');
const db = require('../utils/database');

const activeInteractions = new Map();

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (!interaction.isStringSelectMenu() && !interaction.isButton()) return;
        if (interaction.customId.startsWith('ticket_setup_')) {
            await handleTicketSetup(interaction, interaction.customId);
        }
    },
};

async function handleTicketSetup(interaction, customId) {
    const { guild, user } = interaction;
    const interactionKey = `${guild.id}-${user.id}-${customId}`;
    
    if (activeInteractions.has(interactionKey)) return;
    activeInteractions.set(interactionKey, true);

    try {
        const session = ticketManager.getSetupSession(guild.id, user.id);

        if (!session) {
            if (interaction.isRepliable() && !interaction.replied) {
                await interaction.reply({ content: '❌ Session expired. Run `/ticket-setup` again.', flags: 64 });
            }
            activeInteractions.delete(interactionKey);
            return;
        }

        await handleInteractionStep(interaction, session, customId);

    } catch (error) {
        console.error('Setup error:', error);
        ticketManager.endSetup(guild.id, interaction.user.id);
        if (!interaction.replied) await interaction.reply({ content: '❌ Error occurred.', flags: 64 });
    } finally {
        activeInteractions.delete(interactionKey);
    }
}

async function handleInteractionStep(interaction, session, customId) {
    switch (customId) {
        // ARTIK 1. ADIMDAN GELEN CEVAP BU (Creation Channel seçildi) -> 2. ADIMA GİT (Log)
        case 'ticket_setup_creation_channel': 
            await handleCreationChannelSelect(interaction, session);
            break;
        
        // 2. ADIMDAN GELEN CEVAP (Log Channel seçildi) -> 3. ADIMA GİT (Category)
        case 'ticket_setup_log_channel': 
            await handleLogChannelSelect(interaction, session);
            break;

        case 'ticket_setup_category': 
            await handleCategorySelect(interaction, session);
            break;
        case 'ticket_setup_staff_role': 
            await handleStaffRoleSelect(interaction, session);
            break;
        case 'ticket_setup_basic_system':
        case 'ticket_setup_topic_system': 
            await handleSystemTypeSelect(interaction, session, customId);
            break;
        case 'ticket_setup_cancel':
            await handleSetupCancel(interaction, session);
            break;
    }
}

// 1. ADIM SONUCU -> 2. ADIMI GÖSTER (LOG KANALI)
async function handleCreationChannelSelect(interaction, session) {
    await interaction.deferUpdate();
    const channelId = interaction.values[0];
    
    session.data.creationChannelId = channelId;
    ticketManager.updateSetupSession(session.guildId, session.userId, { step: 1, data: session.data });

    const channels = interaction.guild.channels.cache
        .filter(channel => channel.type === ChannelType.GuildText)
        .sort((a, b) => a.position - b.position)
        .first(25);

    if (channels.size === 0) return interaction.editReply({ content: '❌ No channels found.', components: [] });

    const channelSelect = new StringSelectMenuBuilder()
        .setCustomId('ticket_setup_log_channel') // Hedef ID
        .setPlaceholder('Select log channel...')
        .addOptions(channels.map(c => ({
            label: `#${c.name.substring(0, 25)}`,
            value: c.id,
            description: `Position: ${c.position}`,
            emoji: '📜'
        })));

    const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('🛠️ Ticket Setup: Step 2/5')
        .setDescription('**Select Log Channel**\n\nWhere should ticket logs (opened, closed, transcript) be sent?')
        .setFooter({ text: 'Step 2: Log Channel' });

    await interaction.editReply({ content: null, embeds: [embed], components: [new ActionRowBuilder().addComponents(channelSelect)] });
}

// 2. ADIM SONUCU -> 3. ADIMI GÖSTER (KATEGORİ)
async function handleLogChannelSelect(interaction, session) {
    await interaction.deferUpdate();
    const channelId = interaction.values[0];
    
    session.data.logChannelId = channelId;
    ticketManager.updateSetupSession(session.guildId, session.userId, { step: 2, data: session.data });

    const categoryOptions = [
        { label: 'No Category', value: 'none', description: 'Create at top level', emoji: '🚫' },
        ...interaction.guild.channels.cache
            .filter(c => c.type === ChannelType.GuildCategory)
            .sort((a, b) => a.position - b.position)
            .first(24)
            .map(c => ({
                label: c.name.substring(0, 25),
                value: c.id,
                description: `Pos: ${c.position}`,
                emoji: '📁'
            }))
    ];

    const categorySelect = new StringSelectMenuBuilder()
        .setCustomId('ticket_setup_category')
        .setPlaceholder('Select category...')
        .addOptions(categoryOptions);

    const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('🛠️ Ticket Setup: Step 3/5')
        .setDescription('**Select Discord Category**\n\nUnder which category should new ticket channels be created?')
        .setFooter({ text: 'Step 3: Category' });

    await interaction.editReply({ content: null, embeds: [embed], components: [new ActionRowBuilder().addComponents(categorySelect)] });
}

// 3. ADIM SONUCU -> 4. ADIMI GÖSTER (STAFF ROLE)
async function handleCategorySelect(interaction, session) {
    await interaction.deferUpdate();
    const categoryId = interaction.values[0];
    
    session.data.discordCategoryId = categoryId === 'none' ? null : categoryId;
    ticketManager.updateSetupSession(session.guildId, session.userId, { step: 3, data: session.data });

    const roles = interaction.guild.roles.cache
        .filter(r => r.name !== '@everyone' && !r.managed)
        .sort((a, b) => b.position - a.position)
        .first(25);

    if (roles.size === 0) return interaction.editReply({ content: '❌ No roles found.', components: [] });

    const roleSelect = new StringSelectMenuBuilder()
        .setCustomId('ticket_setup_staff_role')
        .setPlaceholder('Select staff role...')
        .addOptions(roles.map(r => ({
            label: r.name.substring(0, 25),
            value: r.id,
            description: `Members: ${r.members.size}`,
            emoji: '🛡️'
        })));

    const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('🛠️ Ticket Setup: Step 4/5')
        .setDescription('**Select Staff Role**\n\nWhich role should have access to see and manage tickets?')
        .setFooter({ text: 'Step 4: Staff Role' });

    await interaction.editReply({ content: null, embeds: [embed], components: [new ActionRowBuilder().addComponents(roleSelect)] });
}

// 4. ADIM SONUCU -> 5. ADIMI GÖSTER (SİSTEM TİPİ)
async function handleStaffRoleSelect(interaction, session) {
    await interaction.deferUpdate();
    const roleId = interaction.values[0];
    
    session.data.staffRoleId = roleId;
    ticketManager.updateSetupSession(session.guildId, session.userId, { step: 4, data: session.data });

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ticket_setup_basic_system').setLabel('Basic System').setStyle(ButtonStyle.Primary).setEmoji('🎫'),
        new ButtonBuilder().setCustomId('ticket_setup_topic_system').setLabel('Topic System').setStyle(ButtonStyle.Secondary).setEmoji('📝'),
        new ButtonBuilder().setCustomId('ticket_setup_cancel').setLabel('Cancel').setStyle(ButtonStyle.Danger).setEmoji('❌')
    );

    const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('🛠️ Ticket Setup: Step 5/5')
        .setDescription('**Select System Type**\n\n**🎫 Basic:** Users click "Create" -> Ticket opens instantly.\n**📝 Topic:** Users click "Create" -> Select a topic -> Ticket opens.')
        .setFooter({ text: 'Step 5: System Type' });

    await interaction.editReply({ content: null, embeds: [embed], components: [row] });
}

// 5. ADIM SONUCU -> BİTİŞ
async function handleSystemTypeSelect(interaction, session, customId) {
    await interaction.deferUpdate();
    const isTopicSystem = customId === 'ticket_setup_topic_system';
    
    session.data.topicSystem = isTopicSystem;
    session.data.enabled = true;

    const success = await db.saveTicketSettings(session.guildId, session.data);
    if (!success) return interaction.editReply({ content: '❌ Database error.', components: [] });

    // Paneli gönder
    const targetChannel = interaction.guild.channels.cache.get(session.data.creationChannelId);
    if (targetChannel) {
        try {
            const msgs = await targetChannel.messages.fetch({ limit: 10 });
            const botMsgs = msgs.filter(m => m.author.id === interaction.client.user.id && m.embeds.length > 0);
            if (botMsgs.size > 0) await targetChannel.bulkDelete(botMsgs);
        } catch (e) {}
        await ticketManager.sendTicketPanel(targetChannel, session.guildId);
    }
    
    const embed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle('✅ Setup Complete!')
        .addFields(
            { name: 'Panel Channel', value: `<#${session.data.creationChannelId}>`, inline: true },
            { name: 'Log Channel', value: `<#${session.data.logChannelId}>`, inline: true },
            { name: 'Category', value: session.data.discordCategoryId ? `<#${session.data.discordCategoryId}>` : 'None', inline: true },
            { name: 'Staff Role', value: `<@&${session.data.staffRoleId}>`, inline: true },
            { name: 'Type', value: isTopicSystem ? 'Topic' : 'Basic', inline: true }
        )
        .setDescription(`**Setup is finished!**\nThe ticket panel has been sent to <#${session.data.creationChannelId}>.`)
        .setTimestamp();

    await interaction.editReply({ content: null, embeds: [embed], components: [] });
    ticketManager.endSetup(session.guildId, session.userId);
}

async function handleSetupCancel(interaction, session) {
    ticketManager.endSetup(session.guildId, session.userId);
    const embed = new EmbedBuilder().setColor('#ED4245').setDescription('❌ Setup cancelled.');
    await interaction.update({ content: null, embeds: [embed], components: [] });
}