import { useState } from 'react';
import AccountList, { Account } from '../components/AccountList';
import AccountForm, { AccountFormData } from '../components/AccountForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Button } from '../components/ui/button';

const AccountsPage = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editAccount, setEditAccount] = useState<Account | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleNew = () => {
    setEditAccount(null);
    setModalOpen(true);
  };

  const handleEdit = (account: Account) => {
    setEditAccount(account);
    setModalOpen(true);
  };

  const handleSuccess = () => {
    setModalOpen(false);
    setEditAccount(null);
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">Contas</h1>
        <Button onClick={handleNew} className="w-full sm:w-auto">Nova Conta</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="col-span-1">
          <AccountList key={refreshKey} onEdit={handleEdit} />
        </div>
      </div>
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editAccount ? 'Editar Conta' : 'Nova Conta'}</DialogTitle>
          </DialogHeader>
          <AccountForm
            initialData={editAccount ? { ...editAccount } : undefined}
            onSuccess={handleSuccess}
            onCancel={() => setModalOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AccountsPage; 