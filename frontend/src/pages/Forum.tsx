import { useEffect, useState } from 'react';
import {
  Search,
  Filter,
  Plus,
  MessageSquare,
  Clock,
  TrendingUp,
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/utils';

const categories = [
  { id: 'all', label: 'Tous' },
  { id: 'announcements', label: 'Annonces' },
  { id: 'opportunities', label: 'Opportunités' },
  { id: 'events', label: 'Événements' },
  { id: 'questions', label: 'Questions' },
];

interface ForumPost {
  id: number;
  author: { name: string; avatar: string; role: string; isAdmin: boolean };
  title: string;
  content: string;
  category: string;
  time: string;
  likes: number;
  comments: number;
  isPinned: boolean;
  liked: boolean;
}

interface ForumComment {
  id: number;
  content: string;
  createdAt: string;
  company: string;
  companyId: number;
}

interface Company {
  id: number;
  name: string;
}

export default function Forum() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isNewPostOpen, setIsNewPostOpen] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostCategory, setNewPostCategory] = useState('announcements');
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [activePostId, setActivePostId] = useState<number | null>(null);
  const [commentsByPost, setCommentsByPost] = useState<Record<number, ForumComment[]>>({});
  const [commentsLoading, setCommentsLoading] = useState<Record<number, boolean>>({});
  const [commentsError, setCommentsError] = useState<Record<number, string>>({});
  const [companies, setCompanies] = useState<Company[]>([]);
  const [adminCompanyId, setAdminCompanyId] = useState<number | null>(null);

  const isAdmin = user?.role === 'admin';
  const userCompanyId = typeof user?.companyId === 'number' ? user.companyId : Number(user?.companyId);
  const effectiveCompanyId = isAdmin ? adminCompanyId : (Number.isFinite(userCompanyId) ? userCompanyId : null);

  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         post.author.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || post.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const sortedPosts = [...filteredPosts].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return 0;
  });

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

  const handleDelete = (postId: number) => {
    apiFetch(`/api/forum/posts/${postId}`, { method: 'DELETE' })
      .then(() => loadPosts())
      .catch((error) => {
        console.error('Failed to delete post', error);
        const message = error instanceof Error ? error.message : 'Erreur lors de la suppression.';
        toast({
          title: 'Suppression impossible',
          description: message || 'Erreur lors de la suppression.',
          variant: 'destructive',
        });
      });
  };

  const loadPosts = async () => {
    try {
      setIsLoading(true);
      setLoadError('');
      const data = await apiFetch<Array<{
        id: number;
        title: string;
        content: string;
        category?: string | null;
        createdAt: string;
        company: string;
        comments: number;
      }>>('/api/forum/posts');

      setPosts(
        data.map((post) => ({
          id: post.id,
          author: { name: post.company, avatar: '', role: 'Entreprise', isAdmin: false },
          title: post.title,
          content: post.content,
          category: post.category || 'announcements',
          time: new Date(post.createdAt).toLocaleString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
            day: '2-digit',
            month: 'short',
          }),
          likes: 0,
          comments: post.comments ?? 0,
          isPinned: false,
          liked: false,
        }))
      );
    } catch (error) {
      console.error('Failed to load forum posts', error);
      const message = error instanceof Error ? error.message : 'Erreur lors du chargement.';
      setLoadError(message || 'Erreur lors du chargement.');
      toast({
        title: 'Chargement impossible',
        description: message || 'Erreur lors du chargement.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  useEffect(() => {
    if (!isAdmin) return;

    let isMounted = true;

    const loadCompanies = async () => {
      try {
        const data = await apiFetch<Company[]>('/api/companies');
        if (!isMounted) return;
        setCompanies(data);
        if (!adminCompanyId && data.length) {
          setAdminCompanyId(data[0].id);
        }
      } catch (error) {
        console.error('Failed to load companies', error);
      }
    };

    loadCompanies();

    return () => {
      isMounted = false;
    };
  }, [isAdmin, adminCompanyId]);

  const loadComments = async (postId: number) => {
    try {
      setCommentsLoading((prev) => ({ ...prev, [postId]: true }));
      setCommentsError((prev) => ({ ...prev, [postId]: '' }));
      const data = await apiFetch<ForumComment[]>(`/api/forum/posts/${postId}/comments`);
      setCommentsByPost((prev) => ({ ...prev, [postId]: data }));
    } catch (error) {
      console.error('Failed to load comments', error);
      const message = error instanceof Error ? error.message : 'Erreur lors du chargement.';
      setCommentsError((prev) => ({ ...prev, [postId]: message }));
      toast({
        title: 'Chargement impossible',
        description: message || 'Erreur lors du chargement.',
        variant: 'destructive',
      });
    } finally {
      setCommentsLoading((prev) => ({ ...prev, [postId]: false }));
    }
  };

  const openComments = (postId: number) => {
    setActivePostId(postId);
    if (!commentsByPost[postId]) {
      loadComments(postId);
    }
  };


  const handleNewPost = async () => {
    if (!newPostTitle.trim() || !newPostContent.trim()) return;
    if (!effectiveCompanyId) {
      toast({
        title: 'Publication impossible',
        description: isAdmin ? 'Choisissez une entreprise pour publier.' : 'Votre compte doit être lié à une entreprise pour publier.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await apiFetch('/api/forum/posts', {
        method: 'POST',
        body: JSON.stringify({
          title: newPostTitle,
          content: newPostContent,
          category: newPostCategory,
          companyId: effectiveCompanyId,
          userId: user.id,
        }),
      });

      await loadPosts();
      setNewPostTitle('');
      setNewPostContent('');
      setIsNewPostOpen(false);
    } catch (error) {
      console.error('Failed to create forum post', error);
      const message = error instanceof Error ? error.message : 'Erreur lors de la publication.';
      toast({
        title: 'Erreur de publication',
        description: message || 'Erreur lors de la publication.',
        variant: 'destructive',
      });
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatTimestamp = (value: string) =>
    new Date(value).toLocaleString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: 'short',
    });

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'announcements': return 'bg-info/10 text-info border-info/20';
      case 'opportunities': return 'bg-success/10 text-success border-success/20';
      case 'events': return 'bg-warning/10 text-warning border-warning/20';
      case 'questions': return 'bg-accent/10 text-accent border-accent/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getCategoryLabel = (category: string) => {
    const cat = categories.find(c => c.id === category);
    return cat?.label || category;
  };

  const categoryCounts = posts.reduce<Record<string, number>>((acc, post) => {
    acc[post.category] = (acc[post.category] || 0) + 1;
    return acc;
  }, {});
  const totalCount = posts.length;
  const activePost = posts.find((post) => post.id === activePostId) || null;

  return (
    <MainLayout title="Forum" subtitle="Espace d’échange interactif et collaboratif">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher dans le forum..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <Select
              value={adminCompanyId ? String(adminCompanyId) : ''}
              onValueChange={(value) => setAdminCompanyId(Number(value))}
            >
              <SelectTrigger className="w-[240px]">
                <SelectValue placeholder="Entreprise" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={String(company.id)}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button variant="outline" className="gap-2">
            <Filter className="w-4 h-4" />
            Filtres
          </Button>
          <Dialog open={isNewPostOpen} onOpenChange={setIsNewPostOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-accent hover:bg-accent/90 text-accent-foreground">
                <Plus className="w-4 h-4" />
                Nouveau post
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Créer une nouvelle publication</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Catégorie</Label>
                  <Tabs value={newPostCategory} onValueChange={setNewPostCategory}>
                    <TabsList className="w-full grid grid-cols-4">
                      <TabsTrigger value="announcements">Annonce</TabsTrigger>
                      <TabsTrigger value="opportunities">Opportunité</TabsTrigger>
                      <TabsTrigger value="events">Événement</TabsTrigger>
                      <TabsTrigger value="questions">Question</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="post-title">Titre</Label>
                  <Input
                    id="post-title"
                    placeholder="Titre de votre publication"
                    value={newPostTitle}
                    onChange={(e) => setNewPostTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="post-content">Contenu</Label>
                  <Textarea
                    id="post-content"
                    placeholder="Partagez votre message..."
                    value={newPostContent}
                    onChange={(e) => setNewPostContent(e.target.value)}
                    className="min-h-[200px]"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsNewPostOpen(false)}>
                    Annuler
                  </Button>
                  <Button 
                    onClick={handleNewPost}
                    className="bg-accent hover:bg-accent/90 text-accent-foreground"
                    disabled={!newPostTitle.trim() || !newPostContent.trim() || !user?.companyId}
                  >
                    Publier
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4 text-sm text-muted-foreground leading-relaxed">
          Le forum est un espace d’échange interactif permettant aux utilisateurs de communiquer,
          de partager des informations et de poser des questions autour de différents sujets. Il
          favorise la collaboration entre les membres grâce à des discussions organisées en thèmes
          et en conversations. Chaque utilisateur peut publier des messages, répondre aux
          interventions des autres et suivre l’évolution des échanges en temps réel. Le forum
          constitue ainsi un outil essentiel de communication, de partage de connaissances et de
          renforcement de la communauté.
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardContent className="p-4">
          <h3 className="text-base font-semibold text-foreground mb-2">Discussions</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Lancez une conversation, échangez des informations et suivez les réponses en temps réel.
          </p>
          <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
            <li>Thèmes organisés pour mieux retrouver les échanges</li>
            <li>Réponses rapides pour favoriser la collaboration</li>
            <li>Suivi des conversations actives</li>
          </ul>
        </CardContent>
      </Card>

      {/* Categories */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
        {categories.map((category) => (
          <Button
            key={category.id}
            variant={selectedCategory === category.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(category.id)}
            className={cn(
              'shrink-0 gap-2',
              selectedCategory === category.id && 'bg-accent text-accent-foreground'
            )}
          >
            {category.label}
            <Badge variant="secondary" className="bg-background/20 text-inherit">
              {category.id === 'all' ? totalCount : (categoryCounts[category.id] || 0)}
            </Badge>
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="px-4 py-3 border-b text-sm font-medium text-foreground">Discussions</div>
            <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
              {isLoading && (
                <div className="p-6 text-center">
                  <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Chargement...</p>
                </div>
              )}

              {!isLoading && loadError && (
                <div className="p-6 text-center">
                  <TrendingUp className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground mb-3">{loadError}</p>
                  <Button variant="outline" onClick={loadPosts}>Réessayer</Button>
                </div>
              )}

              {!isLoading && !loadError && sortedPosts.length === 0 && (
                <div className="p-6 text-center">
                  <MessageSquare className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Aucune discussion</p>
                </div>
              )}

              {!isLoading && !loadError && sortedPosts.map((post) => (
                <button
                  key={post.id}
                  type="button"
                  onClick={() => openComments(post.id)}
                  className={cn(
                    'w-full text-left px-4 py-3 border-b border-border/60 hover:bg-muted/60 transition-colors',
                    activePostId === post.id && 'bg-muted'
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {getInitials(post.author.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{post.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{post.author.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-muted-foreground">{post.time}</p>
                      <p className="text-[11px] text-muted-foreground">{post.comments} msg</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardContent className="p-0">
            {!activePost && (
              <div className="p-10 text-center text-muted-foreground">
                Sélectionnez une discussion pour afficher les messages.
              </div>
            )}

            {activePost && (
              <div className="flex flex-col h-full">
                <div className="px-6 py-4 border-b border-border">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">{activePost.title}</h3>
                      <p className="text-sm text-muted-foreground">{activePost.author.name} • {activePost.time}</p>
                    </div>
                    <Badge variant="outline" className={getCategoryColor(activePost.category)}>
                      {getCategoryLabel(activePost.category)}
                    </Badge>
                  </div>
                  <p className="text-sm text-foreground/80 mt-3 whitespace-pre-wrap">
                    {activePost.content}
                  </p>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                  {commentsLoading[activePost.id] && (
                    <div className="text-sm text-muted-foreground">Chargement des commentaires...</div>
                  )}

                  {!commentsLoading[activePost.id] && commentsError[activePost.id] && (
                    <div className="text-sm text-destructive">{commentsError[activePost.id]}</div>
                  )}

                  {!commentsLoading[activePost.id] && !commentsError[activePost.id] &&
                    (commentsByPost[activePost.id]?.length ? (
                      commentsByPost[activePost.id].map((comment) => (
                        <div key={comment.id} className="flex items-start gap-3">
                          <Avatar className="w-9 h-9 shrink-0">
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {getInitials(comment.company)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-foreground">
                                {comment.company}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {formatTimestamp(comment.createdAt)}
                              </span>
                            </div>
                            <p className="text-sm text-foreground/90 whitespace-pre-wrap">{comment.content}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-muted-foreground">Aucun commentaire pour le moment.</div>
                    ))}
                </div>

              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
