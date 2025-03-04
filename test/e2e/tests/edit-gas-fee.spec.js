const { strict: assert } = require('assert');
const {
  convertToHexValue,
  connectDappWithExtensionPopup,
  getWindowHandles,
  largeDelayMs,
  withFixtures,
  regularDelayMs,
} = require('../helpers');

describe('Editing Confirm Transaction', function () {
  it('allows selecting high, medium, low gas estimates on edit gas fee popover', async function () {
    const ganacheOptions = {
      hardfork: 'london',
      accounts: [
        {
          secretKey:
            '0x7C9529A67102755B7E6102D6D950AC5D5863C98713805CEC576B945B15B71EAC',
          balance: convertToHexValue(25000000000000000000),
        },
      ],
    };
    await withFixtures(
      {
        fixtures: 'eip-1559-v2',
        ganacheOptions,
        title: this.test.title,
      },
      async ({ driver }) => {
        await driver.navigate();

        await driver.fill('#password', 'correct horse battery staple');
        await driver.press('#password', driver.Key.ENTER);

        const transactionAmounts = await driver.findElements(
          '.currency-display-component__text',
        );
        const transactionAmount = transactionAmounts[0];
        assert.equal(await transactionAmount.getText(), '2.2');

        // update estimates to high
        await driver.clickElement('[data-testid="edit-gas-fee-button"]');
        await driver.delay(regularDelayMs);
        await driver.clickElement('[data-testid="edit-gas-fee-item-high"]');
        await driver.delay(regularDelayMs);
        await driver.waitForSelector({ text: '🦍' });
        await driver.waitForSelector({
          text: 'Aggressive',
        });

        // update estimates to medium
        await driver.clickElement('[data-testid="edit-gas-fee-button"]');
        await driver.delay(regularDelayMs);
        await driver.clickElement('[data-testid="edit-gas-fee-item-medium"]');
        await driver.delay(regularDelayMs);
        await driver.waitForSelector({ text: '🦊' });
        await driver.waitForSelector({
          text: 'Market',
        });

        // update estimates to low
        await driver.clickElement('[data-testid="edit-gas-fee-button"]');
        await driver.delay(regularDelayMs);
        await driver.clickElement('[data-testid="edit-gas-fee-item-low"]');
        await driver.delay(regularDelayMs);
        await driver.waitForSelector({ text: '🐢' });
        await driver.waitForSelector({
          text: 'Low',
        });
        await driver.waitForSelector('[data-testid="low-gas-fee-alert"]');

        // confirms the transaction
        await driver.clickElement({ text: 'Confirm', tag: 'button' });
        await driver.delay(regularDelayMs);

        await driver.clickElement('[data-testid="home__activity-tab"]');
        await driver.wait(async () => {
          const confirmedTxes = await driver.findElements(
            '.transaction-list__completed-transactions .transaction-list-item',
          );
          return confirmedTxes.length === 1;
        }, 10000);

        const txValues = await driver.findElements(
          '.transaction-list-item__primary-currency',
        );
        assert.equal(txValues.length, 1);
        assert.ok(/-2.2\s*ETH/u.test(await txValues[0].getText()));
      },
    );
  });

  it('allows accessing advance gas fee popover from edit gas fee popover', async function () {
    const ganacheOptions = {
      hardfork: 'london',
      accounts: [
        {
          secretKey:
            '0x7C9529A67102755B7E6102D6D950AC5D5863C98713805CEC576B945B15B71EAC',
          balance: convertToHexValue(25000000000000000000),
        },
      ],
    };
    await withFixtures(
      {
        fixtures: 'eip-1559-v2',
        ganacheOptions,
        title: this.test.title,
      },
      async ({ driver }) => {
        await driver.navigate();

        await driver.fill('#password', 'correct horse battery staple');
        await driver.press('#password', driver.Key.ENTER);

        const transactionAmounts = await driver.findElements(
          '.currency-display-component__text',
        );
        const transactionAmount = transactionAmounts[0];
        assert.equal(await transactionAmount.getText(), '2.2');

        // update estimates to high
        await driver.clickElement('[data-testid="edit-gas-fee-button"]');
        await driver.delay(regularDelayMs);
        await driver.clickElement('[data-testid="edit-gas-fee-item-custom"]');
        await driver.delay(regularDelayMs);

        // enter max fee
        const maxBaseFee = await driver.findElement(
          '[data-testid="base-fee-input"]',
        );
        await maxBaseFee.clear();
        await maxBaseFee.sendKeys('8');
        await driver.delay(regularDelayMs);

        // enter priority fee
        const priorityFee = await driver.findElement(
          '[data-testid="priority-fee-input"]',
        );
        await priorityFee.clear();
        await priorityFee.sendKeys('8');
        await driver.delay(regularDelayMs);

        // save default values
        await driver.clickElement('input[type="checkbox"]');
        await driver.delay(regularDelayMs);

        // edit gas limit
        await driver.clickElement('[data-testid="advanced-gas-fee-edit"]');
        await driver.delay(regularDelayMs);
        const gasLimit = await driver.findElement(
          '[data-testid="gas-limit-input"]',
        );
        await gasLimit.clear();
        await gasLimit.sendKeys('100000');
        await driver.delay(regularDelayMs);

        // Submit gas fee changes
        await driver.clickElement({ text: 'Save', tag: 'button' });

        // has correct updated value on the confirm screen the transaction
        const editedTransactionAmounts = await driver.findElements(
          '.transaction-detail-item__row .transaction-detail-item__detail-values .currency-display-component__text:last-of-type',
        );
        const editedTransactionAmount = editedTransactionAmounts[0];
        assert.equal(await editedTransactionAmount.getText(), '0.0008');

        const editedTransactionFee = editedTransactionAmounts[1];
        assert.equal(await editedTransactionFee.getText(), '2.2008');

        // confirms the transaction
        await driver.clickElement({ text: 'Confirm', tag: 'button' });
        await driver.delay(regularDelayMs);

        await driver.clickElement('[data-testid="home__activity-tab"]');
        await driver.wait(async () => {
          const confirmedTxes = await driver.findElements(
            '.transaction-list__completed-transactions .transaction-list-item',
          );
          return confirmedTxes.length === 1;
        }, 10000);

        const txValues = await driver.findElements(
          '.transaction-list-item__primary-currency',
        );
        assert.equal(txValues.length, 1);
        assert.ok(/-2.2\s*ETH/u.test(await txValues[0].getText()));
      },
    );
  });

  it('should use dapp suggested estimates for transaction coming from dapp', async function () {
    const ganacheOptions = {
      hardfork: 'london',
      accounts: [
        {
          secretKey:
            '0x7C9529A67102755B7E6102D6D950AC5D5863C98713805CEC576B945B15B71EAC',
          balance: convertToHexValue(25000000000000000000),
        },
      ],
    };
    await withFixtures(
      {
        fixtures: 'eip-1559-v2-dapp',
        ganacheOptions,
        title: this.test.title,
        dapp: true,
      },
      async ({ driver }) => {
        await driver.navigate();

        // login to extension
        await driver.fill('#password', 'correct horse battery staple');
        await driver.press('#password', driver.Key.ENTER);

        // open dapp and connect
        await connectDappWithExtensionPopup(driver);
        await driver.clickElement({ text: 'Send', tag: 'button' });

        // check transaction in extension popup
        const windowHandles = await getWindowHandles(driver, 3);
        await driver.switchToWindow(windowHandles.popup);
        await driver.delay(largeDelayMs);
        await driver.waitForSelector({ text: '🌐' });
        await driver.waitForSelector({
          text: 'Site suggested',
        });

        await driver.clickElement('[data-testid="edit-gas-fee-button"]');
        await driver.delay(regularDelayMs);
        await driver.clickElement(
          '[data-testid="edit-gas-fee-item-dappSuggested"]',
        );
        await driver.delay(regularDelayMs);

        const transactionAmounts = await driver.findElements(
          '.currency-display-component__text',
        );
        const transactionAmount = transactionAmounts[0];
        assert.equal(await transactionAmount.getText(), '3');

        // has correct updated value on the confirm screen the transaction
        const editedTransactionAmounts = await driver.findElements(
          '.transaction-detail-item__row .transaction-detail-item__detail-values .currency-display-component__text:last-of-type',
        );
        const editedTransactionAmount = editedTransactionAmounts[0];
        assert.equal(await editedTransactionAmount.getText(), '0.00042');

        const editedTransactionFee = editedTransactionAmounts[1];
        assert.equal(await editedTransactionFee.getText(), '3.00042');

        // confirms the transaction
        await driver.clickElement({ text: 'Confirm', tag: 'button' });
        await driver.delay(regularDelayMs);

        // transaction should correct values in activity tab
        await driver.switchToWindow(windowHandles.extension);
        await driver.clickElement('[data-testid="home__activity-tab"]');
        await driver.wait(async () => {
          const confirmedTxes = await driver.findElements(
            '.transaction-list__completed-transactions .transaction-list-item',
          );
          return confirmedTxes.length === 1;
        }, 10000);

        const txValues = await driver.findElements(
          '.transaction-list-item__primary-currency',
        );
        assert.equal(txValues.length, 1);
        assert.ok(/-3\s*ETH/u.test(await txValues[0].getText()));
      },
    );
  });
});
