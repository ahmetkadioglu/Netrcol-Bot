// events/ticketEvents.js - FINAL (GHOST TICKET AUTO-FIX ADDED)
const { 
    Events, StringSelectMenuBuilder, UserSelectMenuBuilder, ActionRowBuilder, 
    ChannelType, PermissionsBitField, EmbedBuilder, ButtonBuilder, ButtonStyle 
} = require('discord.js');
const db = require('../utils/database');
const helpers = require('../utils/helpers');
const ticketManager = require('../utils/ticketManager');
const { generateTranscript } = require('../utils/transcriptGenerator');

// Tracking
const processing = new Set();
const claimedTickets = new Map();
const ticketVoiceChannels = new Map();
const userOpenTickets = new Map();

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (!interaction.isButton() && !interaction.isAnySelectMenu()) return;

        const id = `${interaction.user.id}-${interaction.customId}`;
        if (processing.has(id)) return; 
        processing.add(id);

        try {
            if (interaction.isButton()) {
                switch (interaction.customId) {
                    // --- MAIN ---
                    case 'create_ticket': await handleCreateTicket(interaction); break;
                    case 'ticket_rules': await handleTicketRules(interaction); break;
                    case 'close_ticket': await handleTicketCloseButton(interaction); break;
                    case 'claim_ticket': await handleTicketClaimButton(interaction); break;
                    case 'ticket_settings': await handleTicketSettings(interaction); break;
                    case 'ticket_transfer': await handleTransferMenu(interaction); break;
                    case 'ticket_unclaim': await handleUnclaimButton(interaction); break;
                    
                    // --- CLOSE ACTIONS ---
                    case 'confirm_close_ticket': await handleTicketSoftClose(interaction); break;
                    case 'cancel_close_ticket': await handleTicketCloseCancel(interaction); break;
                    
                    // --- ADMIN PANEL ---
                    case 'ticket_reopen': await handleTicketReopen(interaction); break;
                    case 'ticket_transcript': await handleTicketTranscript(interaction); break;
                    case 'ticket_delete': await handleTicketDelete(interaction); break;

                    // --- SETTINGS ---
                    case 'settings_voice_toggle': await handleVoiceToggle(interaction); break;
                    case 'settings_slowmode': await handleSlowmodeMenu(interaction); break;
                    case 'settings_add_member': await handleAddMemberMenu(interaction); break;
                    case 'settings_remove_member': await handleRemoveMemberMenu(interaction); break;
                }
            } else if (interaction.isStringSelectMenu()) {
                if (interaction.customId === 'ticket_category_select') await handleTicketCategorySelect(interaction);
                else if (interaction.customId === 'slowmode_select') await handleSlowmodeApply(interaction);
            } else if (interaction.isUserSelectMenu()) {
                if (interaction.customId === 'add_user_select') await handleAddUserApply(interaction);
                else if (interaction.customId === 'remove_user_select') await handleRemoveUserApply(interaction);
                else if (interaction.customId === 'transfer_user_select') await handleTransferUserApply(interaction);
            }
        } catch (error) {
            if (error.code !== 10062) console.error('Event Error:', error);
        } finally {
            setTimeout(() => processing.delete(id), 1000);
        }
    },
};

// --- HELPER FUNCTIONS (AUTO-FIX EKLENDİ) ---
async function checkUserOpenTicket(guildId, userId) {
    try {
        const userKey = `${guildId}-${userId}`;
        if (userOpenTickets.has(userKey)) userOpenTickets.delete(userKey);
        
        const userTickets = await db.getUserTickets(guildId, userId);
        const openTicket = userTickets.find(ticket => ticket.status === 'open');

        // 🔥 OTO-DÜZELTME (AUTO-FIX) 🔥
        if (openTicket) {
            const guild = await global.client.guilds.fetch(guildId).catch(() => null);
            if (guild) {
                // Kanal sunucuda hala var mı diye kontrol et
                const channel = await guild.channels.fetch(openTicket.channelId).catch(() => null);
                
                if (!channel) {
                    // KANAL YOKSA (ELLE SİLİNMİŞSE) DB'DEN SİL VE NULL DÖN
                    console.log(`[Auto-Fix] Ghost ticket detected for user ${userId}. Cleaning up...`);
                    await db.deleteTicketChannel(guildId, openTicket.channelId);
                    return null; // Engel kalktı
                }
            }
        }

        return openTicket || null;
    } catch { return null; }
}

