const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const os = require('os');
const db = require('../../utils/database');
const performanceMonitor = require('../../utils/performanceMonitor');
const rateLimiter = require('../../utils/rateLimiter');

// Komut kullanım istatistiklerini takip etmek için
const commandStats = new Map();
let totalCommands = 0;

// Komut kullanımını takip etmek için fonksiyon
function trackCommandUsage(commandName) {
    totalCommands++;
    const currentCount = commandStats.get(commandName) || 0;
    commandStats.set(commandName, currentCount + 1);
}

// İstatistikleri topla
async function collectStats(client, detailed = false) {
    const guilds = client.guilds.cache;
    const users = client.users.cache;
    
    // Sistem bilgileri
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    const uptime = process.uptime();
    
    // Performans metrikleri
    const perfMetrics = performanceMonitor.getMetrics();
    const rateLimitStats = rateLimiter.getSystemStats();
    
    // Database istatistikleri
    const dbStats = await getDatabaseStats();
    
    // Komut istatistikleri
    const topCommands = Array.from(commandStats.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ 
            name, 
            count, 
            percentage: totalCommands > 0 ? ((count / totalCommands) * 100).toFixed(1) : '0.0' 
        }));

    return {
        general: {
            guilds: guilds.size,
            users: users.size,
            channels: client.channels.cache.size,
            emojis: client.emojis.cache.size,
            uptime: uptime
        },
        performance: {
            memory: {
                rss: memoryUsage.rss,
                heapUsed: memoryUsage.heapUsed,
                heapTotal: memoryUsage.heapTotal,
                external: memoryUsage.external
            },
            cpu: cpuUsage,
            wsPing: client.ws.ping,
            platform: os.platform(),
            arch: os.arch(),
            nodeVersion: process.version
        },
        commands: {
            total: totalCommands,
            top: topCommands,
            unique: commandStats.size
        },
        database: dbStats,
        rateLimiting: rateLimitStats,
        detailed: detailed ? await getDetailedStats(client) : null
    };
}

// Database istatistikleri
async function getDatabaseStats() {
    try {
        const dbHealth = await db.healthCheck();
        
        // Ticket istatistikleri
        let ticketStats = {
            totalTickets: 0,
            openTickets: 0,
            todayTickets: 0,
            closedTickets: 0
        };

        try {
            const stats = await db.getTicketStats('global');
            if (stats) {
                ticketStats = stats;
            }
        } catch (error) {
            console.log('Ticket stats not available:', error.message);
        }

        return {
            status: dbHealth.status,
            database: dbHealth.database,
            collections: await getCollectionCounts(),
            tickets: ticketStats
        };
    } catch (error) {
        return { 
            status: 'error', 
            error: error.message,
            collections: {},
            tickets: {
                totalTickets: 0,
                openTickets: 0,
                todayTickets: 0,
                closedTickets: 0
            }
        };
    }
}

// Koleksiyon sayılarını al
async function getCollectionCounts() {
    try {
        const collections = ['guild_settings', 'ticket_settings', 'ticket_categories', 'ticket_channels', 'activity_logs'];
        const counts = {};
        
        for (const coll of collections) {
            try {
                counts[coll] = await db.db.collection(coll).countDocuments();
            } catch (e) {
                counts[coll] = 0;
            }
        }
        
        return counts;
    } catch (error) {
        return {};
    }
}

// Detaylı istatistikler
async function getDetailedStats(client) {
    const guilds = client.guilds.cache;
    
    // Sunucu dağılımı
    const guildSizes = Array.from(guilds.values()).map(guild => ({
        name: guild.name,
        members: guild.memberCount,
        channels: guild.channels.cache.size,
        created: guild.createdAt
    })).sort((a, b) => b.members - a.members).slice(0, 10);

    // Performans geçmişi
    const perfHistory = performanceMonitor.getPerformanceHistory();

    return {
        topGuilds: guildSizes,
        performanceHistory: perfHistory,
        shardInfo: client.ws.shard || { id: 0, count: 1 },
        eventStats: performanceMonitor.getEventStats()
    };
}

