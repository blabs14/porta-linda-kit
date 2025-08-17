describe('Recorrentes - Smoke', () => {
  const email = 'teste2@teste';
  const password = 'teste14';

  function login() {
    cy.visit('/login');
    cy.get('input#email').type(email);
    cy.get('input#password').type(password);
    cy.contains('button', 'Entrar').click();
    cy.url().should('include', '/app');
  }

  it('abre página e mostra lista', () => {
    login();
    cy.visit('/personal');
    cy.visit('/personal/recorrentes');
    cy.contains('Recorrentes');
  });

  it('mostra dialog e previsualização', () => {
    login();
    cy.visit('/personal');
    cy.visit('/personal/recorrentes');
    cy.contains('Nova Regra').click();
    cy.get('input[placeholder="Descrição/Vendor"]').type('Teste Netflix');
    cy.get('input[placeholder="Valor (cêntimos)"]').clear().type('999');
    cy.get('input[type="date"]').first().should('exist');
    cy.contains('Próximos 3 lançamentos');
    cy.contains('Cancelar').click();
  });
}); 