import { test as setup } from '@playwright/test';
import { createTree, gql } from './helpers';

// The backend creates no family tree by itself: the tests that work without naming one need one in the test database
setup('the test database has a family tree', async ({ request }) => {
  const { familyTrees } = await gql<{ familyTrees: { id: string }[] }>(request, '{ familyTrees { id } }');
  if (!familyTrees.length) {
    await createTree(request, 'E2E');
  }
});
