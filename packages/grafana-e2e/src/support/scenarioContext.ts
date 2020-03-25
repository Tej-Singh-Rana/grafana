import { e2e } from '../index';

export interface ScenarioContext {
  lastAddedDashboard: string;
  lastAddedDashboardUid: string;
  lastAddedDataSource: string;
  [key: string]: any;
}

const scenarioContext: ScenarioContext = {
  lastAddedDashboard: '',
  lastAddedDashboardUid: '',
  lastAddedDataSource: '',
};

export const getScenarioContext = (): Cypress.Chainable => e2e()
  .wrap({
    getScenarioContext: () => ({ ...scenarioContext }) as ScenarioContext,
  })
  .invoke('getScenarioContext');

export const setScenarioContext = (newContext: Partial<ScenarioContext>): Cypress.Chainable => e2e()
  .wrap({
    setScenarioContext: () => {
      Object.entries(newContext).forEach(([key, value]) => {
        scenarioContext[key] = value;
      });
    },
  })
  .invoke('setScenarioContext');
