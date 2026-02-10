import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Building2,
  Users,
  MessageSquare,
  TrendingUp,
  ArrowUpRight,
  Plus,
  Heart,
  MessageCircle,
  Share2,
  MoreHorizontal,
  Send,
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/utils';

const stats = [
  { label: 'Entreprises', value: '52', change: '+3', icon: Building2, color: 'text-accent' },
  { label: 'Messages', value: '1,234', change: '+12%', icon: MessageSquare, color: 'text-info' },
  { label: 'Membres actifs', value: '189', change: '+8%', icon: Users, color: 'text-success' },
  { label: 'Croissance', value: '+24%', change: '', icon: TrendingUp, color: 'text-warning' },
];

const forumPosts = [
  {
    id: 1,
    author: { name: 'TechStart', avatar: '', role: 'Startup Tech' },
    content: 'Nous sommes ravis d\'annoncer notre nouvelle solution de gestion cloud ! 🚀 N\'hésitez pas à nous contacter pour une démo.',
    time: 'Il y a 2 heures',
    likes: 24,
    comments: 8,
    liked: false,
  },
  {
    id: 2,
    author: { name: 'DataFlow', avatar: '', role: 'Data Analytics' },
    content: 'Qui serait intéressé par un meetup sur l\'IA et le Machine Learning le mois prochain ? On pourrait organiser ça dans les locaux du Cyber Parc.',
    time: 'Il y a 5 heures',
    likes: 42,
    comments: 15,
    liked: true,
  },
  {
    id: 3,
    author: { name: 'GreenEnergy', avatar: '', role: 'Énergie Renouvelable' },
    content: 'Félicitations à tous les participants du hackathon de la semaine dernière ! Les projets étaient vraiment impressionnants. 💚',
    time: 'Hier',
    likes: 67,
    comments: 23,
    liked: false,
  },
];

const activityFeed = [
  { id: 1, company: 'InnovateLab', action: 'a rejoint le Cyber Parc', time: 'Il y a 1h' },
  { id: 2, company: 'CloudSys', action: 'a posté une offre d\'emploi', time: 'Il y a 2h' },
  { id: 3, company: 'BioTech', action: 'a mis à jour son profil', time: 'Il y a 3h' },
  { id: 4, company: 'FinanceAI', action: 'recherche des partenaires', time: 'Il y a 4h' },
];