// Embed oluştur
function createStatsEmbed(stats, detailed = false) {
    const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('🤖 Detaylı Bot İstatistikleri')
        .setTimestamp();

    if (!detailed) {
        // Temel istatistikler
        embed.setDescription('Aşağıda botun temel istatistikleri bulunmaktadır:')
            .addFields(
                { 
                    name: '🌐 Genel Bilgiler', 
                    value: `**Sunucular:** ${stats.general.guilds}\n**Kullanıcılar:** ${stats.general.users.toLocaleString()}\n**Kanallar:** ${stats.general.channels}\n**Çalışma Süresi:** ${formatUptime(stats.general.uptime)}`,
                    inline: true 
                },
                { 
                    name: '⚡ Performans', 
                    value: `**Bellek:** ${(stats.performance.memory.heapUsed / 1024 / 1024).toFixed(2)} MB\n**Ping:** ${Math.round(stats.performance.wsPing)}ms\n**Platform:** ${stats.performance.platform}\n**Node.js:** ${stats.performance.nodeVersion}`,
                    inline: true 
                },
                { 
                    name: '📊 Komutlar', 
                    value: `**Toplam:** ${stats.commands.total.toLocaleString()}\n**Benzersiz:** ${stats.commands.unique}\n**Discord.js:** v${require('discord.js').version}`,
                    inline: true 
                }
            );

        // En çok kullanılan komutlar
        if (stats.commands.top.length > 0) {
            const topCommandsText = stats.commands.top.map(cmd => 
                `**${cmd.name}:** ${cmd.count.toLocaleString()} (${cmd.percentage}%)`
            ).join('\n');
            
            embed.addFields({
                name: '🏆 En Çok Kullanılan Komutlar',
                value: topCommandsText || 'Henüz veri yok',
                inline: false
            });
        }

        // Database durumu
        if (stats.database && stats.database.status) {
            embed.addFields({
                name: '🗃️ Database',
                value: `**Durum:** ${stats.database.status}\n**Ticketlar:** ${stats.database.tickets.totalTickets.toLocaleString()}`,
                inline: true
            });
        }

    } else {
        // Detaylı istatistikler
        embed.setDescription('**Detaylı Bot İstatistikleri ve Performans Metrikleri**')
            .addFields(
                {
                    name: '🌐 Genel Bilgiler',
                    value: `**Sunucular:** ${stats.general.guilds}\n**Kullanıcılar:** ${stats.general.users.toLocaleString()}\n**Kanallar:** ${stats.general.channels}\n**Emojiler:** ${stats.general.emojis}`,
                    inline: true
                },
                {
                    name: '⚡ Performans',
                    value: `**Bellek:** ${(stats.performance.memory.heapUsed / 1024 / 1024).toFixed(2)} MB\n**Ping:** ${Math.round(stats.performance.wsPing)}ms\n**Uptime:** ${formatUptime(stats.general.uptime)}`,
                    inline: true
                },
                {
                    name: '📊 Komutlar',
                    value: `**Toplam:** ${stats.commands.total.toLocaleString()}\n**Benzersiz:** ${stats.commands.unique}\n**Ortalama:** ${(stats.commands.total / (stats.general.uptime / 3600)).toFixed(2)}/saat`,
                    inline: true
                }
            );

        // Database detayları
        if (stats.database) {
            embed.addFields(
                {
                    name: '🗃️ Database',
                    value: `**Durum:** ${stats.database.status}\n**Toplam Ticket:** ${stats.database.tickets.totalTickets.toLocaleString()}\n**Açık Ticket:** ${stats.database.tickets.openTickets}`,
                    inline: true
                },
                {
                    name: '🛡️ Rate Limiting',
                    value: `**Aktif Kayıt:** ${stats.rateLimiting.activeLimits}\n**Toplam Kayıt:** ${stats.rateLimiting.totalRecords}`,
                    inline: true
                },
                {
                    name: '💾 Bellek Detay',
                    value: `**RSS:** ${(stats.performance.memory.rss / 1024 / 1024).toFixed(2)} MB\n**Heap:** ${(stats.performance.memory.heapUsed / 1024 / 1024).toFixed(2)} MB\n**External:** ${(stats.performance.memory.external / 1024 / 1024).toFixed(2)} MB`,
                    inline: true
                }
            );

            // Database koleksiyonları
            if (stats.database.collections && Object.keys(stats.database.collections).length > 0) {
                const collectionsText = Object.entries(stats.database.collections)
                    .map(([name, count]) => `**${name}:** ${count.toLocaleString()}`)
                    .join('\n');
                
                embed.addFields({
                    name: '📁 Database Koleksiyonları',
                    value: collectionsText,
                    inline: false
                });
            }
        }

        // En çok kullanılan komutlar (detaylı)
        if (stats.commands.top.length > 0) {
            const topCommandsText = stats.commands.top.map(cmd => 
                `**${cmd.name}:** ${cmd.count.toLocaleString()} (${cmd.percentage}%)`
            ).join('\n');
            
            embed.addFields({
                name: '🏆 Komut İstatistikleri',
                value: topCommandsText,
                inline: false
            });
        }

        // En büyük sunucular
        if (stats.detailed && stats.detailed.topGuilds.length > 0) {
            const topGuildsText = stats.detailed.topGuilds.slice(0, 5)
                .map((guild, index) => `${index + 1}. **${guild.name}:** ${guild.members.toLocaleString()} üye`)
                .join('\n');
            
            embed.addFields({
                name: '🏅 En Büyük 5 Sunucu',
                value: topGuildsText || 'Veri yok',
                inline: false
            });
        }
    }

    // Footer
    embed.setFooter({ 
        text: `Netrcol Bot v3.2.0 • ${new Date().toLocaleDateString('tr-TR')} • ${detailed ? 'Detaylı Görünüm' : 'Temel Görünüm'}` 
    });

    return embed;
}

