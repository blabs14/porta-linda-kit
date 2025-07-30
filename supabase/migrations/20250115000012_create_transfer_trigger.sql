-- Trigger para lidar com transações de transferência
-- Quando uma transação do tipo 'transferencia' é criada, 
-- automaticamente cria uma transação correspondente na conta de destino

CREATE OR REPLACE FUNCTION handle_transfer_transaction()
RETURNS TRIGGER AS $$
DECLARE
    transfer_description TEXT;
    destination_account_id TEXT;
BEGIN
    -- Só processar se for uma transação de transferência
    IF NEW.tipo = 'transferencia' THEN
        -- Extrair o ID da conta de destino da descrição
        -- Formato esperado: "Transferência de ContaA → ContaB"
        transfer_description := NEW.descricao;
        
        -- Buscar a conta de destino baseada na descrição
        -- Por enquanto, vamos usar uma abordagem simples
        -- Em uma implementação mais robusta, poderíamos usar um campo adicional
        
        -- Para esta implementação, vamos assumir que a transferência
        -- é sempre entre duas contas do mesmo utilizador
        -- e criar uma transação de crédito na conta de destino
        
        -- Buscar outra conta do mesmo utilizador (excluindo a conta de origem)
        SELECT id INTO destination_account_id
        FROM accounts 
        WHERE user_id = NEW.user_id 
        AND id != NEW.account_id
        LIMIT 1;
        
        -- Se encontrou uma conta de destino, criar a transação correspondente
        IF destination_account_id IS NOT NULL THEN
            INSERT INTO transactions (
                account_id,
                categoria_id,
                tipo,
                valor,
                descricao,
                data,
                user_id,
                family_id
            ) VALUES (
                destination_account_id,
                NEW.categoria_id,
                'receita', -- Crédito na conta de destino
                NEW.valor,
                'Transferência recebida - ' || transfer_description,
                NEW.data,
                NEW.user_id,
                NEW.family_id
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar o trigger
DROP TRIGGER IF EXISTS transfer_transaction_trigger ON transactions;
CREATE TRIGGER transfer_transaction_trigger
    AFTER INSERT ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION handle_transfer_transaction();

-- Comentário explicativo
COMMENT ON FUNCTION handle_transfer_transaction() IS 
'Função que automaticamente cria uma transação de crédito na conta de destino quando uma transferência é criada'; 