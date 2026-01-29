import { getContexts, addContext, removeContext } from '../config.js';
import { t, fmt } from '../i18n/index.js';

export async function listContexts(): Promise<void> {
  const i18n = t();
  const contexts = getContexts();

  if (contexts.length === 0) {
    console.log(i18n.commands.context.noContexts);
    return;
  }

  console.log(i18n.commands.context.list);
  for (const context of contexts) {
    console.log(`  @${context}`);
  }
}

export async function addContextCommand(name: string): Promise<void> {
  const i18n = t();
  const normalized = name.toLowerCase().replace(/^@/, '');

  if (addContext(normalized)) {
    console.log(fmt(i18n.commands.context.added, { context: normalized }));
  } else {
    console.error(fmt(i18n.commands.context.alreadyExists, { context: normalized }));
    process.exit(1);
  }
}

export async function removeContextCommand(name: string): Promise<void> {
  const i18n = t();
  const normalized = name.toLowerCase().replace(/^@/, '');

  if (removeContext(normalized)) {
    console.log(fmt(i18n.commands.context.removed, { context: normalized }));
  } else {
    console.error(fmt(i18n.commands.context.notFound, { context: normalized }));
    process.exit(1);
  }
}
