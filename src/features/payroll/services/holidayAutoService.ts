// Serviço para gestão automática de feriados baseados na localização
// Integra com APIs externas e base de dados local para obter feriados regionais/municipais

import { fetchExternalApi } from '../../../services/externalApi';
import { PayrollHoliday, PayrollHolidayFormData } from '../types';
import { payrollService } from './payrollService';

// Tipos para feriados automáticos
export interface AutoHoliday {
  name: string;
  date: string;
  type: 'national' | 'regional' | 'municipal';
  region?: string;
  municipality?: string;
  description?: string;
}

export interface LocationInfo {
  municipality: string;
  district: string;
  region: string;
  country: string;
}

// Parser para extrair informação de localização do campo workplace_location
export function parseWorkplaceLocation(workplaceLocation: string): LocationInfo | null {
  if (!workplaceLocation || workplaceLocation.trim() === '') {
    return null;
  }

  const location = workplaceLocation.trim().toLowerCase();
  
  // Mapeamento de cidades principais para distritos
  const cityToDistrict: Record<string, { district: string; region: string }> = {
    // Norte
    'porto': { district: 'Porto', region: 'Norte' },
    'braga': { district: 'Braga', region: 'Norte' },
    'viana do castelo': { district: 'Viana do Castelo', region: 'Norte' },
    'vila real': { district: 'Vila Real', region: 'Norte' },
    'bragança': { district: 'Bragança', region: 'Norte' },
    'aveiro': { district: 'Aveiro', region: 'Norte' },
    
    // Centro
    'coimbra': { district: 'Coimbra', region: 'Centro' },
    'leiria': { district: 'Leiria', region: 'Centro' },
    'viseu': { district: 'Viseu', region: 'Centro' },
    'guarda': { district: 'Guarda', region: 'Centro' },
    'castelo branco': { district: 'Castelo Branco', region: 'Centro' },
    
    // Lisboa e Vale do Tejo
    'lisboa': { district: 'Lisboa', region: 'Lisboa e Vale do Tejo' },
    'setúbal': { district: 'Setúbal', region: 'Lisboa e Vale do Tejo' },
    'santarém': { district: 'Santarém', region: 'Lisboa e Vale do Tejo' },
    
    // Alentejo
    'évora': { district: 'Évora', region: 'Alentejo' },
    'beja': { district: 'Beja', region: 'Alentejo' },
    'portalegre': { district: 'Portalegre', region: 'Alentejo' },
    
    // Algarve
    'faro': { district: 'Faro', region: 'Algarve' },
    
    // Ilhas
    'funchal': { district: 'Madeira', region: 'Madeira' },
    'angra do heroísmo': { district: 'Açores', region: 'Açores' },
    'ponta delgada': { district: 'Açores', region: 'Açores' },
    'horta': { district: 'Açores', region: 'Açores' }
  };

  // Procurar correspondência direta
  for (const [city, info] of Object.entries(cityToDistrict)) {
    if (location.includes(city)) {
      return {
        municipality: city.charAt(0).toUpperCase() + city.slice(1),
        district: info.district,
        region: info.region,
        country: 'Portugal'
      };
    }
  }

  // Se não encontrar correspondência, tentar extrair pelo menos a região
  if (location.includes('lisboa') || location.includes('sintra') || location.includes('cascais')) {
    return {
      municipality: workplaceLocation,
      district: 'Lisboa',
      region: 'Lisboa e Vale do Tejo',
      country: 'Portugal'
    };
  }

  if (location.includes('porto') || location.includes('gaia') || location.includes('matosinhos')) {
    return {
      municipality: workplaceLocation,
      district: 'Porto',
      region: 'Norte',
      country: 'Portugal'
    };
  }

  // Retornar informação genérica se não conseguir identificar
  return {
    municipality: workplaceLocation,
    district: 'Desconhecido',
    region: 'Portugal',
    country: 'Portugal'
  };
}

