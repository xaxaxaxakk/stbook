(() => {
  const scope = 'https://www.googleapis.com/auth/drive.appdata';
  const params = new URLSearchParams(location.hash.slice(1));
  history.replaceState(null, '', location.pathname + location.search);
  if ('serviceWorker' in navigator) void navigator.serviceWorker.getRegistration().then(registration => registration?.update()).catch(() => undefined);
  const state = params.get('state') || '';
  const port = params.get('port') || '';
  const expectedClient = params.get('client_id') || '';
  const email = params.get('email') || '';
  const status = document.getElementById('status');
  const connect = document.getElementById('connect');
  const cancel = document.getElementById('cancel');
  let finished = false;
  let client;
  let deadline;

  function finish(fields) {
    if (finished) return;
    finished = true;
    clearTimeout(deadline);
    connect.disabled = true;
    cancel.disabled = true;
    status.textContent = '앱으로 돌아가는 중…';
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = `http://127.0.0.1:${port}/drive/callback`;
    form.acceptCharset = 'UTF-8';
    for (const [name, value] of Object.entries({ ...fields, state })) {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.value = String(value);
      form.append(input);
    }
    document.body.append(form);
    form.submit();
  }

  if (!/^[a-f0-9]{64}$/.test(state) || !/^\d{1,5}$/.test(port) || Number(port) < 1024 || Number(port) > 65535
    || !/^[\w-]+\.apps\.googleusercontent\.com$/.test(expectedClient)) {
    status.textContent = '실리북스 앱의 Google Drive 연결 버튼에서 다시 열어 주세요.';
    return;
  }
  cancel.hidden = false;
  cancel.onclick = () => finish({ error: 'access_denied' });
  deadline = setTimeout(() => finish({ error: 'timeout' }), 170000);

  async function prepare() {
    const response = await fetch('./drive-config.json', { cache: 'no-store', signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw Error('웹 로그인 설정을 읽지 못했어요. 앱에서 다시 연결해 주세요.');
    const config = await response.json();
    if (config.clientId !== expectedClient) throw Error('앱과 웹의 Google 연결 설정이 달라요. 최신 앱으로 다시 연결해 주세요.');
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      const timeout = setTimeout(() => { script.remove(); reject(Error('Google 로그인 준비 시간이 초과됐어요.')); }, 15000);
      script.src = 'https://accounts.google.com/gsi/client';
      script.onload = () => { clearTimeout(timeout); resolve(); };
      script.onerror = () => { clearTimeout(timeout); reject(Error('Google 로그인 페이지를 불러오지 못했어요.')); };
      document.head.append(script);
    });
    if (finished) return;
    client = window.google.accounts.oauth2.initTokenClient({
      client_id: config.clientId,
      scope,
      include_granted_scopes: false,
      callback(result) {
        if (result.error) return finish({ error: result.error });
        if (!result.access_token || !result.scope?.split(' ').includes(scope)) return finish({ error: 'missing_scope' });
        finish({ access_token: result.access_token, expires_in: result.expires_in, scope: result.scope, token_type: result.token_type });
      },
      error_callback(error) {
        if (error.type === 'popup_closed') return finish({ error: 'access_denied' });
        status.textContent = '로그인 창을 열지 못했어요. 팝업을 허용한 뒤 다시 눌러 주세요.';
        connect.disabled = false;
      },
    });
    connect.onclick = () => {
      connect.disabled = true;
      status.textContent = 'Google 로그인 창에서 계정을 선택해 주세요.';
      try { client.requestAccessToken({ prompt: email ? '' : 'select_account', ...(email ? { hint: email } : {}) }); }
      catch { status.textContent = '로그인 창을 열지 못했어요. 다시 눌러 주세요.'; connect.disabled = false; }
    };
    status.textContent = '아래 버튼을 눌러 Google 계정을 선택해 주세요.';
    connect.disabled = false;
  }
  void prepare().catch(error => {
    if (finished) return;
    status.textContent = error instanceof Error ? error.message : '로그인을 준비하지 못했어요.';
  });
})();
