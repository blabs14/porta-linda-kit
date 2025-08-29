import { useContext } from 'react';
import { ActiveContractContext } from '../contexts/ActiveContractContext';

export const useActiveContract = () => {
  const context = useContext(ActiveContractContext);
  if (!context) {
    throw new Error('useActiveContract deve ser usado dentro de ActiveContractProvider');
  }
  return context;
};