async function isAuthorized(interaction) {
    const settings = await db.getTicketSettings(interaction.guild.id);
    return (settings.staffRoleId && interaction.member.roles.cache.has(settings.staffRoleId)) || 
           interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);
}

async function updateMainButtons(channel, claimerId = null) {
    try {
        const settings = await db.getTicketSettings(channel.guild.id);
        const settingsBtn = new ButtonBuilder().setCustomId('ticket_settings').setLabel(settings.ticketBtnSettings || 'Settings').setStyle(settings.styleSettings || ButtonStyle.Secondary).setEmoji('⚙️');
        const closeBtn = new ButtonBuilder().setCustomId('close_ticket').setLabel(settings.ticketBtnClose || 'Close').setStyle(settings.styleClose || ButtonStyle.Danger).setEmoji('🔒');
        let actionBtn;
        if (claimerId) actionBtn = new ButtonBuilder().setCustomId('ticket_transfer').setLabel('Transfer Staff').setStyle(ButtonStyle.Primary).setEmoji('🔄');
        else actionBtn = new ButtonBuilder().setCustomId('claim_ticket').setLabel(settings.ticketBtnClaim || 'Claim').setStyle(settings.styleClaim || ButtonStyle.Success).setEmoji('🙋');
        
        const row = new ActionRowBuilder().addComponents(actionBtn, settingsBtn, closeBtn);
        const messages = await channel.messages.fetch({ limit: 10 });
        const target = messages.find(m => m.embeds.length > 0 && m.embeds[0].title?.includes('Ticket'));
        if (target) await target.edit({ components: [row] });
    } catch (e) {}
}

async function handleTicketRules(interaction) {
    await interaction.deferReply({ flags: 64 });
    const settings = await db.getTicketSettings(interaction.guild.id);
    const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle(settings.rulesTitle || '📜 Ticket Rules')
        .setDescription(settings.rulesDescription || 'Please follow the rules.')
        .setFooter({ text: 'Violation may result in ban.' });
    await interaction.editReply({ embeds: [embed] });
}

// --- CREATE LOGIC ---
async function handleCreateTicket(interaction) {
    await interaction.deferReply({ flags: 64 });
    try {
        // Kontrol artık oto-fix içeriyor
        const existing = await checkUserOpenTicket(interaction.guild.id, interaction.user.id);
        if (existing) return interaction.editReply({ content: `❌ You already have an open ticket: <#${existing.channelId}>` });

        const settings = await db.getTicketSettings(interaction.guild.id);
        if (!settings?.enabled) return interaction.editReply({ content: '❌ System disabled.' });

        if (settings.topicSystem) {
            const categories = await ticketManager.getAvailableTopics(interaction.guild.id);
            if (!categories.length) return interaction.editReply({ content: '❌ No topics found.' });
            
            const menu = new StringSelectMenuBuilder()
                .setCustomId('ticket_category_select')
                .setPlaceholder('Select topic...')
                .addOptions(categories.map(c => ({ label: c.name, value: c.id, emoji: c.emoji || '🎫' })));
            
            await interaction.editReply({ 
                embeds: [new EmbedBuilder().setColor('#5865F2').setTitle('Support').setDescription('Select a topic:')], 
                components: [new ActionRowBuilder().addComponents(menu)] 
            });
        } else {
            await createTicketChannel(interaction, null);
        }
    } catch (e) { console.error(e); }
}

