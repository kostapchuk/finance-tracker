import { test, expect } from '../fixtures/test-base';
import { LoanForm } from '../page-objects/components/loan-form';
import { testAccounts } from '../fixtures/test-data';

test.describe('Editing a loan from History', () => {
  test.beforeEach(async ({ setupCleanState }) => {
    await setupCleanState();
  });

  test('updates the loan amount and stores the main-currency conversion when neither the loan nor account is in the main currency', async ({
    page,
    historyPage,
    loansPage,
    dbHelper,
  }) => {
    // Main currency is USD. Loan and account are both EUR, so the form must
    // show the manual main-currency conversion field even though the loan
    // and account share a currency (not the dual-input multi-currency case).
    const accountId = await dbHelper.seedAccount(testAccounts.eurBank());
    const loanId = await dbHelper.seedLoan({
      type: 'given',
      personName: 'History Edit Test',
      description: '',
      amount: 500,
      currency: 'EUR',
      paidAmount: 0,
      status: 'active',
      accountId,
    });
    const transactionId = await dbHelper.seedTransaction({
      type: 'loan_given',
      amount: 500,
      currency: 'EUR',
      accountId,
      loanId,
      comment: 'History Edit Test loan',
    });
    await dbHelper.refreshStoreData();
    await page.reload();

    const loanForm = new LoanForm(page);

    await historyPage.navigateTo('history');
    await historyPage.clickTransactionByComment('History Edit Test loan');

    // Update the loan's principal amount and fill the required main-currency
    // conversion (previously silently discarded by the History edit path).
    await loanForm.fillAmount('600');
    await loanForm.fillMainCurrencyAmount('660');
    await loanForm.save();

    // The debt itself must update.
    const loanStatus = await dbHelper.getLoanStatus(loanId);
    expect(loanStatus?.paidAmount).toBe(0);
    await loansPage.navigateTo('loans');
    await expect(loansPage.getLoanByPersonName('History Edit Test')).toBeVisible();

    // The entered main-currency amount must actually be persisted, not
    // discarded (previously always saved as undefined for non-main loans).
    const transaction = await dbHelper.getTransaction(transactionId);
    expect(transaction?.mainCurrencyAmount).toBe(660);
    expect(transaction?.amount).toBe(600);
  });
});
