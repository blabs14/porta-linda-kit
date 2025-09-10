# Seletor de Contrato Sincronizado

## Visão Geral

O `SyncedContractSelector` é um componente que permite criar seletores de contrato sincronizados em toda a aplicação. Todos os seletores usam o contexto global `ActiveContractContext` para manter a sincronização automática.

## Como Usar

### 1. Importar o Componente

```tsx
import { SyncedContractSelector } from '../components/SyncedContractSelector';
```

### 2. Substituir Divs por Seletores Sincronizados

#### Antes (div estática):
```tsx
<div className="flex items-center gap-2">
  <FileText className="h-4 w-4" />
  <span>Contrato: {contractName}</span>
</div>
```

#### Depois (seletor sincronizado):
```tsx
<SyncedContractSelector
  variant="compact"
  showLabel={false}
  className="flex items-center gap-2"
/>
```

### 3. Variantes Disponíveis

#### Default (completa)
```tsx
<SyncedContractSelector
  variant="default"
  showLabel={true}
  placeholder="Selecione um contrato"
/>
```

#### Compact (compacta)
```tsx
<SyncedContractSelector
  variant="compact"
  showLabel={false}
/>
```

#### Minimal (apenas texto)
```tsx
<SyncedContractSelector
  variant="minimal"
  showLabel={false}
/>
```

## Exemplo Prático

No `PayrollConfigPage.tsx`, foram implementados dois seletores sincronizados:

1. **Seletor Principal** (linha ~403):
```tsx
<SyncedContractSelector
  showLabel={true}
  variant="default"
  placeholder="Selecione um contrato"
/>
```

2. **Seletor Secundário** (linha ~424):
```tsx
<SyncedContractSelector
  variant="compact"
  showLabel={false}
  className="text-blue-800"
/>
```

## Sincronização Automática

Quando um utilizador seleciona um contrato em qualquer seletor:

1. O contexto `ActiveContractContext` é atualizado
2. Todos os outros seletores são automaticamente sincronizados
3. O localStorage e URL são atualizados
4. Uma notificação toast é exibida

## Props Disponíveis

| Prop | Tipo | Default | Descrição |
|------|------|---------|----------|
| `className` | `string` | - | Classes CSS adicionais |
| `variant` | `'default' \| 'compact' \| 'minimal'` | `'default'` | Variante do layout |
| `showLabel` | `boolean` | `true` | Mostrar label do campo |
| `placeholder` | `string` | - | Texto placeholder |
| `disabled` | `boolean` | `false` | Desabilitar seletor |

## Estados do Componente

### Loading
Exibe um skeleton animado enquanto carrega os contratos.

### Sem Contratos
Exibe uma mensagem informativa quando não há contratos ativos.

### Um Contrato (Minimal)
Na variante `minimal`, se houver apenas um contrato, exibe apenas o nome sem seletor.

### Múltiplos Contratos
Exibe o seletor completo com todos os contratos ativos disponíveis.

## Acessibilidade

- Labels apropriados para screen readers
- Navegação por teclado
- Estados de foco visíveis
- Descrições ARIA adequadas

## Integração com Contexto

O componente integra-se automaticamente com:

- `ActiveContractContext` - gestão global do contrato ativo
- `useActiveContract` - hook para acesso ao contexto
- Sistema de notificações toast
- Internacionalização (i18n)

## Exemplo de Migração Completa

### Antes:
```tsx
const [selectedContract, setSelectedContract] = useState(null);

// Div estática
<div className="contract-info">
  <span>Contrato: {selectedContract?.name}</span>
</div>

// Select manual
<Select value={selectedContract?.id} onValueChange={handleChange}>
  <SelectTrigger>
    <SelectValue placeholder="Selecione" />
  </SelectTrigger>
  <SelectContent>
    {contracts.map(contract => (
      <SelectItem key={contract.id} value={contract.id}>
        {contract.name}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

### Depois:
```tsx
// Remove estado local - usa contexto global

// Seletor sincronizado
<SyncedContractSelector
  variant="minimal"
  className="contract-info"
/>

// Seletor sincronizado
<SyncedContractSelector
  variant="default"
  placeholder="Selecione"
/>
```

## Benefícios

1. **Sincronização Automática**: Todos os seletores ficam em sincronia
2. **Menos Código**: Remove a necessidade de gestão manual de estado
3. **Consistência**: Interface uniforme em toda a aplicação
4. **Persistência**: Estado mantido no localStorage e URL
5. **Acessibilidade**: Componente otimizado para todos os utilizadores
6. **Performance**: Reutilização eficiente do contexto global