async function handleTicketCategorySelect(interaction) {
    await interaction.deferUpdate();
    await createTicketChannel(interaction, interaction.values[0]);
}

async function createTicketChannel(interaction, categoryId) {
    try {
        const { guild, user } = interaction;
        const settings = await db.getTicketSettings(guild.id);
        const categories = await ticketManager.getAvailableTopics(guild.id);
        const category = categories.find(c => c.id === categoryId);

        const ticketNumber = Date.now().toString().slice(-6);
        const channelName = `ticket-${user.username}-${ticketNumber}`.replace(/[^a-z0-9-]/g, '').toLowerCase();

        const permissionOverwrites = [
            { 
                id: guild.roles.everyone.id, 
                deny: [PermissionsBitField.Flags.ViewChannel] 
            },
            { 
                id: user.id, 
                allow: [
                    PermissionsBitField.Flags.ViewChannel, 
                    PermissionsBitField.Flags.SendMessages, 
                    PermissionsBitField.Flags.AttachFiles, 
                    PermissionsBitField.Flags.ReadMessageHistory
                ] 
            }
        ];

        if (settings.staffRoleId) {
            permissionOverwrites.push({ 
                id: settings.staffRoleId, 
                allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ManageMessages] 
            });
        }
        if (category?.staffRoleId) {
            permissionOverwrites.push({ 
                id: category.staffRoleId, 
                allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ManageMessages] 
            });
        }

        const channel = await guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: settings.discordCategoryId ? guild.channels.cache.get(settings.discordCategoryId) : null,
            permissionOverwrites: permissionOverwrites,
            topic: `Ticket Owner: ${user.id} | ID: ${ticketNumber}`
        });

        const userKey = `${guild.id}-${user.id}`;
        userOpenTickets.set(userKey, { channelId: channel.id, createdAt: new Date() });
        await db.saveTicketChannel(guild.id, channel.id, user.id, categoryId);

        const welcomeDesc = settings.ticketDescription 
            ? settings.ticketDescription.replace('{user}', user.toString()).replace('{topic}', category?.name || 'General') 
            : `Hello ${user}, support staff will assist you shortly.\n\n**Topic:** ${category?.name || 'General'}`;

        const embed = new EmbedBuilder().setColor('#5865F2').setTitle('🎫 Ticket Created').setDescription(welcomeDesc).setTimestamp();
        
        const claimBtn = new ButtonBuilder().setCustomId('claim_ticket').setLabel(settings.ticketBtnClaim || 'Claim').setStyle(settings.styleClaim || ButtonStyle.Success).setEmoji('🙋');
        const settingsBtn = new ButtonBuilder().setCustomId('ticket_settings').setLabel(settings.ticketBtnSettings || 'Settings').setStyle(settings.styleSettings || ButtonStyle.Secondary).setEmoji('⚙️');
        const closeBtn = new ButtonBuilder().setCustomId('close_ticket').setLabel(settings.ticketBtnClose || 'Close').setStyle(settings.styleClose || ButtonStyle.Danger).setEmoji('🔒');
        
        const row = new ActionRowBuilder().addComponents(claimBtn, settingsBtn, closeBtn);

        let mention = `${user}`;
        if (category?.staffRoleId) mention += ` <@&${category.staffRoleId}>`;
        else if (settings.staffRoleId) mention += ` <@&${settings.staffRoleId}>`;

        await channel.send({ content: mention, embeds: [embed], components: [row] });

        const replyContent = `✅ Ticket created: ${channel}`;
        if (interaction.isButton()) await interaction.editReply({ content: replyContent });
        else await interaction.editReply({ content: replyContent, components: [], embeds: [] });

        await helpers.sendLog(guild, { type: 'ticket_create', title: 'Ticket Created', description: `${user} created ticket: ${channel}`, color: '#5865F2' });

    } catch (e) { 
        console.error('Create Ticket Error:', e); 
        if(interaction.replied || interaction.deferred) interaction.editReply({ content: '❌ Failed to create channel.' }).catch(()=>{});
    }
}