// Base de dados local de feriados portugueses por região/município
export function getLocalHolidays(year: number, locationInfo: LocationInfo): AutoHoliday[] {
  const holidays: AutoHoliday[] = [];

  // Feriados nacionais (sempre aplicáveis)
  const nationalHolidays = [
    { name: 'Ano Novo', date: `${year}-01-01`, type: 'national' as const },
    { name: 'Dia da Liberdade', date: `${year}-04-25`, type: 'national' as const },
    { name: 'Dia do Trabalhador', date: `${year}-05-01`, type: 'national' as const },
    { name: 'Dia de Portugal', date: `${year}-06-10`, type: 'national' as const },
    { name: 'Assunção de Nossa Senhora', date: `${year}-08-15`, type: 'national' as const },
    { name: 'Implantação da República', date: `${year}-10-05`, type: 'national' as const },
    { name: 'Todos os Santos', date: `${year}-11-01`, type: 'national' as const },
    { name: 'Restauração da Independência', date: `${year}-12-01`, type: 'national' as const },
    { name: 'Imaculada Conceição', date: `${year}-12-08`, type: 'national' as const },
    { name: 'Natal', date: `${year}-12-25`, type: 'national' as const }
  ];

  holidays.push(...nationalHolidays);

  // Feriados regionais específicos
  switch (locationInfo.region) {
    case 'Madeira':
      holidays.push(
        { name: 'Dia da Região Autónoma da Madeira', date: `${year}-07-01`, type: 'regional', region: 'Madeira' },
        { name: 'Assunção de Nossa Senhora (Madeira)', date: `${year}-08-15`, type: 'regional', region: 'Madeira' }
      );
      break;
    
    case 'Açores':
      holidays.push(
        { name: 'Dia da Região Autónoma dos Açores', date: `${year}-05-20`, type: 'regional', region: 'Açores' },
        { name: 'Espírito Santo', date: `${year}-06-09`, type: 'regional', region: 'Açores' }
      );
      break;
  }

  // Feriados municipais específicos (exemplos)
  const municipalityLower = locationInfo.municipality.toLowerCase();
  
  if (municipalityLower.includes('lisboa')) {
    holidays.push({
      name: 'Santo António (Lisboa)',
      date: `${year}-06-13`,
      type: 'municipal',
      municipality: 'Lisboa',
      description: 'Feriado municipal de Lisboa'
    });
  }
  
  if (municipalityLower.includes('porto')) {
    holidays.push({
      name: 'São João (Porto)',
      date: `${year}-06-24`,
      type: 'municipal',
      municipality: 'Porto',
      description: 'Feriado municipal do Porto'
    });
  }

  if (municipalityLower.includes('braga')) {
    holidays.push({
      name: 'São João Baptista (Braga)',
      date: `${year}-06-24`,
      type: 'municipal',
      municipality: 'Braga',
      description: 'Feriado municipal de Braga'
    });
  }

  return holidays;
}

// Função para buscar feriados de API externa (placeholder para futuras integrações)
export async function fetchHolidaysFromAPI(year: number, locationInfo: LocationInfo): Promise<AutoHoliday[]> {
  try {
    // Placeholder para integração com API externa de feriados
    // Exemplo: API do governo português ou serviços como Calendarific
    
    // Por enquanto, retorna array vazio e usa apenas a base de dados local
    console.log(`Fetching holidays from external API for ${locationInfo.municipality}, ${year}`);
    
    // Exemplo de chamada para API externa (comentado até implementação real)
    /*
    const apiUrl = `https://api.feriados.pt/${year}/${locationInfo.district}`;
    const response = await fetchExternalApi(apiUrl);
    
    return response.holidays.map((holiday: any) => ({
      name: holiday.name,
      date: holiday.date,
      type: holiday.type,
      region: holiday.region,
      municipality: holiday.municipality,
      description: holiday.description
    }));
    */
    
    return [];
  } catch (error) {
    console.error('Erro ao buscar feriados da API externa:', error);
    return [];
  }
}

// Função para obter apenas feriados nacionais
export async function getNationalHolidays(year: number): Promise<AutoHoliday[]> {
  const nationalHolidays = [
    { name: 'Ano Novo', date: `${year}-01-01`, type: 'national' as const },
    { name: 'Dia da Liberdade', date: `${year}-04-25`, type: 'national' as const },
    { name: 'Dia do Trabalhador', date: `${year}-05-01`, type: 'national' as const },
    { name: 'Dia de Portugal', date: `${year}-06-10`, type: 'national' as const },
    { name: 'Assunção de Nossa Senhora', date: `${year}-08-15`, type: 'national' as const },
    { name: 'Implantação da República', date: `${year}-10-05`, type: 'national' as const },
    { name: 'Todos os Santos', date: `${year}-11-01`, type: 'national' as const },
    { name: 'Restauração da Independência', date: `${year}-12-01`, type: 'national' as const },
    { name: 'Imaculada Conceição', date: `${year}-12-08`, type: 'national' as const },
    { name: 'Natal', date: `${year}-12-25`, type: 'national' as const }
  ];

  return nationalHolidays.sort((a, b) => a.date.localeCompare(b.date));
}

