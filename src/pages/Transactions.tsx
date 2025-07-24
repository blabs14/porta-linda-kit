import { useState } from 'react';
import TransactionList from '../components/TransactionList';
import TransactionForm from '../components/TransactionForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Button } from '../components/ui/button';

const TransactionsPage = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editTx, setEditTx] = useState<any | null>(null);

  const handleNew = () => {
    setEditTx(null);
    setModalOpen(true);
  };
  const handleEdit = (tx: any) => {
    setEditTx(tx);
    setModalOpen(true);
  };
  const handleClose = () => {
    setModalOpen(false);
    setEditTx(null);
  };

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">Transações</h1>
        <Button onClick={handleNew} className="w-full sm:w-auto">Nova Transação</Button>
      </div>
      <div className="grid grid-cols-1 gap-4">
        <TransactionList onEdit={handleEdit} />
      </div>
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editTx ? 'Editar Transação' : 'Nova Transação'}</DialogTitle>
          </DialogHeader>
          <TransactionForm initialData={editTx || undefined} onSuccess={handleClose} onCancel={handleClose} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TransactionsPage; 