// --- CLOSE FLOW (SOFT CLOSE + MANAGE) ---
async function handleTicketCloseButton(interaction) {
    // İSİM KONTROLÜ DEĞİL, DB KONTROLÜ (FIX)
    const ticketData = await db.getTicketChannel(interaction.guild.id, interaction.channel.id);
    if (!ticketData) return interaction.reply({ content: '❌ This channel is not a registered ticket.', flags: 64 });

    await interaction.deferReply({ flags: 64 });
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('confirm_close_ticket').setLabel('Close Ticket').setStyle(ButtonStyle.Danger).setEmoji('🔒'),
        new ButtonBuilder().setCustomId('cancel_close_ticket').setLabel('Cancel').setStyle(ButtonStyle.Secondary)
    );
    await interaction.editReply({ embeds: [new EmbedBuilder().setColor('#FFA500').setDescription('⚠️ Are you sure you want to close this ticket?')], components: [row] });
}

async function handleTicketCloseCancel(interaction) {
    await interaction.deferUpdate();
    await interaction.editReply({ content: '✅ Cancelled.', embeds: [], components: [] });
}

async function handleTicketSoftClose(interaction) {
    await interaction.deferUpdate();
    await interaction.editReply({ content: '✅ Ticket closed.', embeds: [], components: [] });

    try {
        const { channel, guild } = interaction;
        const ticketData = await db.getTicketChannel(guild.id, channel.id);
        const ownerId = ticketData?.userId;

        if (ownerId) await channel.permissionOverwrites.edit(ownerId, { ViewChannel: false, SendMessages: false });
        
        if (!channel.name.startsWith('closed-')) {
            await channel.setName(`closed-${channel.name.split('-').pop()}`).catch(e => console.log('Rate limit hit on name change.'));
        }

        const embed = new EmbedBuilder().setColor('#2B2D31').setTitle('🔒 Ticket Closed').setDescription(`Closed by ${interaction.user}.`).setTimestamp();
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('ticket_reopen').setLabel('Open').setStyle(ButtonStyle.Success).setEmoji('🔓'),
            new ButtonBuilder().setCustomId('ticket_transcript').setLabel('Transcript').setStyle(ButtonStyle.Secondary).setEmoji('📝'),
            new ButtonBuilder().setCustomId('ticket_delete').setLabel('Delete').setStyle(ButtonStyle.Danger).setEmoji('⛔')
        );

        await channel.send({ embeds: [embed], components: [row] });
        await helpers.sendLog(guild, { type: 'ticket_close', title: 'Ticket Closed', description: `Closed by ${interaction.user}.`, color: '#FEE75C' });

    } catch (e) { console.error(e); }
}

async function handleTicketReopen(interaction) {
    await interaction.deferReply();
    const { channel, guild } = interaction;
    const ticketData = await db.getTicketChannel(guild.id, channel.id);
    if (ticketData?.userId) await channel.permissionOverwrites.edit(ticketData.userId, { ViewChannel: true, SendMessages: true });
    await channel.setName(channel.name.replace('closed-', 'ticket-')).catch(e => console.log('Reopen name error'));
    await interaction.editReply({ content: '✅ Reopened.' });
    await interaction.message.delete().catch(() => {});
    await helpers.sendLog(guild, { type: 'ticket_open', title: 'Reopened', description: `By ${interaction.user}.`, color: '#57F287' });
}

async function handleTicketTranscript(interaction) {
    await interaction.deferReply({ flags: 64 });
    const attachment = await generateTranscript(interaction.channel, interaction.guild);
    if (!attachment) return interaction.editReply('❌ Error generating transcript.');
    
    const s = await db.getTicketSettings(interaction.guild.id);
    const log = interaction.guild.channels.cache.get(s.logChannelId);
    if (log) {
        await log.send({ content: `Transcript for **${interaction.channel.name}**`, files: [attachment] });
        await interaction.editReply({ content: `✅ Transcript sent to <#${log.id}>` });
    } else {
        await interaction.editReply({ files: [attachment] });
    }
}

