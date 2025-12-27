'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { User, LogOut, Search, } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { useState } from 'react';

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [isHovering, setIsHovering] = useState(false);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const navItems = [
    { name: 'Search', href: '/', icon: Search },
    { name: 'Dashboard', href: '/shortlist', icon: Search },
  ];

  // Check if we're on the home/prompt page (no sidebar)
  const isPromptPage = pathname === '/';
  const headerLeftClass = isPromptPage ? 'left-0' : 'left-64';

  return (
    <motion.div
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={`fixed top-0 ${headerLeftClass} right-0 bg-white/80 backdrop-blur-xl border-b border-gray-200/50 z-30 shadow-sm`}
    >
      <div className="px-8 py-4">
        <div className="flex items-center justify-between">
          {/* Logo with animated gradient */}
          <Link href="/">
            <motion.div
              className="flex items-center space-x-2 cursor-pointer"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div>
                <span className="text-2xl bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
                  neuraleap hire
                </span>
              </div>
            </motion.div>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center space-x-2">
            {navItems.map((item, index) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <motion.div
                  key={item.name}
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 + 0.2 }}
                >
                  <Link href={item.href}>
                    <motion.div
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      className={`relative px-4 py-2 rounded-xl font-medium text-sm transition-all duration-200 flex items-center gap-2 ${isActive
                        ? 'bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-lg shadow-violet-500/30'
                        : 'text-gray-600 hover:bg-violet-50 hover:text-violet-600'
                        }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.name}</span>

                      {/* Active indicator */}
                      {isActive && (
                        <motion.div
                          layoutId="activeTab"
                          className="absolute inset-0 bg-gradient-to-r from-violet-500 to-purple-500 rounded-xl -z-10"
                          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                        />
                      )}
                    </motion.div>
                  </Link>
                </motion.div>
              );
            })}
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-3">
            {/* User Info Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              whileHover={{ scale: 1.03 }}
              className="flex items-center space-x-3 bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl px-4 py-2 border border-violet-100 shadow-sm"
              onMouseEnter={() => setIsHovering(true)}
              onMouseLeave={() => setIsHovering(false)}
            >
              <motion.div
                animate={{
                  scale: isHovering ? [1, 1.1, 1] : 1,
                  rotate: isHovering ? [0, 5, -5, 0] : 0,
                }}
                transition={{ duration: 0.5 }}
                className="relative"
              >
                <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                  <User className="w-4 h-4 text-white" />
                </div>
                {/* Online indicator */}
                <motion.div
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [1, 0.7, 1],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                  }}
                  className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-white"
                />
              </motion.div>

              <div className="flex flex-col">
                <span className="text-sm font-semibold text-gray-800">
                  {user?.username || 'User'}
                </span>
                <span className="text-xs text-gray-500">Recruiter</span>
              </div>
            </motion.div>

            {/* Logout Button */}
            <motion.button
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              onClick={handleLogout}
              whileHover={{ scale: 1.1, rotate: 5 }}
              whileTap={{ scale: 0.9 }}
              className="w-10 h-10 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl flex items-center justify-center hover:from-red-50 hover:to-red-100 transition-all duration-300 shadow-sm hover:shadow-md border border-gray-200 hover:border-red-200 group"
              title="Logout"
            >
              <LogOut className="w-4 h-4 text-gray-600 group-hover:text-red-600 transition-colors" />
            </motion.button>
          </div>
        </div>
      </div>

      {/* Animated gradient line at bottom */}
      <motion.div
        className="h-0.5 bg-gradient-to-r from-transparent via-violet-500 to-transparent"
        animate={{
          x: ['-100%', '100%'],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
    </motion.div>
  );
}