export default function Dashboard() {
  const { user } = useAuth();
  const [newPost, setNewPost] = useState('');
  const [posts, setPosts] = useState(forumPosts);
  const [dashboardStats, setDashboardStats] = useState(stats);
  const [dashboardActivity, setDashboardActivity] = useState(activityFeed);

  const refreshSummary = async () => {
    const data = await apiFetch<{
      stats: { users: number; companies: number; posts: number; comments: number };
      activity: Array<{ title: string; note: string; time: string; tag?: string }>;
      recentPosts: Array<{ id: number; title: string; company: string; createdAt: string }>;
    }>('/api/admin/summary');

    setDashboardStats([
      { label: 'Entreprises', value: String(data.stats.companies), change: '', icon: Building2, color: 'text-accent' },
      { label: 'Messages', value: String(data.stats.comments), change: '', icon: MessageSquare, color: 'text-info' },
      { label: 'Membres actifs', value: String(data.stats.users), change: '', icon: Users, color: 'text-success' },
      { label: 'Posts', value: String(data.stats.posts), change: '', icon: TrendingUp, color: 'text-warning' },
    ]);

    setDashboardActivity(
      data.activity.map((item, index) => ({
        id: index + 1,
        company: item.title,
        action: item.note,
        time: item.time,
      }))
    );

    if (data.recentPosts?.length) {
      setPosts(
        data.recentPosts.map((post) => ({
          id: post.id,
          author: { name: post.company, avatar: '', role: 'Entreprise' },
          content: post.title,
          time: new Date(post.createdAt).toLocaleString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
            day: '2-digit',
            month: 'short',
          }),
          likes: 0,
          comments: 0,
          liked: false,
        }))
      );
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadSummary = async () => {
      try {
        await refreshSummary();
      } catch (error) {
        if (isMounted) {
          console.error('Failed to load dashboard summary', error);
        }
      }
    };

    loadSummary();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleLike = (postId: number) => {
    setPosts(posts.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          liked: !post.liked,
          likes: post.liked ? post.likes - 1 : post.likes + 1
        };
      }
      return post;
    }));
  };

  const handlePost = async () => {
    if (!newPost.trim() || !user?.companyId) return;

    try {
      await apiFetch('/api/forum/posts', {
        method: 'POST',
        body: JSON.stringify({
          title: newPost.slice(0, 80),
          content: newPost,
          category: 'announcements',
          companyId: user.companyId,
          userId: user.id,
        }),
      });

      setNewPost('');
      await refreshSummary();
    } catch (error) {
      console.error('Failed to create dashboard post', error);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <MainLayout title="Dashboard" subtitle={`Bienvenue, ${user?.name}`}>
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {dashboardStats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="hover-lift cursor-pointer group">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={cn('p-2 rounded-lg bg-muted', stat.color)}>
                    <stat.icon className="w-5 h-5" />
                  </div>
                  {stat.change && (
                    <Badge variant="secondary" className="bg-success/10 text-success border-0">
                      {stat.change}
                    </Badge>
                  )}
                </div>
                <div>
                  <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Forum Feed */}
        <div className="lg:col-span-2 space-y-4">
          {/* New Post */}
          <Card>
            <CardContent className="p-4">
              <div className="flex gap-4">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={user?.avatar} />
                  <AvatarFallback className="bg-accent/20 text-accent">
                    {user?.name ? getInitials(user.name) : 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-3">
                  <Textarea
                    placeholder="Partagez quelque chose avec la communauté..."
                    value={newPost}
                    onChange={(e) => setNewPost(e.target.value)}
                    className="min-h-[80px] resize-none"
                  />
                  <div className="flex justify-end">
                    <Button 
                      onClick={handlePost}
                      className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2"
                      disabled={!newPost.trim()}
                    >
                      <Send className="w-4 h-4" />
                      Publier
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Posts */}
          {posts.map((post, index) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="forum-post">
                <div className="flex items-start gap-4">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={post.author.avatar} />
                    <AvatarFallback className="bg-primary/10 text-primary font-medium">
                      {getInitials(post.author.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="font-semibold text-foreground">{post.author.name}</h4>
                        <p className="text-sm text-muted-foreground">{post.author.role} • {post.time}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="text-muted-foreground">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-foreground mb-4 whitespace-pre-wrap">{post.content}</p>
                    <div className="flex items-center gap-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleLike(post.id)}
                        className={cn(
                          'gap-2 text-muted-foreground hover:text-destructive',
                          post.liked && 'text-destructive'
                        )}
                      >
                        <Heart className={cn('w-4 h-4', post.liked && 'fill-current')} />
                        {post.likes}
                      </Button>
                      <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
                        <MessageCircle className="w-4 h-4" />
                        {post.comments}
                      </Button>
                      <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
                        <Share2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Activity Feed */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-between">
                Activité récente
                <Button variant="ghost" size="sm" className="text-accent">
                  Voir tout
                  <ArrowUpRight className="w-4 h-4 ml-1" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {dashboardActivity.map((activity, index) => (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                      {getInitials(activity.company)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-medium text-foreground">{activity.company}</span>{' '}
                      <span className="text-muted-foreground">{activity.action}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                </motion.div>
              ))}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Actions rapides</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start gap-2">
                <Plus className="w-4 h-4" />
                Nouvelle publication
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2">
                <MessageSquare className="w-4 h-4" />
                Envoyer un message
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2">
                <Building2 className="w-4 h-4" />
                Modifier le profil
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