async function handleTicketDelete(interaction) {
    await interaction.deferReply();
    await interaction.editReply('⛔ Deleting...');
    const { channel, guild } = interaction;

    if (ticketVoiceChannels.has(channel.id)) {
        const v = guild.channels.cache.get(ticketVoiceChannels.get(channel.id));
        if (v) await v.delete().catch(() => {});
        ticketVoiceChannels.delete(channel.id);
    } else {
        const vname = `voice-${channel.name.replace('closed-', '').replace('ticket-', '')}`;
        const v = channel.parent?.children.cache.find(c => c.type === ChannelType.GuildVoice && c.name === vname);
        if (v) await v.delete().catch(() => {});
    }

    const t = await db.getTicketChannel(guild.id, channel.id);
    if (t?.userId) userOpenTickets.delete(`${guild.id}-${t.userId}`);
    await db.deleteTicketChannel(guild.id, channel.id);
    await helpers.sendLog(guild, { type: 'ticket_close', title: 'Deleted', description: `By ${interaction.user}.`, color: '#FF0000' });
    setTimeout(() => channel.delete().catch(() => {}), 5000);
}

// --- CLAIM/TRANSFER ---
async function handleTicketClaimButton(i){await i.deferReply({flags:64});if(!await isAuthorized(i))return i.editReply('❌ Not authorized.');claimedTickets.set(i.channel.id,i.member.id);await updateMainButtons(i.channel,i.member.id);await i.editReply('✅ Claimed.');await helpers.sendLog(i.guild,{type:'ticket_claim',title:'Claimed',description:`By ${i.user}.`,color:'#57F287'})}
async function handleTransferMenu(i){if(claimedTickets.get(i.channel.id)!==i.user.id)return i.reply({content:'❌ Only claimer.',flags:64});await i.deferReply({flags:64});const s=new UserSelectMenuBuilder().setCustomId('transfer_user_select').setMaxValues(1);const b=new ButtonBuilder().setCustomId('ticket_unclaim').setLabel('Unclaim').setStyle(4).setEmoji('🔓');await i.editReply({embeds:[new EmbedBuilder().setColor('#5865F2').setTitle('Manage').setDescription('Transfer/Unclaim')],components:[new ActionRowBuilder().addComponents(s),new ActionRowBuilder().addComponents(b)]})}
async function handleTransferUserApply(i){await i.deferUpdate();const t=i.values[0];const m=await i.guild.members.fetch(t);const s=await db.getTicketSettings(i.guild.id);if(!((s.staffRoleId&&m.roles.cache.has(s.staffRoleId))||m.permissions.has(PermissionsBitField.Flags.Administrator)))return i.editReply({content:'❌ Not staff!',components:[]});claimedTickets.set(i.channel.id,t);await i.channel.send(`🔄 Transferred to ${m}.`);await i.editReply({content:'✅ Done.',components:[]});await helpers.sendLog(i.guild,{type:'ticket_claim',title:'Transferred',description:`To ${m.user.tag}.`,color:'#5865F2'})}
async function handleUnclaimButton(i){await i.deferUpdate();claimedTickets.delete(i.channel.id);await updateMainButtons(i.channel,null);await i.channel.send('🔓 Unclaimed.');await i.editReply({content:'✅ Done.',components:[]});await helpers.sendLog(i.guild,{type:'ticket_open',title:'Unclaimed',description:`By ${i.user}.`,color:'#FFA500'})}

