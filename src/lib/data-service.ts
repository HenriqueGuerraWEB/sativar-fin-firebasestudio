// Camada de serviço de dados para clientes
const isDbEnabled = process.env.NEXT_PUBLIC_DATABASE_ENABLED === 'true';

export async function getClients() {
  if (isDbEnabled) {
    const res = await fetch('/api/clients');
    if (!res.ok) throw new Error('Erro ao buscar clientes');
    return res.json();
  } else {
    return JSON.parse(localStorage.getItem('clients') || '[]');
  }
}

export async function addClient(clientData: any) {
  if (isDbEnabled) {
    const res = await fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(clientData),
    });
    if (!res.ok) throw new Error('Erro ao adicionar cliente');
    return res.json();
  } else {
    const clients = JSON.parse(localStorage.getItem('clients') || '[]');
    const newClient = { ...clientData, id: crypto.randomUUID(), createdAt: new Date() };
    clients.unshift(newClient);
    localStorage.setItem('clients', JSON.stringify(clients));
    return newClient;
  }
}

export async function updateClient(id: string, updates: any) {
  if (isDbEnabled) {
    const res = await fetch('/api/clients', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates }),
    });
    if (!res.ok) throw new Error('Erro ao atualizar cliente');
    return res.json();
  } else {
    const clients = JSON.parse(localStorage.getItem('clients') || '[]');
    const idx = clients.findIndex((c: any) => c.id === id);
    if (idx === -1) throw new Error('Cliente não encontrado');
    clients[idx] = { ...clients[idx], ...updates };
    localStorage.setItem('clients', JSON.stringify(clients));
    return clients[idx];
  }
}

export async function deleteClient(id: string) {
  if (isDbEnabled) {
    const res = await fetch('/api/clients', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) throw new Error('Erro ao excluir cliente');
    return res.json();
  } else {
    const clients = JSON.parse(localStorage.getItem('clients') || '[]');
    const filtered = clients.filter((c: any) => c.id !== id);
    localStorage.setItem('clients', JSON.stringify(filtered));
    return { success: true };
  }
}

