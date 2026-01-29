import { render } from 'ink';
import React from 'react';
import { SetupWizard } from '../ui/SetupWizard.js';

export async function runSetupWizard(): Promise<void> {
  return new Promise((resolve) => {
    const { unmount } = render(
      React.createElement(SetupWizard, {
        onComplete: () => {
          unmount();
          resolve();
        },
      })
    );
  });
}
