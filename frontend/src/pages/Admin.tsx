import { useEffect, useMemo, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api';
import { Navigate } from 'react-router-dom';

interface Company {
  id: number;
  name: string;
  sector: string;
  address?: string;
  website?: string;
  phone?: string;
  email: string;
}

export default function Admin() {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    sector: '',
    address: '',
    website: '',
    phone: '',
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ show: boolean; companyId?: number; companyName?: string }>({ show: false });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [query, setQuery] = useState('');
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    sector: '',
    address: '',
    website: '',
    phone: '',
  });

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const data = await apiFetch<Array<{
        id: number;
        name: string;
        industry?: string | null;
        location?: string | null;
        website?: string | null;
        email?: string | null;
        phone?: string | null;
        admin?: string | null;
      }>>('/api/admin/companies');

      setCompanies(
        (Array.isArray(data) ? data : []).map((company) => ({
          id: company.id,
          name: company.name,
          sector: company.industry || '—',
          address: company.location || '—',
          website: company.website || '',
          phone: company.phone || '',
          email: company.email || company.admin || '—',
        }))
      );
    } catch (error) {
      console.error('Erreur fetch companies:', error);
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  if (user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleAddCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiFetch('/api/admin/companies', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          role: 'company',
          industry: form.sector,
          location: form.address,
          website: form.website,
          phone: form.phone,
        }),
      });
      setMessage({ type: 'success', text: 'Entreprise ajoutée avec succès !' });
      setForm({ name: '', email: '', password: '', sector: '', address: '', website: '', phone: '' });
      fetchCompanies();
    } catch (err) {
      const messageText = err instanceof Error ? err.message : 'Erreur lors de l’ajout';
      setMessage({ type: 'error', text: messageText });
    } finally {
      setSubmitting(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleDeleteCompany = async (id: number) => {
    try {
      await apiFetch(`/api/admin/companies/${id}`, { method: 'DELETE' });
      setMessage({ type: 'success', text: 'Entreprise supprimée !' });
      fetchCompanies();
    } catch (err) {
      const messageText = err instanceof Error ? err.message : 'Impossible de supprimer';
      setMessage({ type: 'error', text: messageText });
    } finally {
      setConfirmDelete({ show: false });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const openEditCompany = (company: Company) => {
    setEditingCompany(company);
    setEditForm({
      name: company.name || '',
      email: company.email || '',
      sector: company.sector || '',
      address: company.address || '',
      website: company.website || '',
      phone: company.phone || '',
    });
    setIsEditOpen(true);
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const handleUpdateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompany) return;

    try {
      await apiFetch(`/api/admin/companies/${editingCompany.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: editForm.name,
          email: editForm.email,
          industry: editForm.sector,
          location: editForm.address,
          website: editForm.website,
          phone: editForm.phone,
        }),
      });
      setMessage({ type: 'success', text: 'Entreprise modifiée avec succès !' });
      setIsEditOpen(false);
      setEditingCompany(null);
      fetchCompanies();
    } catch (err) {
      const messageText = err instanceof Error ? err.message : 'Erreur lors de la modification';
      setMessage({ type: 'error', text: messageText });
    } finally {
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const filteredCompanies = useMemo(() => {
    const lowerQuery = query.toLowerCase();
    return companies.filter((company) =>
      [company.name, company.email, company.sector, company.address]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(lowerQuery))
    );
  }, [companies, query]);

  return (
    <MainLayout title="Administration des entreprises" subtitle="Gestion des entreprises">
      <div className="space-y-6">
        {message && (
          <Card className={message.type === 'error' ? 'border-destructive' : 'border-success'}>
            <CardContent className={message.type === 'error' ? 'text-destructive' : 'text-success'}>
              {message.text}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-6 space-y-4">
            <h2 className="text-lg font-semibold">Ajouter une entreprise</h2>
            <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleAddCompany}>
              <Input type="text" name="name" placeholder="Nom de l'entreprise" value={form.name} onChange={handleChange} required />
              <Input type="email" name="email" placeholder="Email" value={form.email} onChange={handleChange} required />
              <Input type="password" name="password" placeholder="Mot de passe" value={form.password} onChange={handleChange} required />
              <Input type="text" name="sector" placeholder="Secteur" value={form.sector} onChange={handleChange} />
              <Input type="text" name="address" placeholder="Adresse" value={form.address} onChange={handleChange} />
              <Input type="text" name="website" placeholder="Site Web" value={form.website} onChange={handleChange} />
              <Input type="text" name="phone" placeholder="Téléphone" value={form.phone} onChange={handleChange} />
              <div className="md:col-span-2 flex gap-2">
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Ajout...' : "Ajouter l'entreprise"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setForm({ name: '', email: '', password: '', sector: '', address: '', website: '', phone: '' })}
                >
                  Réinitialiser
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <h2 className="text-lg font-semibold">Liste des entreprises</h2>
              <div className="flex items-center gap-3">
                <Input
                  type="text"
                  placeholder="Rechercher une entreprise..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-64"
                />
                <span className="text-sm text-muted-foreground">
                  {filteredCompanies.length} entreprise(s)
                </span>
              </div>
            </div>

            {loading ? (
              <p className="text-sm text-muted-foreground">Chargement...</p>
            ) : filteredCompanies.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune entreprise trouvée.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b">
                      <th className="py-2">Nom</th>
                      <th className="py-2">Email</th>
                      <th className="py-2">Secteur</th>
                      <th className="py-2">Adresse</th>
                      <th className="py-2">Site Web</th>
                      <th className="py-2">Téléphone</th>
                      <th className="py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCompanies.map((company) => (
                      <tr key={company.id} className="border-b last:border-0">
                        <td className="py-2 font-medium">{company.name}</td>
                        <td className="py-2">
                          {company.email ? (
                            <a href={`mailto:${company.email}`} className="text-accent underline">
                              {company.email}
                            </a>
                          ) : '—'}
                        </td>
                        <td className="py-2">{company.sector || '—'}</td>
                        <td className="py-2">{company.address || '—'}</td>
                        <td className="py-2">
                          {company.website ? (
                            <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-accent underline">
                              {company.website}
                            </a>
                          ) : '—'}
                        </td>
                        <td className="py-2">{company.phone || '—'}</td>
                        <td className="py-2">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setConfirmDelete({ show: true, companyId: company.id, companyName: company.name })}
                          >
                            Supprimer
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="ml-2"
                            onClick={() => openEditCompany(company)}
                          >
                            Modifier
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={confirmDelete.show} onOpenChange={(open) => setConfirmDelete({ show: open })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmation</DialogTitle>
          </DialogHeader>
          <p>
            Voulez-vous vraiment supprimer <strong>{confirmDelete.companyName}</strong> ?
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setConfirmDelete({ show: false })}>Non</Button>
            <Button
              variant="destructive"
              onClick={() => confirmDelete.companyId && handleDeleteCompany(confirmDelete.companyId)}
            >
              Oui
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Modifier l'entreprise</DialogTitle>
          </DialogHeader>
          <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleUpdateCompany}>
            <Input type="text" name="name" placeholder="Nom" value={editForm.name} onChange={handleEditChange} required />
            <Input type="email" name="email" placeholder="Email" value={editForm.email} onChange={handleEditChange} required />
            <Input type="text" name="sector" placeholder="Secteur" value={editForm.sector} onChange={handleEditChange} />
            <Input type="text" name="address" placeholder="Adresse" value={editForm.address} onChange={handleEditChange} />
            <Input type="text" name="website" placeholder="Site Web" value={editForm.website} onChange={handleEditChange} />
            <Input type="text" name="phone" placeholder="Téléphone" value={editForm.phone} onChange={handleEditChange} />
            <div className="md:col-span-2 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>Annuler</Button>
              <Button type="submit">Enregistrer</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