// Função para obter feriados regionais e municipais baseados na localização
export async function getRegionalHolidays(year: number, workplaceLocation: string): Promise<AutoHoliday[]> {
  const locationInfo = parseWorkplaceLocation(workplaceLocation);
  
  if (!locationInfo) {
    console.warn('Não foi possível extrair informação de localização:', workplaceLocation);
    return [];
  }

  console.log('Informação de localização extraída para feriados regionais:', locationInfo);

  const holidays: AutoHoliday[] = [];

  // Feriados regionais específicos
  switch (locationInfo.region) {
    case 'Madeira':
      holidays.push(
        { name: 'Dia da Região Autónoma da Madeira', date: `${year}-07-01`, type: 'regional', region: 'Madeira' },
        { name: 'Assunção de Nossa Senhora (Madeira)', date: `${year}-08-15`, type: 'regional', region: 'Madeira' }
      );
      break;
    
    case 'Açores':
      holidays.push(
        { name: 'Dia da Região Autónoma dos Açores', date: `${year}-05-20`, type: 'regional', region: 'Açores' },
        { name: 'Espírito Santo', date: `${year}-06-09`, type: 'regional', region: 'Açores' }
      );
      break;
  }

  // Feriados municipais específicos
  const municipalityLower = locationInfo.municipality.toLowerCase();
  
  if (municipalityLower.includes('lisboa')) {
    holidays.push({
      name: 'Santo António (Lisboa)',
      date: `${year}-06-13`,
      type: 'municipal',
      municipality: 'Lisboa',
      description: 'Feriado municipal de Lisboa'
    });
  }
  
  if (municipalityLower.includes('porto')) {
    holidays.push({
      name: 'São João (Porto)',
      date: `${year}-06-24`,
      type: 'municipal',
      municipality: 'Porto',
      description: 'Feriado municipal do Porto'
    });
  }

  if (municipalityLower.includes('braga')) {
    holidays.push({
      name: 'São João Baptista (Braga)',
      date: `${year}-06-24`,
      type: 'municipal',
      municipality: 'Braga',
      description: 'Feriado municipal de Braga'
    });
  }

  // Buscar feriados de API externa para esta localização
  const apiHolidays = await fetchHolidaysFromAPI(year, locationInfo);
  holidays.push(...apiHolidays);

  // Remover duplicados
  const uniqueHolidays = holidays.filter((holiday, index, self) => 
    index === self.findIndex(h => h.date === holiday.date && h.name === holiday.name)
  );

  return uniqueHolidays.sort((a, b) => a.date.localeCompare(b.date));
}

// Função principal para obter todos os feriados automáticos (mantida para compatibilidade)
export async function getAutoHolidays(year: number, workplaceLocation: string): Promise<AutoHoliday[]> {
  const nationalHolidays = await getNationalHolidays(year);
  const regionalHolidays = await getRegionalHolidays(year, workplaceLocation);

  // Combinar e remover duplicados
  const allHolidays = [...nationalHolidays, ...regionalHolidays];
  const uniqueHolidays = allHolidays.filter((holiday, index, self) => 
    index === self.findIndex(h => h.date === holiday.date && h.name === holiday.name)
  );

  return uniqueHolidays.sort((a, b) => a.date.localeCompare(b.date));
}

