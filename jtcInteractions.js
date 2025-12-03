// events/jtcInteractions.js - JTC BUTTONS
const { Events, PermissionsBitField, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, UserSelectMenuBuilder, EmbedBuilder } = require('discord.js');
const db = require('../utils/database');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (!interaction.customId || !interaction.customId.startsWith('jtc_')) return;

        const channel = interaction.channel;
        const jtcData = await db.getActiveJTC(channel.id);

        if (!jtcData) return interaction.reply({ content: '❌ This is not a managed private room.', flags: 64 });

        // Sahibi mi?
        if (jtcData.ownerId !== interaction.user.id) {
            return interaction.reply({ content: '❌ Only the room owner can manage this room.', flags: 64 });
        }

        // --- BUTON İŞLEMLERİ ---

        if (interaction.customId === 'jtc_lock') {
            await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { Connect: false });
            await interaction.reply({ content: '🔒 Room locked for everyone.', flags: 64 });
        }
        else if (interaction.customId === 'jtc_unlock') {
            await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { Connect: true });
            await interaction.reply({ content: '🔓 Room unlocked for everyone.', flags: 64 });
        }
        else if (interaction.customId === 'jtc_rename') {
            const modal = new ModalBuilder().setCustomId('jtc_modal_rename').setTitle('Rename Room');
            const input = new TextInputBuilder().setCustomId('name').setLabel('New Name').setStyle(TextInputStyle.Short).setRequired(true);
            modal.addComponents(new ActionRowBuilder().addComponents(input));
            await interaction.showModal(modal);
        }
        else if (interaction.customId === 'jtc_kick') {
            const select = new UserSelectMenuBuilder().setCustomId('jtc_select_kick').setPlaceholder('Select user to kick...').setMaxValues(1);
            await interaction.reply({ content: 'Select user to kick from voice:', components: [new ActionRowBuilder().addComponents(select)], flags: 64 });
        }
        else if (interaction.customId === 'jtc_ban') {
            const select = new UserSelectMenuBuilder().setCustomId('jtc_select_ban').setPlaceholder('Select user to block...').setMaxValues(1);
            await interaction.reply({ content: 'Select user to block from room:', components: [new ActionRowBuilder().addComponents(select)], flags: 64 });
        }
        else if (interaction.customId === 'jtc_info') {
            const embed = new EmbedBuilder().setColor('#5865F2').setTitle('ℹ️ Room Info').setDescription(`**Owner:** <@${jtcData.ownerId}>\n**Created:** <t:${Math.floor(new Date(jtcData.createdAt).getTime()/1000)}:R>`);
            await interaction.reply({ embeds: [embed], flags: 64 });
        }

        // --- MODAL & SELECT ---
        else if (interaction.isModalSubmit() && interaction.customId === 'jtc_modal_rename') {
            const name = interaction.fields.getTextInputValue('name');
            await channel.setName(name).catch(e => interaction.reply({ content: '❌ Rate limited or invalid name.', flags: 64 }));
            if (!interaction.replied) await interaction.reply({ content: `✅ Renamed to **${name}**.`, flags: 64 });
        }
        else if (interaction.isUserSelectMenu()) {
            const targetId = interaction.values[0];
            const targetMember = await interaction.guild.members.fetch(targetId);

            if (interaction.customId === 'jtc_select_kick') {
                if (targetMember.voice.channelId === channel.id) {
                    await targetMember.voice.disconnect();
                    await interaction.update({ content: `👢 Kicked ${targetMember.user.tag}.`, components: [] });
                } else {
                    await interaction.update({ content: '❌ User is not in this channel.', components: [] });
                }
            }
            else if (interaction.customId === 'jtc_select_ban') {
                await channel.permissionOverwrites.edit(targetId, { Connect: false });
                if (targetMember.voice.channelId === channel.id) await targetMember.voice.disconnect();
                await interaction.update({ content: `🚫 Blocked ${targetMember.user.tag} from this room.`, components: [] });
            }
        }
    },
};