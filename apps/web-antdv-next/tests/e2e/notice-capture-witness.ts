import type { Page } from 'playwright/test';

const WITNESS_KEY = '__quantPivotNoticeCapture';

export interface CapturedNotice {
  error: boolean;
  kind: 'message' | 'notification' | 'unknown';
  message: string;
  title: string;
}

export interface NoticeCaptureWitness {
  initial_notice_count: number;
  mutation_count: number;
  notices: CapturedNotice[];
  overflow: boolean;
}

interface CaptureState {
  dispose: () => void;
  finish: () => NoticeCaptureWitness;
}

export async function beginNoticeWitness(page: Page): Promise<number> {
  return page.evaluate((key) => {
    const storage = window as unknown as Record<
      string,
      CaptureState | undefined
    >;
    if (storage[key])
      throw new Error('A notice capture witness is already active');
    const selector = '.ant-notification-notice, .ant-message-notice';
    const notices = new Map<Element, Map<string, CapturedNotice>>();
    let versionCount = 0;
    let mutationCount = 0;
    let overflow = false;
    const read = (element: Element): CapturedNotice => {
      let kind: CapturedNotice['kind'] = 'unknown';
      if (element.classList.contains('ant-message-notice')) {
        kind = 'message';
      } else if (element.classList.contains('ant-notification-notice')) {
        kind = 'notification';
      }
      const title =
        element
          .querySelector('.ant-notification-notice-title')
          ?.textContent?.trim() ?? '';
      const message =
        kind === 'message'
          ? (element.textContent?.trim() ?? '')
          : (element
              .querySelector('.ant-notification-notice-description')
              ?.textContent?.trim() ?? '');
      if (title.length + message.length > 8192) overflow = true;
      return {
        error:
          element.classList.contains('ant-notification-notice-error') ||
          element.querySelector('.ant-message-error') !== null,
        kind,
        message: message.slice(0, 8192),
        title: title.slice(0, 8192),
      };
    };
    const include = (element: Element) => {
      if (!notices.has(element) && notices.size >= 32) {
        overflow = true;
        return;
      }
      let versions = notices.get(element);
      if (!versions) {
        versions = new Map();
        notices.set(element, versions);
      }
      const value = read(element);
      if (value.title || value.message) {
        const key = JSON.stringify(value);
        if (!versions.has(key)) {
          if (versionCount >= 64) {
            overflow = true;
            return;
          }
          versions.set(key, value);
          versionCount += 1;
        }
      }
    };
    const roots = (node: Node, descend: boolean): Element[] => {
      const element = node instanceof Element ? node : node.parentElement;
      if (!element) return [];
      const result = new Set<Element>();
      const owner = element.closest(selector);
      if (owner) result.add(owner);
      if (notices.has(element)) result.add(element);
      if (descend)
        for (const child of element.querySelectorAll(selector))
          result.add(child);
      return [...result];
    };
    const process = (records: MutationRecord[]) => {
      if (overflow) {
        observer.disconnect();
        return;
      }
      for (const record of records) {
        const changed = new Set(roots(record.target, false));
        for (const node of [...record.addedNodes, ...record.removedNodes]) {
          for (const element of roots(node, true)) changed.add(element);
        }
        if (
          record.type === 'attributes' &&
          record.attributeName === 'class' &&
          /(?:^|\s)ant-(?:notification|message)-notice(?:\s|$)/.test(
            record.oldValue ?? '',
          ) &&
          record.target instanceof Element
        )
          changed.add(record.target);
        if (changed.size > 0) {
          mutationCount += 1;
          for (const element of changed) include(element);
        }
        if (mutationCount > 1000) overflow = true;
        if (overflow) {
          observer.disconnect();
          return;
        }
      }
    };
    const observer = new MutationObserver(process);
    observer.observe(document.documentElement, {
      attributeFilter: ['class', 'style'],
      attributeOldValue: true,
      attributes: true,
      characterData: true,
      childList: true,
      subtree: true,
    });
    const initial = [...document.querySelectorAll(selector)];
    for (const element of initial) {
      include(element);
      if (overflow) break;
    }
    if (overflow) observer.disconnect();
    const dispose = () => {
      observer.disconnect();
      if (!Reflect.deleteProperty(storage, key))
        throw new Error('Notice capture witness cleanup failed');
    };
    storage[key] = {
      dispose,
      finish: () => {
        try {
          process(observer.takeRecords());
          for (const element of notices.keys()) include(element);
          return {
            initial_notice_count: initial.length,
            mutation_count: mutationCount,
            notices: [...notices].flatMap(([element, versions]) =>
              versions.size > 0 ? [...versions.values()] : [read(element)],
            ),
            overflow,
          };
        } finally {
          dispose();
        }
      },
    };
    return initial.length;
  }, WITNESS_KEY);
}

export async function finishNoticeWitness(
  page: Page,
): Promise<NoticeCaptureWitness> {
  return page.evaluate((key) => {
    const state = (
      window as unknown as Record<string, CaptureState | undefined>
    )[key];
    if (!state) throw new Error('The notice capture witness is missing');
    return state.finish();
  }, WITNESS_KEY);
}

export async function disposeNoticeWitness(page: Page): Promise<void> {
  if (page.isClosed()) return;
  await page.evaluate((key) => {
    (window as unknown as Record<string, CaptureState | undefined>)[
      key
    ]?.dispose();
  }, WITNESS_KEY);
}