// Função para sincronizar apenas feriados nacionais
export async function syncNationalHolidays(
  userId: string,
  contractId: string,
  year: number
): Promise<{ created: number; updated: number; errors: string[] }> {
  const errors: string[] = [];
  let created = 0;
  let updated = 0;

  try {
    console.log(`Iniciando sincronização de feriados nacionais para ${year}`);
    
    // Obter feriados nacionais
    const nationalHolidays = await getNationalHolidays(year);
    
    if (nationalHolidays.length === 0) {
      return { created: 0, updated: 0, errors: ['Nenhum feriado nacional encontrado'] };
    }

    // Obter feriados existentes
    const existingHolidays = await payrollService.getHolidays(userId, year, contractId);
    
    for (const autoHoliday of nationalHolidays) {
      try {
        // Verificar se o feriado já existe
        const existingHoliday = existingHolidays.find(h => 
          h.date === autoHoliday.date && h.name === autoHoliday.name
        );

        const holidayData: PayrollHolidayFormData = {
          name: autoHoliday.name,
          date: autoHoliday.date,
          holiday_type: autoHoliday.type,
          is_paid: true, // Feriados automáticos são pagos por defeito
          affects_overtime: true,
          description: autoHoliday.description || `Feriado nacional`,
          contract_id: contractId
        };

        if (existingHoliday) {
          // Atualizar feriado existente se necessário
          if (existingHoliday.holiday_type !== autoHoliday.type || 
              existingHoliday.description !== holidayData.description) {
            await payrollService.updateHoliday(existingHoliday.id, holidayData, userId, contractId);
            updated++;
          }
        } else {
          // Criar novo feriado
          await payrollService.createHoliday(userId, holidayData, contractId);
          created++;
        }
      } catch (error) {
        errors.push(`Erro ao processar feriado nacional ${autoHoliday.name}: ${error}`);
      }
    }

    console.log(`Sincronização de feriados nacionais concluída para ${year}`);
    return { created, updated, errors };
  } catch (error) {
    errors.push(`Erro geral na sincronização de feriados nacionais: ${error}`);
    return { created, updated, errors };
  }
}

// Função para sincronizar feriados regionais e municipais
export async function syncRegionalHolidays(
  userId: string,
  contractId: string,
  year: number,
  workplaceLocation: string
): Promise<{ created: number; updated: number; errors: string[] }> {
  const errors: string[] = [];
  let created = 0;
  let updated = 0;

  try {
    console.log(`Iniciando sincronização de feriados regionais para ${year} em ${workplaceLocation}`);
    
    // Obter feriados regionais
    const regionalHolidays = await getRegionalHolidays(year, workplaceLocation);
    
    if (regionalHolidays.length === 0) {
      console.log('Nenhum feriado regional/municipal encontrado para esta localização');
      return { created: 0, updated: 0, errors: [] };
    }

    // Obter feriados existentes
    const existingHolidays = await payrollService.getHolidays(userId, year, contractId);
    
    for (const autoHoliday of regionalHolidays) {
      try {
        // Verificar se o feriado já existe
        const existingHoliday = existingHolidays.find(h => 
          h.date === autoHoliday.date && h.name === autoHoliday.name
        );

        const holidayData: PayrollHolidayFormData = {
          name: autoHoliday.name,
          date: autoHoliday.date,
          holiday_type: autoHoliday.type,
          is_paid: true, // Feriados automáticos são pagos por defeito
          affects_overtime: true,
          description: autoHoliday.description || `Feriado ${autoHoliday.type}`
        };

        if (existingHoliday) {
          // Atualizar feriado existente se necessário
          if (existingHoliday.holiday_type !== autoHoliday.type || 
              existingHoliday.description !== holidayData.description) {
            await payrollService.updateHoliday(existingHoliday.id, holidayData, userId, contractId);
            updated++;
          }
        } else {
          // Criar novo feriado
          await payrollService.createHoliday(userId, holidayData, contractId);
          created++;
        }
      } catch (error) {
        errors.push(`Erro ao processar feriado regional/municipal ${autoHoliday.name}: ${error}`);
      }
    }

    console.log(`Sincronização de feriados regionais/municipais concluída para ${year}`);
    return { created, updated, errors };
  } catch (error) {
    errors.push(`Erro geral na sincronização de feriados regionais/municipais: ${error}`);
    return { created, updated, errors };
  }
}

