// utils/rateLimiter.js
const { Collection } = require('discord.js');
const logger = require('./logger');

class RateLimiter {
    constructor() {
        this.limits = new Collection();
        this.defaultSettings = {
            // Global rate limit settings
            global: {
                windowMs: 60000, // 1 minute
                max: 50, // 50 requests per minute
                message: '🌐 **Global Rate Limit**: Çok hızlı istek gönderiyorsunuz! Lütfen 1 dakika bekleyin.'
            },
            // Command-specific limits
            commands: {
                'ban': { windowMs: 30000, max: 3, message: '🔨 **Ban Limit**: Çok hızlı ban atıyorsunuz! 30 saniye bekleyin.' },
                'kick': { windowMs: 30000, max: 5, message: '👢 **Kick Limit**: Çok hızlı kick atıyorsunuz! 30 saniye bekleyin.' },
                'clear': { windowMs: 10000, max: 2, message: '🧹 **Clear Limit**: Mesaj temizleme çok hızlı! 10 saniye bekleyin.' },
                'timeout': { windowMs: 30000, max: 5, message: '⏰ **Timeout Limit**: Çok hızlı timeout atıyorsunuz! 30 saniye bekleyin.' },
                'ticket-setup': { windowMs: 60000, max: 1, message: '🎫 **Ticket Setup Limit**: 1 dakikada bir kurabilirsiniz!' },
                'category-add': { windowMs: 30000, max: 3, message: '📁 **Category Limit**: Çok hızlı kategori ekliyorsunuz!' },
                'logs-setup': { windowMs: 60000, max: 2, message: '📋 **Log Setup Limit**: Log sistemini sık değiştiremezsiniz!' }
            },
            // Category-based limits
            categories: {
                'moderation': { windowMs: 30000, max: 10 },
                'tickets': { windowMs: 60000, max: 8 },
                'info': { windowMs: 10000, max: 15 }
            }
        };

        // Cleanup interval (5 minutes)
        setInterval(() => this.cleanup(), 300000);
        logger.info('Rate Limiter başlatıldı');
    }

    /**
     * Rate limit kontrolü yapar
     * @param {string} userId - Kullanıcı ID
     * @param {string} type - Limit türü ('global', 'command', 'category')
     * @param {string} identifier - Komut adı veya kategori
     * @returns {Object} - Limit durumu
     */
    checkLimit(userId, type = 'global', identifier = 'global') {
        const key = `${userId}-${type}-${identifier}`;
        const now = Date.now();
        
        // Limit ayarlarını al
        const settings = this.getLimitSettings(type, identifier);
        const { windowMs, max } = settings;

        // Kullanıcı limit verilerini al veya oluştur
        let userLimit = this.limits.get(key) || {
            count: 0,
            resetTime: now + windowMs,
            firstRequest: now
        };

        // Zaman penceresi dolmuşsa sıfırla
        if (now > userLimit.resetTime) {
            userLimit = {
                count: 0,
                resetTime: now + windowMs,
                firstRequest: now
            };
        }

        // Limit kontrolü
        userLimit.count++;
        this.limits.set(key, userLimit);

        const remaining = Math.max(0, max - userLimit.count);
        const resetTime = userLimit.resetTime;
        const isLimited = userLimit.count > max;

        if (isLimited) {
            logger.warn(`Rate limit aşıldı: ${key} - ${userLimit.count}/${max}`);
        }

        return {
            limited: isLimited,
            remaining,
            resetTime,
            total: max,
            retryAfter: Math.ceil((resetTime - now) / 1000),
            message: settings.message || `⏳ **Rate Limit**: Çok hızlı işlem yapıyorsunuz! ${Math.ceil((resetTime - now) / 1000)} saniye bekleyin.`
        };
    }

    /**
     * Limit ayarlarını getirir
     */
    getLimitSettings(type, identifier) {
        switch (type) {
            case 'command':
                return this.defaultSettings.commands[identifier] || {
                    windowMs: 10000,
                    max: 5,
                    message: '⚡ **Komut Limit**: Bu komutu çok sık kullanıyorsunuz!'
                };
            case 'category':
                return this.defaultSettings.categories[identifier] || {
                    windowMs: 30000,
                    max: 10
                };
            default:
                return this.defaultSettings.global;
        }
    }

    /**
     * Komut için rate limit kontrolü (kolay kullanım)
     */
    checkCommand(userId, commandName) {
        return this.checkLimit(userId, 'command', commandName);
    }

    /**
     * Kategori için rate limit kontrolü
     */
    checkCategory(userId, categoryName) {
        return this.checkLimit(userId, 'category', categoryName);
    }

    /**
     * Global rate limit kontrolü
     */
    checkGlobal(userId) {
        return this.checkLimit(userId, 'global', 'global');
    }

    /**
     * Kapsamlı limit kontrolü (tüm seviyelerde)
     */
    checkAllLimits(userId, commandName, categoryName) {
        const globalCheck = this.checkGlobal(userId);
        const commandCheck = this.checkCommand(userId, commandName);
        const categoryCheck = this.checkCategory(userId, categoryName);

        // Öncelik sırası: command > category > global
        if (commandCheck.limited) return commandCheck;
        if (categoryCheck.limited) return categoryCheck;
        if (globalCheck.limited) return globalCheck;

        return { limited: false, remaining: Math.min(globalCheck.remaining, commandCheck.remaining, categoryCheck.remaining) };
    }

    /**
     * Limit istatistiklerini getir
     */
    getStats(userId) {
        const userLimits = Array.from(this.limits.entries())
            .filter(([key]) => key.startsWith(userId))
            .map(([key, data]) => ({
                key: key.replace(`${userId}-`, ''),
                ...data
            }));

        return {
            totalLimited: userLimits.length,
            activeLimits: userLimits.filter(limit => limit.count > 0),
            limits: userLimits
        };
    }

    /**
     * Eski limit verilerini temizle
     */
    cleanup() {
        const now = Date.now();
        let cleaned = 0;

        for (const [key, data] of this.limits.entries()) {
            // 10 dakikadan eski verileri temizle
            if (now > data.resetTime + 600000) {
                this.limits.delete(key);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            logger.debug(`Rate limiter temizlendi: ${cleaned} kayıt silindi`);
        }
    }

    /**
     * Manuel olarak limit sıfırlama (admin için)
     */
    resetLimit(userId, type = 'all', identifier = 'all') {
        if (type === 'all') {
            // Tüm limitleri temizle
            for (const [key] of this.limits.entries()) {
                if (key.startsWith(userId)) {
                    this.limits.delete(key);
                }
            }
        } else {
            const key = `${userId}-${type}-${identifier}`;
            this.limits.delete(key);
        }

        logger.info(`Limit sıfırlandı: ${userId} - ${type} - ${identifier}`);
        return true;
    }

    /**
     * Sistem istatistikleri
     */
    getSystemStats() {
        const now = Date.now();
        const activeLimits = Array.from(this.limits.values()).filter(limit => now < limit.resetTime);
        
        return {
            totalRecords: this.limits.size,
            activeLimits: activeLimits.length,
            memoryUsage: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
            topUsers: this.getTopLimitedUsers()
        };
    }

    /**
     * En çok limitlenen kullanıcılar
     */
    getTopLimitedUsers() {
        const userCounts = new Map();
        
        for (const [key, data] of this.limits.entries()) {
            if (data.count > 0) {
                const userId = key.split('-')[0];
                userCounts.set(userId, (userCounts.get(userId) || 0) + 1);
            }
        }

        return Array.from(userCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([userId, count]) => ({ userId, count }));
    }
}

module.exports = new RateLimiter();