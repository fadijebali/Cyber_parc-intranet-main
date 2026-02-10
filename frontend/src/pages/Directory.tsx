import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Filter,
  Grid,
  List,
  MapPin,
  Globe,
  Mail,
  Phone,
  Building2,
  ExternalLink,
  MessageSquare,
  ChevronDown,
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/utils';

const sectors = [
  'Tous les secteurs',
  'Tech & IT',
  'FinTech',
  'HealthTech',
  'GreenTech',
  'Data & IA',
  'Événementiel',
  'Consulting',
  'Marketing Digital',
];

interface Company {
  id: number;
  name: string;
  logo?: string | null;
  sector: string;
  description: string;
  email: string;
  phone: string;
  website: string;
  location: string;
  founded?: string | null;
  employees?: string | number | null;
  status?: string | null;
}

export default function Directory() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSector, setSelectedSector] = useState('Tous les secteurs');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadCompanies = async () => {
      try {
        const data = await apiFetch<Array<{
          id: number;
          name: string;
          industry?: string | null;
          location?: string | null;
          website?: string | null;
          email?: string | null;
          phone?: string | null;
          status?: string | null;
          description?: string | null;
          employees?: number | null;
        }>>('/api/companies');

        if (!isMounted) return;

        setCompanies(
          data.map((company) => ({
            id: company.id,
            name: company.name,
            logo: '',
            sector: company.industry || company.location || 'Autre',
            description: company.description || 'Description non disponible.',
            email: company.email || '—',
            phone: company.phone || '—',
            website: company.website || '—',
            location: company.location || '—',
            founded: null,
            employees: company.employees ?? '—',
            status: company.status || 'active',
          }))
        );
      } catch (error) {
        console.error('Failed to load companies', error);
      }
    };

    loadCompanies();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredCompanies = companies.filter(company => {
    const matchesSearch = company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         company.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSector = selectedSector === 'Tous les secteurs' || company.sector === selectedSector;
    return matchesSearch && matchesSector;
  });

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getSectorColor = (sector: string) => {
    switch (sector) {
      case 'Tech & IT': return 'bg-info/10 text-info border-info/20';
      case 'FinTech': return 'bg-success/10 text-success border-success/20';
      case 'HealthTech': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'GreenTech': return 'bg-success/10 text-success border-success/20';
      case 'Data & IA': return 'bg-accent/10 text-accent border-accent/20';
      case 'Événementiel': return 'bg-warning/10 text-warning border-warning/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <MainLayout title="Annuaire" subtitle="Découvrez les entreprises du Cyber Parc">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher une entreprise..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Select value={selectedSector} onValueChange={setSelectedSector}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Secteur" />
            </SelectTrigger>
            <SelectContent>
              {sectors.map((sector) => (
                <SelectItem key={sector} value={sector}>
                  {sector}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex border border-border rounded-lg overflow-hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewMode('grid')}
              className={cn('rounded-none', viewMode === 'grid' && 'bg-muted')}
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewMode('list')}
              className={cn('rounded-none', viewMode === 'list' && 'bg-muted')}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground mb-4">
        {filteredCompanies.length} entreprise{filteredCompanies.length !== 1 ? 's' : ''} trouvée{filteredCompanies.length !== 1 ? 's' : ''}
      </p>

      {/* Companies Grid/List */}
      <div className={cn(
        'gap-4',
        viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'space-y-4'
      )}>
        {filteredCompanies.map((company, index) => (
          <motion.div
            key={company.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card 
              className="hover-lift cursor-pointer group"
              onClick={() => setSelectedCompany(company)}
            >
              <CardContent className={cn('p-6', viewMode === 'list' && 'flex gap-6 items-start')}>
                <div className={cn(viewMode === 'list' && 'flex items-center gap-4 shrink-0')}>
                  <Avatar className={cn(
                    'border-2 border-border',
                    viewMode === 'grid' ? 'w-16 h-16 mb-4' : 'w-14 h-14'
                  )}>
                    <AvatarImage src={company.logo} />
                    <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
                      {getInitials(company.name)}
                    </AvatarFallback>
                  </Avatar>
                  {viewMode === 'list' && (
                    <div>
                      <h3 className="font-semibold text-lg text-foreground group-hover:text-accent transition-colors">
                        {company.name}
                      </h3>
                      <Badge variant="outline" className={cn('mt-1', getSectorColor(company.sector))}>
                        {company.sector}
                      </Badge>
                    </div>
                  )}
                </div>

                <div className={cn('flex-1', viewMode === 'list' && 'min-w-0')}>
                  {viewMode === 'grid' && (
                    <>
                      <h3 className="font-semibold text-lg text-foreground mb-1 group-hover:text-accent transition-colors">
                        {company.name}
                      </h3>
                      <Badge variant="outline" className={cn('mb-3', getSectorColor(company.sector))}>
                        {company.sector}
                      </Badge>
                    </>
                  )}

                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                    {company.description}
                  </p>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="w-4 h-4 shrink-0" />
                      <span className="truncate">{company.location}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="w-4 h-4 shrink-0" />
                      <span className="truncate">{company.email}</span>
                    </div>
                  </div>
                </div>

                {viewMode === 'list' && (
                  <div className="flex gap-2 shrink-0">
                    <Button variant="outline" size="sm" className="gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Message
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2">
                      <ExternalLink className="w-4 h-4" />
                      Profil
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {filteredCompanies.length === 0 && (
        <Card className="p-12 text-center">
          <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Aucune entreprise trouvée</h3>
          <p className="text-muted-foreground">Essayez de modifier vos critères de recherche</p>
        </Card>
      )}

      {/* Company Detail Dialog */}
      <Dialog open={!!selectedCompany} onOpenChange={() => setSelectedCompany(null)}>
        <DialogContent className="max-w-2xl">
          {selectedCompany && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-4">
                  <Avatar className="w-16 h-16 border-2 border-border">
                    <AvatarImage src={selectedCompany.logo} />
                    <AvatarFallback className="bg-primary/10 text-primary font-bold text-xl">
                      {getInitials(selectedCompany.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <DialogTitle className="text-xl">{selectedCompany.name}</DialogTitle>
                    <Badge variant="outline" className={cn('mt-2', getSectorColor(selectedCompany.sector))}>
                      {selectedCompany.sector}
                    </Badge>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                <div>
                  <h4 className="font-medium text-foreground mb-2">À propos</h4>
                  <p className="text-muted-foreground">{selectedCompany.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span>{selectedCompany.location}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span>{selectedCompany.email}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span>{selectedCompany.phone}</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm">
                      <Globe className="w-4 h-4 text-muted-foreground" />
                      <span>{selectedCompany.website}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      <span>Fondée en {selectedCompany.founded}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-muted-foreground">{selectedCompany.employees} employés</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button className="flex-1 gap-2 bg-accent hover:bg-accent/90 text-accent-foreground">
                    <MessageSquare className="w-4 h-4" />
                    Envoyer un message
                  </Button>
                  <Button variant="outline" className="flex-1 gap-2">
                    <ExternalLink className="w-4 h-4" />
                    Visiter le site
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
