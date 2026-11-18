import type { TestInstance } from 'test-renderer';

export function findAllByType(root: TestInstance, type: string): TestInstance[] {
  return root.queryAll((instance) => instance.type === type, { includeSelf: true });
}

export function findByType(root: TestInstance, type: string): TestInstance {
  const instance = findAllByType(root, type)[0];
  if (!instance) {
    throw new Error(`Unable to find rendered element with type "${type}".`);
  }
  return instance;
}

export function findByProps(root: TestInstance, props: Record<string, unknown>): TestInstance {
  const instance = root.queryAll(
    (node) => Object.entries(props).every(([key, value]) => node.props[key] === value),
    { includeSelf: true },
  )[0];
  if (!instance) {
    throw new Error(`Unable to find rendered element with props ${JSON.stringify(props)}.`);
  }
  return instance;
}
