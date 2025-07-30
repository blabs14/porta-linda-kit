-- Adicionar campos para suportar transferências com uma única transação
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS is_transfer BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS transfer_destination_account_id TEXT,
ADD COLUMN IF NOT EXISTS transfer_amount DECIMAL(10,2);

-- Adicionar constraint para garantir que transfer_destination_account_id é válido
ALTER TABLE transactions 
ADD CONSTRAINT fk_transfer_destination_account 
FOREIGN KEY (transfer_destination_account_id) 
REFERENCES accounts(id) ON DELETE SET NULL;

-- Criar índice para melhorar performance de consultas de transferências
CREATE INDEX IF NOT EXISTS idx_transactions_is_transfer 
ON transactions(is_transfer);

-- Comentário explicativo
COMMENT ON COLUMN transactions.is_transfer IS 'Indica se esta transação é parte de uma transferência';
COMMENT ON COLUMN transactions.transfer_destination_account_id IS 'ID da conta de destino para transferências';
COMMENT ON COLUMN transactions.transfer_amount IS 'Valor da transferência (sempre positivo)'; 