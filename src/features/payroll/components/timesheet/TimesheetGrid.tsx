import React from 'react';

interface TimesheetGridProps {
  // Placeholder: iremos alinhar com WeeklyTimesheetForm existentes
  children?: React.ReactNode;
}

export function TimesheetGrid({ children }: TimesheetGridProps) {
  // Nesta fase inicial, manteremos como contentor para integrar progressivamente o JSX da grelha
  return <div role="grid" aria-label="Grelha de horas da semana">{children}</div>;
}