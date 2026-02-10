import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Bell,
  Search,
  Sun,
  Moon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

const notifications = [
  { id: 1, title: 'Nouveau message', description: 'TechStart vous a envoyé un message', time: 'Il y a 5 min', unread: true },
  { id: 2, title: 'Nouvelle entreprise', description: 'DataFlow a rejoint le Cyber Parc', time: 'Il y a 1h', unread: true },
  { id: 3, title: 'Post populaire', description: 'Votre post a reçu 10 likes', time: 'Il y a 2h', unread: false },
];

export function Header({ title, subtitle }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const unreadCount = notifications.filter((n) => n.unread).length;

  return (
    <header className="h-16 bg-card/50 backdrop-blur-xl border-b border-border/50 sticky top-0 z-40">
      <div className="h-full px-6 flex items-center justify-between gap-4">
        {/* Title */}
        <div className="flex flex-col">
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xl font-bold text-foreground"
          >
            {title}
          </motion.h1>
          {subtitle && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-sm text-muted-foreground"
            >
              {subtitle}
            </motion.p>
          )}
        </div>

        {/* Search */}
        <div className="flex-1 max-w-md hidden md:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-muted/50 border-border/50 focus:bg-background transition-colors"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {user?.role && (
            <Button variant="outline" size="sm" className="gap-2 hidden sm:flex" disabled>
              <span className="capitalize">{user.role}</span>
            </Button>
          )}

          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="text-muted-foreground hover:text-foreground"
          >
            <motion.div
              initial={false}
              animate={{ rotate: theme === 'dark' ? 180 : 0 }}
              transition={{ duration: 0.3 }}
            >
              {theme === 'dark' ? (
                <Moon className="w-5 h-5" />
              ) : (
                <Sun className="w-5 h-5" />
              )}
            </motion.div>
          </Button>

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative text-muted-foreground hover:text-foreground"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-accent text-accent-foreground text-xs font-bold rounded-full flex items-center justify-center"
                  >
                    {unreadCount}
                  </motion.span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <div className="p-3 border-b border-border">
                <h3 className="font-semibold text-foreground">Notifications</h3>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.map((notification) => (
                  <DropdownMenuItem
                    key={notification.id}
                    className={cn(
                      'flex flex-col items-start gap-1 p-3 cursor-pointer',
                      notification.unread && 'bg-accent/5'
                    )}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <span className="font-medium text-foreground text-sm">
                        {notification.title}
                      </span>
                      {notification.unread && (
                        <Badge variant="secondary" className="ml-auto text-xs bg-accent/20 text-accent">
                          Nouveau
                        </Badge>
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {notification.description}
                    </span>
                    <span className="text-xs text-muted-foreground/60">
                      {notification.time}
                    </span>
                  </DropdownMenuItem>
                ))}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="p-3 justify-center text-accent font-medium">
                Voir toutes les notifications
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
