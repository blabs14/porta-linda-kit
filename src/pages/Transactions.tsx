import { useState, useEffect } from 'react';
import TransactionList from '../components/TransactionList';
import TransactionForm from '../components/TransactionForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { ButtonLoading } from '../components/ui/loading-states';

const TransactionsPage = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editTx, setEditTx] = useState<any | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Forçar atualização quando o modal fecha
  useEffect(() => {
    if (!modalOpen) {
      setRefreshKey(prev => prev + 1);
    }
  }, [modalOpen]);

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
    <div className="h-screen flex flex-col">
      {/* Cabeçalho Fixo - Sempre visível */}
      <div className="flex-shrink-0 bg-background border-b p-4">
        <div className="container mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <h1 className="text-2xl sm:text-3xl font-bold">Transações</h1>
            <Button onClick={handleNew} className="w-full sm:w-auto">
              Nova Transação
            </Button>
          </div>
        </div>
      </div>
      
      {/* Conteúdo com Scroll apenas nos dados */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full flex flex-col">
          <TransactionList key={refreshKey} onEdit={handleEdit} />
        </div>
      </div>
      
      <Dialog 
        open={modalOpen} 
        onOpenChange={(open) => {
          setModalOpen(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editTx ? 'Editar Transação' : 'Nova Transação'}</DialogTitle>
            <DialogDescription>
              {editTx ? 'Editar dados da transação' : 'Criar nova transação'}
            </DialogDescription>
          </DialogHeader>
          <TransactionForm 
            initialData={editTx || undefined} 
            onSuccess={() => {
              handleClose();
            }} 
            onCancel={handleClose} 
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TransactionsPage; 