import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  accessStore: { accessToken: 'access-token' as null | string },
  clearActionEligibility: vi.fn(),
  issueWsTicketApi: vi.fn(),
  setStatus: vi.fn(),
}));

vi.mock('@vben/hooks', () => ({
  useAppConfig: () => ({ apiURL: 'http://localhost:8088/api' }),
}));
vi.mock('@vben/preferences', () => ({
  preferences: { app: { defaultAvatar: '' } },
}));
vi.mock('@vben/stores', () => ({
  useAccessStore: () => mocks.accessStore,
}));
vi.mock('@vben/types', () => ({
  WS_CHANNELS: { marketBookUpdate: 'market.book_update' },
}));
vi.mock('antdv-next', () => ({
  message: { info: vi.fn() },
  notification: {
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));
vi.mock('#/api', () => ({
  issueWsTicketApi: mocks.issueWsTicketApi,
}));
vi.mock('#/locales', () => ({
  $t: (key: string) => key,
}));
vi.mock('#/shared/composables/use-qp-access', () => ({
  useQpAccess: () => ({ hasAccessByCodes: () => true }),
}));
vi.mock('#/store', () => ({
  useSystemStore: () => ({
    clearActionEligibility: mocks.clearActionEligibility,
  }),
  useWsStore: () => ({
    clearRecentAlert: vi.fn(),
    recordAlert: vi.fn(),
    setStatus: mocks.setStatus,
  }),
}));
vi.mock('./ws/ws-channel-permissions', () => ({
  authorizedGlobalChannels: () => ['materialization.run_update'],
}));
vi.mock('./ws/ws-dispatch', () => ({
  dispatchWsEnvelope: vi.fn(),
}));
vi.mock('./ws/ws-url', () => ({
  buildWsTicketProtocol: (ticket: string) => `qp-ticket.${ticket}`,
  buildWsUrl: () => 'ws://localhost:8088/api/ws',
}));

interface SentCommand {
  action: string;
  channel?: string;
}

class TestWebSocket {
  static readonly CLOSED = 3;
  static readonly CONNECTING = 0;
  static instances: TestWebSocket[] = [];
  static readonly OPEN = 1;

  readyState = TestWebSocket.CONNECTING;
  readonly sent: string[] = [];

  private readonly listeners = new Map<string, Set<(event: Event) => void>>();

  constructor(
    readonly url: string,
    readonly protocols: string[],
  ) {
    TestWebSocket.instances.push(this);
  }

  addEventListener(type: string, listener: EventListenerOrEventListenerObject) {
    const callback =
      typeof listener === 'function'
        ? listener
        : listener.handleEvent.bind(listener);
    const listeners = this.listeners.get(type) ?? new Set();
    listeners.add(callback);
    this.listeners.set(type, listeners);
  }

  close(code?: number) {
    if (code !== undefined && code !== 1000 && (code < 3000 || code > 4999)) {
      throw new DOMException(
        'invalid WebSocket close code',
        'InvalidAccessError',
      );
    }
    if (this.readyState === TestWebSocket.CLOSED) {
      return;
    }
    this.readyState = TestWebSocket.CLOSED;
    this.emit('close');
  }

  open() {
    this.readyState = TestWebSocket.OPEN;
    this.emit('open');
  }

  send(payload: string) {
    this.sent.push(payload);
  }

  private emit(type: string) {
    const event = new Event(type);
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event);
    }
  }
}

function commands(socket: TestWebSocket): SentCommand[] {
  return socket.sent.map((payload) => JSON.parse(payload) as SentCommand);
}

describe('useQpWs network recovery', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    mocks.accessStore.accessToken = 'access-token';
    mocks.clearActionEligibility.mockReset();
    mocks.issueWsTicketApi.mockReset();
    mocks.setStatus.mockReset();
    TestWebSocket.instances = [];
    vi.stubGlobal('WebSocket', TestWebSocket);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('suspends while offline and immediately reconnects with subscriptions when online', async () => {
    let online = true;
    vi.spyOn(window.navigator, 'onLine', 'get').mockImplementation(
      () => online,
    );
    mocks.issueWsTicketApi
      .mockResolvedValueOnce({ ticket: 'ticket-1' })
      .mockResolvedValueOnce({ ticket: 'ticket-2' });

    const { useQpWs } = await import('./use-qp-ws');
    const qpWs = useQpWs();
    qpWs.connect();
    await vi.waitFor(() => expect(TestWebSocket.instances).toHaveLength(1));

    const first = TestWebSocket.instances[0];
    if (first === undefined) {
      throw new Error('first WebSocket was not created');
    }
    first.open();
    expect(commands(first)).toEqual([
      { action: 'subscribe', channel: 'materialization.run_update' },
      { action: 'sync' },
    ]);

    online = false;
    window.dispatchEvent(new Event('offline'));
    expect(first.readyState).toBe(TestWebSocket.CLOSED);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(mocks.issueWsTicketApi).toHaveBeenCalledTimes(1);

    online = true;
    window.dispatchEvent(new Event('online'));
    await vi.waitFor(() => expect(TestWebSocket.instances).toHaveLength(2));

    const second = TestWebSocket.instances[1];
    if (second === undefined) {
      throw new Error('replacement WebSocket was not created');
    }
    second.open();
    expect(commands(second)).toEqual([
      { action: 'subscribe', channel: 'materialization.run_update' },
      { action: 'sync' },
    ]);
    expect(qpWs.status.value).toBe('connected');
    qpWs.disconnect();
  });
});
