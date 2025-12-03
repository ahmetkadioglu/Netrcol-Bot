// events/giveawayEvents.js - EMBED UPDATE & PARTICIPANT LIST
const { Events, EmbedBuilder } = require('discord.js');
const db = require('../utils/database');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (!interaction.isButton()) return;

        // --- KATILMA İŞLEMİ ---
        if (interaction.customId === 'join_giveaway') {
            await interaction.deferReply({ flags: 64 });

            try {
                const giveaway = await db.getGiveaway(interaction.message.id);
                if (!giveaway || giveaway.ended) return interaction.editReply({ content: '❌ Ended.' });

                // Rol Kontrolü
                if (giveaway.requiredRoleId && !interaction.member.roles.cache.has(giveaway.requiredRoleId)) {
                    return interaction.editReply({ content: `❌ You need <@&${giveaway.requiredRoleId}> role to join!` });
                }

                // Zaten katılmış mı?
                if (giveaway.participants.includes(interaction.user.id)) {
                    return interaction.editReply({ content: '⚠️ You already joined.' });
                }

                // DB Ekleme
                await db.addParticipant(interaction.message.id, interaction.user.id);
                const newCount = giveaway.participants.length + 1;

                // --- EMBED GÜNCELLEME (SAYAÇ ARTTIRMA) ---
                const receivedEmbed = interaction.message.embeds[0];
                const newEmbed = EmbedBuilder.from(receivedEmbed);
                
                // Fields içindeki "Participants" alanını bul ve güncelle
                const fields = newEmbed.data.fields || [];
                const participantField = fields.find(f => f.name === 'Participants');
                
                if (participantField) {
                    participantField.value = newCount.toString();
                } else {
                    // Eğer yoksa ekle (Eski versiyon uyumluluğu)
                    newEmbed.addFields({ name: 'Participants', value: newCount.toString(), inline: true });
                }

                await interaction.message.edit({ embeds: [newEmbed] });
                
                await interaction.editReply({ content: '✅ Joined! Good luck! 🍀' });

            } catch (error) {
                console.error('Join error:', error);
                interaction.editReply({ content: '❌ Error joining.' });
            }
        }

        // --- KATILIMCI LİSTESİ ---
        else if (interaction.customId === 'giveaway_participants') {
            await interaction.deferReply({ flags: 64 }); // Gizli Mesaj

            try {
                const giveaway = await db.getGiveaway(interaction.message.id);
                if (!giveaway) return interaction.editReply({ content: '❌ Giveaway not found.' });

                const participants = giveaway.participants;

                if (participants.length === 0) {
                    return interaction.editReply({ content: 'Total: 0\nNo participants yet.' });
                }

                // Listeyi Hazırla (Discord mesaj limiti 4096 karakter, bu yüzden uzun listeleri kesmemiz lazım)
                const total = participants.length;
                let listString = participants.map(id => `<@${id}>`).join(', ');

                if (listString.length > 3900) {
                    listString = listString.substring(0, 3900) + `... and more (${total} total)`;
                }

                const listEmbed = new EmbedBuilder()
                    .setColor('#5865F2')
                    .setTitle(`👥 Participants (${total})`)
                    .setDescription(listString)
                    .setFooter({ text: 'List of users who joined this giveaway' })
                    .setTimestamp();

                await interaction.editReply({ embeds: [listEmbed] });

            } catch (error) {
                console.error('List error:', error);
                interaction.editReply({ content: '❌ Error fetching list.' });
            }
        }
    },
};