// --- SETTINGS ---
async function handleTicketSettings(i){if(!await isAuthorized(i))return i.reply({content:'❌ Staff only.',flags:64});await i.deferReply({flags:64});const v=ticketVoiceChannels.has(i.channel.id);const r=new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('settings_voice_toggle').setLabel(v?'Close Voice':'Open Voice').setStyle(v?4:1).setEmoji(v?'🔇':'🔊'),new ButtonBuilder().setCustomId('settings_slowmode').setLabel('Slowmode').setStyle(2).setEmoji('⏳'),new ButtonBuilder().setCustomId('settings_add_member').setLabel('Add').setStyle(3).setEmoji('👤'),new ButtonBuilder().setCustomId('settings_remove_member').setLabel('Remove').setStyle(4).setEmoji('🚫'));await i.editReply({embeds:[new EmbedBuilder().setColor('#2B2D31').setTitle('⚙️ Settings')],components:[r]})}
async function handleVoiceToggle(i){await i.deferUpdate();if(ticketVoiceChannels.has(i.channel.id)){const v=i.guild.channels.cache.get(ticketVoiceChannels.get(i.channel.id));if(v)await v.delete().catch(()=>{});ticketVoiceChannels.delete(i.channel.id);await i.editReply({content:'✅ Deleted.',components:[]});await helpers.sendLog(i.guild,{type:'ticket_voice_delete',title:'Voice Deleted',description:`By ${i.user}.`,color:'#ED4245'})}else{try{const v=await i.guild.channels.create({name:`voice-${i.channel.name.replace('ticket-','')}`,type:ChannelType.GuildVoice,parent:i.channel.parent,permissionOverwrites:i.channel.permissionOverwrites.cache});ticketVoiceChannels.set(i.channel.id,v.id);await i.editReply({content:`✅ Created: ${v}`,components:[]});await helpers.sendLog(i.guild,{type:'ticket_voice_create',title:'Voice Created',description:`By ${i.user}.`,color:'#57F287'})}catch(e){await i.editReply({content:'❌ Failed.',components:[]})}}}
async function handleSlowmodeMenu(i){await i.deferUpdate();const s=new StringSelectMenuBuilder().setCustomId('slowmode_select').setPlaceholder('Duration').addOptions([{label:'Off',value:'0'},{label:'1s',value:'1'},{label:'5s',value:'5'},{label:'10s',value:'10'}]);await i.editReply({content:'⏱️ Slowmode:',components:[new ActionRowBuilder().addComponents(s)]})}
async function handleSlowmodeApply(i){await i.deferUpdate();await i.channel.setRateLimitPerUser(parseInt(i.values[0]));await i.editReply({content:`✅ Set to ${i.values[0]}s`,components:[]});await helpers.sendLog(i.guild,{type:'ticket_settings',title:'Slowmode',description:`${i.values[0]}s`,color:'#5865F2'})}
async function handleAddMemberMenu(i){await i.deferUpdate();const s=new UserSelectMenuBuilder().setCustomId('add_user_select').setMaxValues(5);await i.editReply({content:'👤 Add:',components:[new ActionRowBuilder().addComponents(s)]})}
async function handleAddUserApply(i){await i.deferUpdate();for(const u of i.values)await i.channel.permissionOverwrites.edit(u,{ViewChannel:true,SendMessages:true});await i.editReply({content:'✅ Added.',components:[]});await helpers.sendLog(i.guild,{type:'ticket_member_add',title:'Member Added',description:'Users added.',color:'#57F287'})}
async function handleRemoveMemberMenu(i){await i.deferUpdate();const s=new UserSelectMenuBuilder().setCustomId('remove_user_select').setMaxValues(5);await i.editReply({content:'🚫 Remove:',components:[new ActionRowBuilder().addComponents(s)]})}
async function handleRemoveUserApply(i){await i.deferUpdate();const t=await db.getTicketChannel(i.guild.id,i.channel.id);for(const u of i.values){if(t&&u===t.userId)continue;await i.channel.permissionOverwrites.delete(u)}await i.editReply({content:'✅ Removed.',components:[]});await helpers.sendLog(i.guild,{type:'ticket_member_remove',title:'Member Removed',description:'Users removed.',color:'#ED4245'})}