// Função para sincronizar feriados automáticos com a base de dados (mantida para compatibilidade)
export async function syncAutoHolidays(
  userId: string,
  contractId: string,
  year: number,
  workplaceLocation: string
): Promise<{ created: number; updated: number; errors: string[] }> {
  const errors: string[] = [];
  let totalCreated = 0;
  let totalUpdated = 0;

  try {
    console.log(`Iniciando sincronização completa de feriados para ${year} em ${workplaceLocation}`);
    
    // Sincronizar feriados nacionais primeiro
    const nationalResult = await syncNationalHolidays(userId, contractId, year);
    totalCreated += nationalResult.created;
    totalUpdated += nationalResult.updated;
    errors.push(...nationalResult.errors);
    
    // Depois sincronizar feriados regionais/municipais
    const regionalResult = await syncRegionalHolidays(userId, contractId, year, workplaceLocation);
    totalCreated += regionalResult.created;
    totalUpdated += regionalResult.updated;
    errors.push(...regionalResult.errors);

    console.log(`Sincronização completa concluída para ${year}`);
    return { created: totalCreated, updated: totalUpdated, errors };
  } catch (error) {
    errors.push(`Erro geral na sincronização completa: ${error}`);
    return { created: totalCreated, updated: totalUpdated, errors };
  }
}

// Função para validar se uma localização é suportada
export function isLocationSupported(workplaceLocation: string): boolean {
  const locationInfo = parseWorkplaceLocation(workplaceLocation);
  return locationInfo !== null && locationInfo.country === 'Portugal';
}

// Função para obter informações sobre feriados disponíveis para uma localização
export function getLocationHolidayInfo(workplaceLocation: string): {
  supported: boolean;
  locationInfo: LocationInfo | null;
  availableHolidayTypes: string[];
} {
  const locationInfo = parseWorkplaceLocation(workplaceLocation);
  const supported = isLocationSupported(workplaceLocation);
  
  let availableHolidayTypes = ['national'];
  
  if (locationInfo) {
    if (locationInfo.region === 'Madeira' || locationInfo.region === 'Açores') {
      availableHolidayTypes.push('regional');
    }
    
    const municipalityLower = locationInfo.municipality.toLowerCase();
    if (municipalityLower.includes('lisboa') || 
        municipalityLower.includes('porto') || 
        municipalityLower.includes('braga')) {
      availableHolidayTypes.push('municipal');
    }
  }
  
  return {
    supported,
    locationInfo,
    availableHolidayTypes
  };
}

/**
 * Sincroniza automaticamente os feriados para um ano específico
 * Esta função deve ser chamada anualmente ou quando necessário
 */
export async function syncAnnualHolidays(
  userId: string,
  contractId: string, 
  workplaceLocation: string, 
  year: number = new Date().getFullYear()
): Promise<{ created: number; updated: number; errors: string[] }> {
  try {
    console.log(`🔄 Sincronizando feriados automáticos para ${year} - Localização: ${workplaceLocation}`);
    
    // Usar a função existente de sincronização
    const result = await syncAutoHolidays(userId, contractId, year, workplaceLocation);
    
    console.log(`✅ Sincronização concluída: ${result.created} novos feriados criados, ${result.updated} atualizados para ${year}`);
    return result;
  } catch (error) {
    console.error('❌ Erro na sincronização automática de feriados:', error);
    throw error;
  }
}

/**
 * Agenda a sincronização automática para ser executada anualmente
 * Esta função pode ser chamada no início da aplicação
 */
export function scheduleAnnualSync(
  userId: string,
  contractId: string, 
  workplaceLocation: string
): void {
  // Verificar se já passou do início do ano e sincronizar se necessário
  const now = new Date();
  const currentYear = now.getFullYear();
  
  // Sincronizar imediatamente para o ano atual se ainda não foi feito
  syncAnnualHolidays(userId, contractId, workplaceLocation, currentYear).catch(error => {
    console.error('Erro na sincronização inicial:', error);
  });
  
  // Agendar para o próximo ano (simplificado - em produção usar um scheduler mais robusto)
  const nextYear = new Date(currentYear + 1, 0, 1); // 1 de Janeiro do próximo ano
  const timeUntilNextYear = nextYear.getTime() - now.getTime();
  
  if (timeUntilNextYear > 0) {
    setTimeout(() => {
      syncAnnualHolidays(userId, contractId, workplaceLocation, currentYear + 1).catch(error => {
        console.error('Erro na sincronização agendada:', error);
      });
    }, timeUntilNextYear);
  }
}

export const holidayAutoService = {
  parseWorkplaceLocation,
  getLocalHolidays,
  fetchHolidaysFromAPI,
  getAutoHolidays,
  syncAutoHolidays,
  isLocationSupported,
  getLocationHolidayInfo,
  syncAnnualHolidays,
  scheduleAnnualSync
};