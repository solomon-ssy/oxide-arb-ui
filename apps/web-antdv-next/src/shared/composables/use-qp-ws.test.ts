import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  accessStore: { accessToken: 'access-token' as null | string },
  clearActionEligibility: vi.fn(),
  dispatchWsEnvelope: vi.fn(),
  feedbackStore: {
    adoptAuthoritativeRevision: vi.fn(),
    cursorInitialized: true,
    recoveryRequired: false,
    revision: 17,
  },
  getFeedbackRevisionApi: vi.fn(),
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
  WS_CHANNELS: {
    marketBookUpdate: 'market.book_update',
    researchFeedback: 'research.feedback',
  },
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
  getFeedbackRevisionApi: mocks.getFeedbackRevisionApi,
  issueWsTicketApi: mocks.issueWsTicketApi,
}));
vi.mock('#/locales', () => ({
  $t: (key: string) => key,
}));
vi.mock('#/shared/composables/use-qp-access', () => ({
  useQpAccess: () => ({ hasAccessByCodes: () => true }),
}));
vi.mock('#/store', () => ({
  useFeedbackStore: () => mocks.feedbackStore,
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
  authorizedGlobalChannels: () => [
    'materialization.run_update',
    'research.feedback',
  ],
}));
vi.mock('./ws/ws-dispatch', () => ({
  dispatchWsEnvelope: mocks.dispatchWsEnvelope,
}));
vi.mock('./ws/ws-url', () => ({
  buildWsTicketProtocol: (ticket: string) => `qp-ticket.${ticket}`,
  buildWsUrl: () => 'ws://localhost:8088/api/ws',
}));

interface SentCommand {
  action: string;
  after_revision?: number;
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

  message(data: string) {
    this.emit('message', new MessageEvent('message', { data }));
  }

  open() {
    this.readyState = TestWebSocket.OPEN;
    this.emit('open');
  }

  send(payload: string) {
    this.sent.push(payload);
  }

  private emit(type: string, event: Event = new Event(type)) {
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
    mocks.dispatchWsEnvelope.mockReset();
    mocks.feedbackStore.adoptAuthoritativeRevision.mockReset();
    mocks.feedbackStore.adoptAuthoritativeRevision.mockImplementation(
      (revision: number) => {
        mocks.feedbackStore.cursorInitialized = true;
        mocks.feedbackStore.recoveryRequired = false;
        mocks.feedbackStore.revision = revision;
        return true;
      },
    );
    mocks.feedbackStore.recoveryRequired = false;
    mocks.feedbackStore.cursorInitialized = true;
    mocks.feedbackStore.revision = 17;
    mocks.getFeedbackRevisionApi.mockReset();
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

  it('distinguishes the initial handshake from a failed reconnect', async () => {
    vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(true);
    mocks.feedbackStore.cursorInitialized = false;
    mocks.getFeedbackRevisionApi.mockResolvedValue({ revision: 17 });
    mocks.issueWsTicketApi.mockResolvedValue({ ticket: 'ticket-1' });

    const { useQpWs } = await import('./use-qp-ws');
    const qpWs = useQpWs();
    qpWs.connect();
    expect(qpWs.status.value).toBe('connecting');
    expect(mocks.setStatus).toHaveBeenLastCalledWith('connecting');

    await vi.waitFor(() => expect(TestWebSocket.instances).toHaveLength(1));
    expect(mocks.getFeedbackRevisionApi).toHaveBeenCalledOnce();
    expect(mocks.feedbackStore.adoptAuthoritativeRevision).toHaveBeenCalledWith(
      17,
    );
    const first = TestWebSocket.instances[0];
    if (first === undefined) {
      throw new Error('initial WebSocket was not created');
    }
    first.close();
    expect(qpWs.status.value).toBe('reconnecting');
    expect(mocks.setStatus).toHaveBeenLastCalledWith('reconnecting');
    qpWs.disconnect();
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
      {
        action: 'subscribe',
        after_revision: 17,
        channel: 'research.feedback',
      },
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
      {
        action: 'subscribe',
        after_revision: 17,
        channel: 'research.feedback',
      },
      { action: 'sync' },
    ]);
    expect(qpWs.status.value).toBe('connected');
    qpWs.disconnect();
  });

  it('refreshes an invalid feedback cursor before reconnecting', async () => {
    vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(true);
    mocks.feedbackStore.revision = 3;
    mocks.getFeedbackRevisionApi.mockResolvedValue({ revision: 42 });
    mocks.issueWsTicketApi
      .mockResolvedValueOnce({ ticket: 'ticket-1' })
      .mockResolvedValueOnce({ ticket: 'ticket-2' });
    mocks.dispatchWsEnvelope.mockImplementation((_envelope, hooks) => {
      mocks.feedbackStore.recoveryRequired = true;
      hooks.onFeedbackRecoveryRequired('invalid_feedback_event');
    });

    const { useQpWs } = await import('./use-qp-ws');
    const qpWs = useQpWs();
    qpWs.connect();
    await vi.waitFor(() => expect(TestWebSocket.instances).toHaveLength(1));

    const first = TestWebSocket.instances[0];
    if (first === undefined) {
      throw new Error('first WebSocket was not created');
    }
    first.open();
    first.message(
      JSON.stringify({
        data: {},
        timestamp: '2026-07-29T01:00:00.000Z',
        type: 'research.feedback',
      }),
    );

    await vi.waitFor(() => expect(TestWebSocket.instances).toHaveLength(2));
    expect(first.readyState).toBe(TestWebSocket.CLOSED);
    expect(mocks.getFeedbackRevisionApi).toHaveBeenCalledOnce();
    expect(mocks.feedbackStore.adoptAuthoritativeRevision).toHaveBeenCalledWith(
      42,
    );

    const second = TestWebSocket.instances[1];
    if (second === undefined) {
      throw new Error('replacement WebSocket was not created');
    }
    second.open();
    expect(commands(second)).toEqual([
      { action: 'subscribe', channel: 'materialization.run_update' },
      {
        action: 'subscribe',
        after_revision: 42,
        channel: 'research.feedback',
      },
      { action: 'sync' },
    ]);
    qpWs.disconnect();
  });
});