// Butonları oluştur
function createActionRows() {
    const detailedButton = new ButtonBuilder()
        .setCustomId('show_detailed_stats')
        .setLabel('Detaylı İstatistikler')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('📊');

    const refreshButton = new ButtonBuilder()
        .setCustomId('refresh_stats')
        .setLabel('Yenile')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🔄');

    const actionRow = new ActionRowBuilder().addComponents(detailedButton, refreshButton);
    
    return [actionRow];
}

// Uptime formatı
function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    const parts = [];
    if (days > 0) parts.push(`${days}g`);
    if (hours > 0) parts.push(`${hours}s`);
    if (minutes > 0) parts.push(`${minutes}d`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}sn`);
    
    return parts.join(' ');
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('botstats')
        .setDescription('Detaylı bot istatistikleri ve performans metrikleri')
        .addBooleanOption(option =>
            option.setName('detailed')
                .setDescription('Detaylı istatistikleri göster')
                .setRequired(false)),
    
    async execute(interaction) {
        try {
            const showDetailed = interaction.options.getBoolean('detailed') || false;
            
            // Defer reply işlemi
            await interaction.deferReply();
            
            // İstatistikleri topla
            const stats = await collectStats(interaction.client, showDetailed);
            
            const embed = createStatsEmbed(stats, showDetailed);
            const components = showDetailed ? [] : createActionRows();

            await interaction.editReply({ 
                embeds: [embed], 
                components: components 
            });

        } catch (error) {
            console.error('Botstats error:', error);
            
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({
                    content: '❌ İstatistikler yüklenirken hata oluştu!'
                });
            } else {
                await interaction.reply({
                    content: '❌ İstatistikler yüklenirken hata oluştu!',
                    flags: 64
                });
            }
        }
    },

    // Buton işleyici fonksiyonu
    async handleButtonInteraction(interaction) {
        try {
            // Sadece orijinal komutu kullanan kişi butonlara tıklayabilir
            if (interaction.user.id !== interaction.message.interaction?.user.id) {
                return interaction.reply({
                    content: '❌ Bu butonları sadece komutu kullanan kişi kullanabilir!',
                    flags: 64
                });
            }

            // Buton türüne göre işlem
            if (interaction.customId === 'show_detailed_stats') {
                // Detaylı istatistikleri göster
                await interaction.deferUpdate();
                const stats = await collectStats(interaction.client, true);
                const embed = createStatsEmbed(stats, true);
                
                await interaction.editReply({ 
                    embeds: [embed], 
                    components: [] // Detaylı modda butonları kaldır
                });

            } else if (interaction.customId === 'refresh_stats') {
                // İstatistikleri yenile
                await interaction.deferUpdate();
                const stats = await collectStats(interaction.client, false);
                const embed = createStatsEmbed(stats, false);
                const components = createActionRows();
                
                await interaction.editReply({ 
                    embeds: [embed], 
                    components: components 
                });
            }

        } catch (error) {
            console.error('Botstats button error:', error);
            
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({
                    content: '❌ Buton işlenirken hata oluştu!'
                });
            } else {
                await interaction.reply({
                    content: '❌ Buton işlenirken hata oluştu!',
                    flags: 64
                });
            }
        }
    },

    // trackCommandUsage fonksiyonunu dışa aktar
    trackCommandUsage
};