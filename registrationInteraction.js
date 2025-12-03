// events/registrationInteraction.js - FIXED ID CONFLICT
const { Events, EmbedBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, PermissionsBitField } = require('discord.js');
const db = require('../utils/database');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (!interaction.customId) return;

        // 1. FORMU AÇ (Butona Basınca)
        if (interaction.isButton() && interaction.customId.startsWith('reg_btn_')) {
            const targetId = interaction.customId.split('_')[2];
            
            const settings = await db.getRegistrationSettings(interaction.guild.id);
            const config = settings?.interactive || {};
            const staffRoles = config.staffRoles || [];

            let targetMember;
            try { targetMember = await interaction.guild.members.fetch(targetId); } catch { return interaction.reply({ content: '❌ User left.', flags: 64 }); }

            if (config.registeredRoleId && targetMember.roles.cache.has(config.registeredRoleId)) {
                return interaction.reply({ content: `❌ **${targetMember.user.tag}** is already registered!`, flags: 64 });
            }

            let isAuthorized = false;
            if (interaction.user.id === targetId && config.allowSelfRegister) isAuthorized = true; 
            if (interaction.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) isAuthorized = true; 
            if (staffRoles.some(roleId => interaction.member.roles.cache.has(roleId))) isAuthorized = true; 

            if (!isAuthorized) return interaction.reply({ content: '❌ Not authorized.', flags: 64 });

            // --- DEĞİŞİKLİK BURADA: ID 'reg_form_' OLARAK GÜNCELLENDİ ---
            const modal = new ModalBuilder().setCustomId(`reg_form_${targetId}`).setTitle(`Register User`);
            
            const nameInput = new TextInputBuilder().setCustomId('reg_name').setLabel('Name').setStyle(TextInputStyle.Short).setValue(targetMember.user.username).setRequired(true);
            const isAgeRequired = config.requireAge !== false; 
            const ageInput = new TextInputBuilder().setCustomId('reg_age').setLabel(isAgeRequired ? 'Age (13+)' : 'Age (Optional)').setStyle(TextInputStyle.Short).setRequired(isAgeRequired);

            modal.addComponents(new ActionRowBuilder().addComponents(nameInput), new ActionRowBuilder().addComponents(ageInput));
            await interaction.showModal(modal);
        }

        // 2. FORMU İŞLE (Modal Gönderilince)
        // --- DEĞİŞİKLİK BURADA: SADECE 'reg_form_' İLE BAŞLAYANLARI AL ---
        else if (interaction.isModalSubmit() && interaction.customId.startsWith('reg_form_')) {
            await interaction.deferReply({ flags: 64 });
            
            const targetId = interaction.customId.split('_')[2];
            // ... (Geri kalan kodlar aynı) ...
            const name = interaction.fields.getTextInputValue('reg_name');
            const ageStr = interaction.fields.getTextInputValue('reg_age');

            try {
                if (ageStr) {
                    const age = parseInt(ageStr);
                    if (isNaN(age)) return interaction.editReply({ content: '❌ Age must be a number!' });
                    if (age < 13) return interaction.editReply({ content: '❌ Age must be 13+.' });
                }

                const targetMember = await interaction.guild.members.fetch(targetId);
                const settings = await db.getRegistrationSettings(interaction.guild.id);
                const config = settings.interactive || {};

                if (config.registeredRoleId && targetMember.roles.cache.has(config.registeredRoleId)) return interaction.editReply({ content: '❌ User already registered!' });

                const guildData = await db.getGuildSettings(interaction.guild.id);
                const regCount = (guildData.registrationCount || 0) + 1;
                
                let newName = config.nameFormat || '{user} | {age}';
                newName = newName.replace('{user}', name).replace('{count}', regCount);
                if (ageStr) newName = newName.replace('{age}', ageStr);
                else newName = newName.replace(' | {age}', '').replace('{age}', '');

                if (config.enableTag && config.tagSymbol) {
                    newName = `${config.tagSymbol} ${newName}`;
                }

                await targetMember.setNickname(newName.substring(0, 32)).catch(e => console.log('Nick error:', e.message));

                if (config.registeredRoleId) await targetMember.roles.add(config.registeredRoleId);
                if (config.unregisteredRoleId) await targetMember.roles.remove(config.unregisteredRoleId);

                await db.saveGuildSettings(interaction.guild.id, { registrationCount: regCount });

                await interaction.editReply({ content: `✅ Registered **${targetMember.user.tag}** as \`${newName}\`.` });

                if (config.logChannelId) {
                    const logChannel = interaction.guild.channels.cache.get(config.logChannelId);
                    if (logChannel) {
                        const logEmbed = new EmbedBuilder().setColor('#57F287').setTitle('📝 User Registered').setDescription(`${targetMember} registered by ${interaction.user}.`).addFields({ name: 'Name', value: `\`${newName}\``, inline: true }, { name: 'Age', value: ageStr || '-', inline: true }).setTimestamp();
                        await logChannel.send({ embeds: [logEmbed] });
                    }
                }

                if (config.chatChannelId) {
                    const chatChannel = interaction.guild.channels.cache.get(config.chatChannelId);
                    if (chatChannel) {
                        const welcomeEmbed = new EmbedBuilder()
                            .setColor('Random')
                            .setAuthor({ name: `${targetMember.user.tag} has joined!`, iconURL: targetMember.user.displayAvatarURL() })
                            .setDescription(`🎉 Welcome **${targetMember}** to **${interaction.guild.name}**!`)
                            .setThumbnail(targetMember.user.displayAvatarURL({ dynamic: true }))
                            .addFields({ name: 'Member Count', value: `${interaction.guild.memberCount}`, inline: true })
                            .setTimestamp();
                        await chatChannel.send({ content: `👋 Welcome ${targetMember}!`, embeds: [welcomeEmbed] });
                    }
                }

            } catch (error) {
                console.error(error);
                await interaction.editReply({ content: `❌ Error: ${error.message}` });
            }
        }
    }
};