"use client";

import { useState, useEffect } from "react";
import { 
  BarChart3, 
  Users, 
  Server, 
  MessageSquare,
  Shield,
  Settings as SettingsIcon,
  Bell,
  Zap,
  TrendingUp,
  Cpu,
  HardDrive,
  Network,
  Bot as BotIcon
} from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalGuilds: 125,
    totalUsers: 12500,
    dailyMessages: 24567,
    commandUsage: 1245,
    modActions: 89,
    uptime: "99.8%",
    ping: 42,
    cpu: 15,
    memory: 320
  });

  const [recentActivities] = useState([
    { id: 1, action: "Sunucu eklendi", guild: "Gaming Community", time: "2 dakika önce" },
    { id: 2, action: "Komut kullanıldı", guild: "Developer Hub", time: "5 dakika önce" },
    { id: 3, action: "Moderasyon eylemi", guild: "Music Lovers", time: "10 dakika önce" },
    { id: 4, action: "Yeni üye katıldı", guild: "Anime Fans", time: "15 dakika önce" },
  ]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <BotIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Netrcol Dashboard</h1>
                <p className="text-sm text-gray-600">Gerçek zamanlı bot yönetimi</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <button className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg">
                <Bell className="h-5 w-5" />
              </button>
              
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full"></div>
                <div>
                  <p className="text-sm font-medium">Admin</p>
                  <p className="text-xs text-gray-500">Çevrimiçi</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex">
        {/* Sidebar */}
        <div className="hidden md:block w-64 bg-white border-r border-gray-200 min-h-[calc(100vh-73px)] p-4">
          <nav className="space-y-1">
            <Link href="/dashboard" className="flex items-center gap-3 px-4 py-3 bg-blue-50 text-blue-700 rounded-lg font-medium">
              <BarChart3 className="h-5 w-5" />
              <span>Dashboard</span>
            </Link>
            
            <Link href="/dashboard/guilds" className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg">
              <Server className="h-5 w-5" />
              <span>Sunucular</span>
              <span className="ml-auto bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full">125</span>
            </Link>
            
            <Link href="/dashboard/users" className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg">
              <Users className="h-5 w-5" />
              <span>Kullanıcılar</span>
            </Link>
            
            <Link href="/dashboard/moderation" className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg">
              <Shield className="h-5 w-5" />
              <span>Moderasyon</span>
            </Link>
            
            <Link href="/dashboard/settings" className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg">
              <SettingsIcon className="h-5 w-5" />
              <span>Ayarlar</span>
            </Link>
          </nav>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 p-6">
          {/* Welcome Banner */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-6 text-white mb-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-2">Hoş Geldiniz!</h2>
                <p className="opacity-90">Netrcol Bot aktif olarak 125 sunucuda hizmet veriyor.</p>
              </div>
              <div className="flex items-center gap-2 mt-4 md:mt-0">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span>Bot Çevrimiçi</span>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Toplam Sunucu</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{stats.totalGuilds}</p>
                </div>
                <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                  <Server className="h-6 w-6" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Toplam Kullanıcı</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{stats.totalUsers.toLocaleString()}</p>
                </div>
                <div className="p-3 rounded-full bg-green-100 text-green-600">
                  <Users className="h-6 w-6" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Günlük Mesaj</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{stats.dailyMessages.toLocaleString()}</p>
                </div>
                <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                  <MessageSquare className="h-6 w-6" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Moderasyon</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{stats.modActions}</p>
                </div>
                <div className="p-3 rounded-full bg-red-100 text-red-600">
                  <Shield className="h-6 w-6" />
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Son Aktiviteler</h3>
            </div>
            <div className="divide-y">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="p-4 hover:bg-gray-50 transition">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{activity.action}</p>
                      <p className="text-sm text-gray-600">{activity.guild}</p>
                    </div>
                    <span className="text-sm text-gray-500">{activity.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}