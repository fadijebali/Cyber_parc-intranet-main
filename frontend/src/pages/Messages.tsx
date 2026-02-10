import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Send,
  Paperclip,
  Smile,
  MoreVertical,
  Phone,
  Video,
  Info,
  Check,
  CheckCheck,
  Circle,
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/utils';

interface Message {
  id: number;
  senderId: string;
  content: string;
  time: string;
  status: 'sent' | 'delivered' | 'read';
}

interface Conversation {
  id: number;
  name: string;
  avatar: string;
  lastMessage: string;
  time: string;
  unread: number;
  online: boolean;
  messages: Message[];
}
interface Company {
  id: number;
  name: string;
  logo?: string | null;
}

interface DbMessage {
  id: number;
  senderCompanyId: number;
  receiverCompanyId: number;
  content: string;
  createdAt: string;
  senderName: string;
  receiverName: string;
}

export default function Messages() {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [messages, setMessages] = useState<DbMessage[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [adminCompanyId, setAdminCompanyId] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentCompanyId = typeof user?.companyId === 'number' ? user.companyId : Number(user?.companyId);
  const isAdmin = user?.role === 'admin';
  const effectiveCompanyId = currentCompanyId || adminCompanyId;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [selectedConversation?.messages]);

  useEffect(() => {
    let isMounted = true;

    const loadCompanies = async () => {
      try {
        const companiesData = await apiFetch<Company[]>('/api/companies');

        if (!isMounted) return;

        setCompanies(companiesData);
        if (isAdmin && !adminCompanyId && companiesData.length) {
          const adminCompany = companiesData.find((company) => company.name.toLowerCase() === 'admin');
          setAdminCompanyId(adminCompany ? adminCompany.id : companiesData[0].id);
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

  useEffect(() => {
    if (!effectiveCompanyId) return;

    let isMounted = true;

    const loadMessages = async () => {
      try {
        const messagesData = await apiFetch<DbMessage[]>(`/api/messages?companyId=${effectiveCompanyId}`);

        if (!isMounted) return;

        setMessages(messagesData);
      } catch (error) {
        console.error('Failed to load messages', error);
      }
    };

    loadMessages();

    return () => {
      isMounted = false;
    };
  }, [effectiveCompanyId]);

  useEffect(() => {
    if (!effectiveCompanyId) return;

    const otherCompanies = companies.filter((company) => company.id !== effectiveCompanyId);

    const nextConversations = otherCompanies.map((company) => {
      const convoMessageRecords = messages.filter(
        (message) =>
          (message.senderCompanyId === effectiveCompanyId && message.receiverCompanyId === company.id) ||
          (message.receiverCompanyId === effectiveCompanyId && message.senderCompanyId === company.id)
      );

      const convoMessages = convoMessageRecords
        .filter(
          () => true
        )
        .map((message) => ({
          id: message.id,
          senderId: message.senderCompanyId === effectiveCompanyId ? 'me' : 'other',
          content: message.content,
          time: new Date(message.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
          status: 'read' as const,
        }));

      const lastRecord = convoMessageRecords[convoMessageRecords.length - 1];
      const last = convoMessages[convoMessages.length - 1];

      return {
        id: company.id,
        name: company.name,
        avatar: '',
        lastMessage: last?.content || 'Aucun message',
        time: lastRecord
          ? new Date(lastRecord.createdAt).toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit' })
          : '',
        unread: 0,
        online: false,
        messages: convoMessages,
      };
    });

    setConversations(nextConversations);
    if (!selectedConversation && nextConversations.length) {
      setSelectedConversation(nextConversations[0]);
    }
  }, [companies, messages, effectiveCompanyId, selectedConversation]);

  useEffect(() => {
    if (!selectedConversation) return;
    const updated = conversations.find((conv) => conv.id === selectedConversation.id);
    if (updated && updated.messages.length !== selectedConversation.messages.length) {
      setSelectedConversation(updated);
    }
  }, [conversations, selectedConversation]);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedConversation || !effectiveCompanyId) return;

    const content = newMessage;
    const optimisticId = -Date.now();
    const optimisticMessage: DbMessage = {
      id: optimisticId,
      senderCompanyId: effectiveCompanyId,
      receiverCompanyId: selectedConversation.id,
      content,
      createdAt: new Date().toISOString(),
      senderName: user?.companyName || 'Moi',
      receiverName: selectedConversation.name,
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setNewMessage('');

    apiFetch<DbMessage>('/api/messages', {
      method: 'POST',
      body: JSON.stringify({
        senderCompanyId: effectiveCompanyId,
        receiverCompanyId: selectedConversation.id,
        content,
      }),
    })
      .then((created) => {
        setMessages((prev) =>
          prev.map((item) =>
            item.id === optimisticId
              ? {
                  ...created,
                  senderName: user?.companyName || 'Moi',
                  receiverName: selectedConversation.name,
                }
              : item
          )
        );
      })
      .catch((error) => {
        console.error('Failed to send message', error);
        setMessages((prev) => prev.filter((item) => item.id !== optimisticId));
      });
  };

  const filteredConversations = conversations.filter(conv =>
    conv.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!effectiveCompanyId && !isAdmin) {
    return (
      <MainLayout title="Messages" subtitle="Vos conversations privées">
        <Card>
          <CardContent className="p-6 text-muted-foreground">
            Cette fonctionnalité est disponible pour les comptes entreprise.
          </CardContent>
        </Card>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Messages" subtitle="Vos conversations privées">
      {isAdmin && (
        <Card className="mb-4">
          <CardContent className="p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Mode admin</p>
              <p className="text-xs text-muted-foreground">Choisissez une entreprise pour gérer ses messages.</p>
            </div>
            <Select
              value={adminCompanyId ? String(adminCompanyId) : ''}
              onValueChange={(value) => setAdminCompanyId(Number(value))}
            >
              <SelectTrigger className="w-full sm:w-[280px]">
                <SelectValue placeholder="Sélectionner une entreprise" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={String(company.id)}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}
      <div className="h-[calc(100vh-180px)] flex gap-4">
        {/* Conversations List */}
        <Card className="w-80 shrink-0 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2">
              {filteredConversations.map((conversation) => (
                <motion.button
                  key={conversation.id}
                  onClick={() => setSelectedConversation(conversation)}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left',
                    selectedConversation?.id === conversation.id
                      ? 'bg-accent/10'
                      : 'hover:bg-muted'
                  )}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <div className="relative">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={conversation.avatar} />
                      <AvatarFallback className="bg-primary/10 text-primary font-medium">
                        {getInitials(conversation.name)}
                      </AvatarFallback>
                    </Avatar>
                    {conversation.online && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-success rounded-full border-2 border-card" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-foreground truncate">
                        {conversation.name}
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {conversation.time}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground truncate">
                        {conversation.lastMessage}
                      </span>
                      {conversation.unread > 0 && (
                        <span className="shrink-0 w-5 h-5 bg-accent text-accent-foreground text-xs font-bold rounded-full flex items-center justify-center">
                          {conversation.unread}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          </ScrollArea>
        </Card>

        {/* Chat Area */}
        <Card className="flex-1 flex flex-col overflow-hidden">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={selectedConversation.avatar} />
                      <AvatarFallback className="bg-primary/10 text-primary font-medium">
                        {getInitials(selectedConversation.name)}
                      </AvatarFallback>
                    </Avatar>
                    {selectedConversation.online && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-success rounded-full border-2 border-card" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{selectedConversation.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {selectedConversation.online ? 'En ligne' : 'Hors ligne'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="text-muted-foreground">
                    <Phone className="w-5 h-5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-muted-foreground">
                    <Video className="w-5 h-5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-muted-foreground">
                    <Info className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  <AnimatePresence>
                    {selectedConversation.messages.map((message, index) => (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.02 }}
                        className={cn(
                          'flex',
                          message.senderId === 'me' ? 'justify-end' : 'justify-start'
                        )}
                      >
                        <div
                          className={cn(
                            'message-bubble',
                            message.senderId === 'me'
                              ? 'message-bubble-sent'
                              : 'message-bubble-received'
                          )}
                        >
                          <p className="text-sm">{message.content}</p>
                          <div className={cn(
                            'flex items-center gap-1 mt-1',
                            message.senderId === 'me' ? 'justify-end' : 'justify-start'
                          )}>
                            <span className="text-xs opacity-70">{message.time}</span>
                            {message.senderId === 'me' && (
                              message.status === 'read' ? (
                                <CheckCheck className="w-3 h-3 text-accent-foreground" />
                              ) : message.status === 'delivered' ? (
                                <CheckCheck className="w-3 h-3 opacity-70" />
                              ) : (
                                <Check className="w-3 h-3 opacity-70" />
                              )
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Message Input */}
              <div className="p-4 border-t border-border">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="text-muted-foreground shrink-0">
                    <Paperclip className="w-5 h-5" />
                  </Button>
                  <Input
                    placeholder="Écrire un message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    className="flex-1"
                  />
                  <Button variant="ghost" size="icon" className="text-muted-foreground shrink-0">
                    <Smile className="w-5 h-5" />
                  </Button>
                  <Button 
                    onClick={handleSendMessage}
                    className="bg-accent hover:bg-accent/90 text-accent-foreground shrink-0"
                    disabled={!newMessage.trim()}
                  >
                    <Send className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Circle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Sélectionnez une conversation
                </h3>
                <p className="text-muted-foreground">
                  Choisissez une conversation pour commencer à discuter
                </p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </MainLayout>
  );
}
