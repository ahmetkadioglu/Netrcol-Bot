// utils/jtcManager.js - JOIN TO CREATE LOGIC
const { ChannelType, PermissionsBitField, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('./database');

class JTCManager {
    
    // Panel Gönder
    async sendControlPanel(channel) {
        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('🎛️ Room Control Panel')
            .setDescription('Use the buttons below to manage your private room.')
            .addFields(
                { name: '🔒 Lock/Unlock', value: 'Restrict access to your channel.', inline: true },
                { name: '✏️ Rename', value: 'Change the channel name.', inline: true },
                { name: '🚫 Kick/Ban', value: 'Remove unwanted users.', inline: true }
            )
            .setFooter({ text: 'Interface will verify ownership.' });

        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('jtc_lock').setLabel('Lock').setStyle(ButtonStyle.Danger).setEmoji('🔒'),
            new ButtonBuilder().setCustomId('jtc_unlock').setLabel('Unlock').setStyle(ButtonStyle.Success).setEmoji('🔓'),
            new ButtonBuilder().setCustomId('jtc_rename').setLabel('Rename').setStyle(ButtonStyle.Primary).setEmoji('✏️')
        );

        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('jtc_kick').setLabel('Kick User').setStyle(ButtonStyle.Secondary).setEmoji('👢'),
            new ButtonBuilder().setCustomId('jtc_ban').setLabel('Block User').setStyle(ButtonStyle.Danger).setEmoji('🚫'),
            new ButtonBuilder().setCustomId('jtc_info').setLabel('Info').setStyle(ButtonStyle.Secondary).setEmoji('ℹ️')
        );

        await channel.send({ embeds: [embed], components: [row1, row2] });
    }

    // Oda Oluştur
    async createPrivateRoom(member, guild, categoryId) {
        try {
            const channelName = `${member.user.username}'s Room`;
            
            const channel = await guild.channels.create({
                name: channelName,
                type: ChannelType.GuildVoice,
                parent: categoryId,
                permissionOverwrites: [
                    {
                        id: guild.roles.everyone.id,
                        allow: [PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.Speak, PermissionsBitField.Flags.ViewChannel] // Varsayılan açık
                    },
                    {
                        id: member.id,
                        allow: [PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.Speak, PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.ManageChannels, PermissionsBitField.Flags.MoveMembers]
                    }
                ]
            });

            // Kullanıcıyı taşı
            if (member.voice.channel) {
                await member.voice.setChannel(channel);
            }

            // DB'ye kaydet
            await db.addActiveJTC(channel.id, member.id, guild.id);

            // Paneli gönder (Metin mesajı olarak ses kanalına)
            // Not: Discord ses kanallarında metin özelliği (Voice Chat) açıksa çalışır.
            // Eğer hata verirse catch bloğu yakalar.
            await this.sendControlPanel(channel);

            return channel;

        } catch (error) {
            console.error('JTC Create Error:', error);
            return null;
        }
    }
}

module.exports = new JTCManager();